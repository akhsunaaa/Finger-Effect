// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
    videoWidth: 1280,
    videoHeight: 720,
    maxHands: 2,
    modelComplexity: 1, // 0 = Lite, 1 = Full
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6,
};

// ============================================================
// DOM REFERENCES
// ============================================================
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const fpsDisplay = document.getElementById('fps');
const handsStatus = document.getElementById('hands-status');

let currentFilter = 'none';
let frameCount = 0;
let lastFpsUpdate = performance.now();
let handLandmarks = [];

// ============================================================
// CAMERA SETUP
// ============================================================
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: CONFIG.videoWidth,
                height: CONFIG.videoHeight,
                facingMode: 'user',
            },
        });
        video.srcObject = stream;

        return new Promise((resolve) => {
            video.onloadeddata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                console.log(`✅ Camera ready: ${canvas.width}x${canvas.height}`);
                resolve();
            };
        });
    } catch (error) {
        console.error('❌ Camera error:', error);
        alert('Please allow camera access and refresh the page.');
        throw error;
    }
}

// ============================================================
// MEDIAPIPE HANDS SETUP
// ============================================================
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
    maxNumHands: CONFIG.maxHands,
    modelComplexity: CONFIG.modelComplexity,
    minDetectionConfidence: CONFIG.minDetectionConfidence,
    minTrackingConfidence: CONFIG.minTrackingConfidence,
});

hands.onResults((results) => {
    handLandmarks = results.multiHandLandmarks || [];
    handsStatus.textContent = `Hands: ${handLandmarks.length} detected`;
});

// ============================================================
// CAMERA UTILITY (connects video feed to MediaPipe)
// ============================================================
const camera = new Camera(video, {
    onFrame: async () => {
        await hands.send({ image: video });
        drawFrame();
    },
    width: CONFIG.videoWidth,
    height: CONFIG.videoHeight,
});

// ============================================================
// MAIN DRAW LOOP
// ============================================================
function drawFrame() {
    // --- 1. Draw the raw video (mirrored) ---
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // --- 2. Calculate finger frame from landmarks ---
    const framePoints = calculateFingerFrame(handLandmarks);

    if (framePoints && framePoints.length === 4) {
        // --- 3. Apply filter inside the frame ---
        applyFilterInsideFrame(framePoints);

        // --- 4. Draw the outline + corner dots ---
        drawFrameOutline(framePoints);
    }

    // --- 5. Update FPS counter ---
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate > 1000) {
        fpsDisplay.textContent = `FPS: ${frameCount}`;
        frameCount = 0;
        lastFpsUpdate = now;
    }
}

// ============================================================
// FINGER FRAME CALCULATION
// ============================================================
function calculateFingerFrame(landmarks) {
    if (landmarks.length < 2) return null;

    // Determine which hand is left vs right (based on wrist position)
    const leftHand = landmarks.find((h) => isLeftHand(h));
    const rightHand = landmarks.find((h) => !isLeftHand(h));

    if (!leftHand || !rightHand) return null;

    // Landmark indices: 4 = thumb tip, 8 = index finger tip
    const leftThumb = leftHand[4];
    const leftIndex = leftHand[8];
    const rightThumb = rightHand[4];
    const rightIndex = rightHand[8];

    if (!leftThumb || !leftIndex || !rightThumb || !rightIndex) return null;

    const w = canvas.width;
    const h = canvas.height;

    // Convert normalized coordinates (0-1) to pixel coordinates
    // NOTE: We mirror X-axis (1 - x) to match the mirrored video
    return [
        { x: (1 - leftThumb.x) * w, y: leftThumb.y * h },   // Top-left
        { x: (1 - rightThumb.x) * w, y: rightThumb.y * h }, // Top-right
        { x: (1 - rightIndex.x) * w, y: rightIndex.y * h }, // Bottom-right
        { x: (1 - leftIndex.x) * w, y: leftIndex.y * h },   // Bottom-left
    ];
}

function isLeftHand(landmarks) {
    // Wrist is landmark[0]. If x < 0.5, it's the left hand (in mirrored view)
    return landmarks[0].x < 0.5;
}

// ============================================================
// FILTER APPLICATION (Inside the finger frame)
// ============================================================
function applyFilterInsideFrame(points) {
    if (!points || points.length < 4) return;

    ctx.save();

    // --- 1. Clip to the finger frame quadrilateral ---
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.clip();

    // --- 2. Re-draw the video inside the clipped region ---
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // --- 3. Apply the selected filter to the clipped region ---
    applyFilter(ctx, canvas.width, canvas.height, currentFilter);

    ctx.restore();
}

// ============================================================
// FILTER DEFINITIONS
// ============================================================
function applyFilter(ctx, w, h, filter) {
    // Get pixel data from the canvas
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    switch (filter) {
        case 'grayscale':
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
            }
            break;

        case 'sepia':
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
            }
            break;

        case 'invert':
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];
                data[i + 1] = 255 - data[i + 1];
                data[i + 2] = 255 - data[i + 2];
            }
            break;

        case 'pixelate':
            const blockSize = 8;
            for (let y = 0; y < h; y += blockSize) {
                for (let x = 0; x < w; x += blockSize) {
                    let r = 0,
                        g = 0,
                        b = 0,
                        count = 0;
                    for (let dy = 0; dy < blockSize && y + dy < h; dy++) {
                        for (let dx = 0; dx < blockSize && x + dx < w; dx++) {
                            const idx = ((y + dy) * w + (x + dx)) * 4;
                            r += data[idx];
                            g += data[idx + 1];
                            b += data[idx + 2];
                            count++;
                        }
                    }
                    r /= count;
                    g /= count;
                    b /= count;
                    for (let dy = 0; dy < blockSize && y + dy < h; dy++) {
                        for (let dx = 0; dx < blockSize && x + dx < w; dx++) {
                            const idx = ((y + dy) * w + (x + dx)) * 4;
                            data[idx] = r;
                            data[idx + 1] = g;
                            data[idx + 2] = b;
                        }
                    }
                }
            }
            break;

        case 'glitch':
            // RGB split effect
            const tempData = new Uint8ClampedArray(data);
            const offset = 6;
            for (let i = 0; i < data.length; i += 4) {
                if (i + offset * 4 < data.length && i - offset * 4 >= 0) {
                    data[i] = tempData[i + offset * 4]; // Red channel shifted right
                    data[i + 2] = tempData[i - offset * 4]; // Blue channel shifted left
                }
            }
            break;

        // 'none' filter does nothing
        default:
            break;
    }

    // Put the modified pixels back on the canvas
    ctx.putImageData(imageData, 0, 0);
}

// ============================================================
// DRAW FRAME OUTLINE + CORNER DOTS
// ============================================================
function drawFrameOutline(points) {
    if (!points || points.length < 4) return;

    ctx.save();

    // --- Animated "marching ants" dashed line ---
    const dashOffset = (Date.now() / 50) % 16; // Animate the dashes
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = dashOffset;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // --- Glowing corner dots ---
    points.forEach((p) => {
        // Outer glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 15);
        gradient.addColorStop(0, 'rgba(0, 150, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = '#0096ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(p.x - 1.5, p.y - 1.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

// ============================================================
// FILTER SWITCHING
// ============================================================
document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        console.log(`🎨 Filter changed to: ${currentFilter}`);
    });
});

// ============================================================
// INITIALIZATION
// ============================================================
async function init() {
    try {
        await setupCamera();
        console.log('🚀 Starting camera...');
        await camera.start();
        console.log('✅ All systems ready!');
    } catch (error) {
        console.error('❌ Failed to start:', error);
    }
}

// Start the app when the page loads
init();