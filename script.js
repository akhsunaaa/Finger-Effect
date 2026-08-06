// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
    videoWidth: 1280,
    videoHeight: 720,
    maxHands: 2,
    modelComplexity: 1,
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

// Offscreen canvas for filter rendering
const offscreenCanvas = document.createElement('canvas');
const offCtx = offscreenCanvas.getContext('2d');

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
// CAMERA UTILITY
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
    // --- 1. Draw raw video (mirrored) as background ---
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // --- 2. Calculate finger frame ---
    const framePoints = calculateFingerFrame(handLandmarks);

    if (framePoints && framePoints.length === 4) {
        // --- 3. Render filtered version to offscreen canvas ---
        offscreenCanvas.width = canvas.width;
        offscreenCanvas.height = canvas.height;

        // Draw mirrored video onto offscreen
        offCtx.save();
        offCtx.translate(canvas.width, 0);
        offCtx.scale(-1, 1);
        offCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
        offCtx.restore();

        // Apply filter to offscreen canvas pixel data
        const imageData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
        applyFilterToData(imageData.data, currentFilter);
        offCtx.putImageData(imageData, 0, 0);

        // --- 4. Draw the filtered offscreen canvas only inside the finger frame ---
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(framePoints[0].x, framePoints[0].y);
        for (let i = 1; i < framePoints.length; i++) {
            ctx.lineTo(framePoints[i].x, framePoints[i].y);
        }
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(offscreenCanvas, 0, 0);
        ctx.restore();

        // --- 5. Draw outline + corner dots ---
        drawFrameOutline(framePoints);
    }

    // --- 6. Update FPS ---
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

    const leftHand = landmarks.find((h) => isLeftHand(h));
    const rightHand = landmarks.find((h) => !isLeftHand(h));

    if (!leftHand || !rightHand) return null;

    const leftThumb = leftHand[4];
    const leftIndex = leftHand[8];
    const rightThumb = rightHand[4];
    const rightIndex = rightHand[8];

    if (!leftThumb || !leftIndex || !rightThumb || !rightIndex) return null;

    const w = canvas.width;
    const h = canvas.height;

    return [
        { x: (1 - leftThumb.x) * w, y: leftThumb.y * h },
        { x: (1 - rightThumb.x) * w, y: rightThumb.y * h },
        { x: (1 - rightIndex.x) * w, y: rightIndex.y * h },
        { x: (1 - leftIndex.x) * w, y: leftIndex.y * h },
    ];
}

function isLeftHand(landmarks) {
    return landmarks[0].x < 0.5;
}

// ============================================================
// FILTER APPLIER (on pixel data array)
// ============================================================
function applyFilterToData(data, filter) {
    const w = canvas.width;
    const h = canvas.height;

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
            const tempData = new Uint8ClampedArray(data);
            const offset = 6;
            for (let i = 0; i < data.length; i += 4) {
                if (i + offset * 4 < data.length && i - offset * 4 >= 0) {
                    data[i] = tempData[i + offset * 4];
                    data[i + 2] = tempData[i - offset * 4];
                }
            }
            break;

        case 'thermal':
            for (let i = 0; i < data.length; i += 4) {
                const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
                const t = brightness / 255;
                if (t < 0.33) {
                    data[i] = 0;
                    data[i+1] = t * 3 * 255;
                    data[i+2] = 255;
                } else if (t < 0.66) {
                    data[i] = (t - 0.33) * 3 * 255;
                    data[i+1] = 255;
                    data[i+2] = 255 - (t - 0.33) * 3 * 255;
                } else {
                    data[i] = 255;
                    data[i+1] = 255 - (t - 0.66) * 3 * 255;
                    data[i+2] = 0;
                }
            }
            break;

        case 'vignette':
            const cx = w / 2, cy = h / 2;
            const maxDist = Math.sqrt(cx*cx + cy*cy);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const idx = (y * w + x) * 4;
                    const dist = Math.sqrt((x - cx)*(x - cx) + (y - cy)*(y - cy));
                    const factor = 1 - (dist / maxDist) * 0.7;
                    data[idx] *= factor;
                    data[idx+1] *= factor;
                    data[idx+2] *= factor;
                }
            }
            break;

        // 'none' does nothing
        default:
            break;
    }
}

// ============================================================
// DRAW FRAME OUTLINE + CORNER DOTS
// ============================================================
function drawFrameOutline(points) {
    if (!points || points.length < 4) return;

    ctx.save();

    const dashOffset = (Date.now() / 50) % 16;
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

    points.forEach((p) => {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 15);
        gradient.addColorStop(0, 'rgba(0, 150, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 150, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0096ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();

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

init();