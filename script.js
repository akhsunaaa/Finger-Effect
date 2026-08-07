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
const gestureStatus = document.getElementById('gesture-status');

// Offscreen canvas
const offscreenCanvas = document.createElement('canvas');
const offCtx = offscreenCanvas.getContext('2d');

// State
let currentFilter = 'none';
let frameCount = 0;
let lastFpsUpdate = performance.now();
let handLandmarks = [];
let filterIndex = 0;
const filterNames = ['none', 'grayscale', 'sepia', 'invert', 'pixelate', 'glitch', 'thermal', 'vignette', 'comic', 'grid', 'duotone', 'glass', 'neon'];
const filterIcons = ['👁️', '⚪', '🟫', '🔄', '📺', '📡', '🔥', '🎭', '💥', '📐', '🎨', '🪟', '💡'];

// Recording
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let stream = null;

// Gesture detection state
let lastGestureTime = 0;
const GESTURE_COOLDOWN = 800; // ms between gesture triggers

// ============================================================
// CAMERA SETUP
// ============================================================
async function setupCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: CONFIG.videoWidth,
                height: CONFIG.videoHeight,
                facingMode: 'user',
            },
            audio: false,
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
    handsStatus.textContent = handLandmarks.length;

    // Detect gestures from landmarks
    if (handLandmarks.length >= 1) {
        detectGesture(handLandmarks[0]);
    } else {
        gestureStatus.textContent = '✋';
    }
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
// GESTURE DETECTION
// ============================================================
function detectGesture(landmarks) {
    const now = Date.now();
    if (now - lastGestureTime < GESTURE_COOLDOWN) return;

    // Get fingertip positions
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Get finger base positions (MCP joints)
    const indexBase = landmarks[5];
    const middleBase = landmarks[9];
    const ringBase = landmarks[13];
    const pinkyBase = landmarks[17];

    // Check if fingers are extended (tip higher than base in y-coordinate)
    const isIndexExtended = indexTip.y < indexBase.y - 0.05;
    const isMiddleExtended = middleTip.y < middleBase.y - 0.05;
    const isRingExtended = ringTip.y < ringBase.y - 0.05;
    const isPinkyExtended = pinkyTip.y < pinkyBase.y - 0.05;

    // Check if thumb is extended (distance from thumb tip to index base)
    const thumbDist = Math.hypot(thumbTip.x - indexBase.x, thumbTip.y - indexBase.y);

    // --- FIST: All fingers curled ---
    const isFist = !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended && thumbDist < 0.15;

    // --- PEACE SIGN: Index and middle extended, others curled ---
    const isPeace = isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended;

    // --- OPEN HAND: All fingers extended ---
    const isOpen = isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended;

    // --- THUMBS UP: Only thumb extended ---
    const isThumbsUp = thumbDist > 0.15 && !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended;

    // Trigger actions
    if (isFist) {
        // Fist = Next filter
        lastGestureTime = now;
        nextFilter();
        gestureStatus.textContent = '✊';
        console.log('👊 Fist detected → Next filter');
    } else if (isPeace) {
        // Peace sign = Toggle recording
        lastGestureTime = now;
        toggleRecording();
        gestureStatus.textContent = '✌️';
        console.log('✌️ Peace detected → Toggle recording');
    } else if (isOpen) {
        gestureStatus.textContent = '🖐️';
    } else if (isThumbsUp) {
        gestureStatus.textContent = '👍';
    } else {
        gestureStatus.textContent = '✋';
    }
}

// ============================================================
// FILTER NAVIGATION
// ============================================================
function nextFilter() {
    filterIndex = (filterIndex + 1) % filterNames.length;
    currentFilter = filterNames[filterIndex];

    // Update UI
    document.querySelectorAll('.filter-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === filterIndex);
    });

    console.log(`🎨 Filter: ${currentFilter} ${filterIcons[filterIndex]}`);
}

// ============================================================
// RECORDING
// ============================================================
function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    if (!stream) {
        console.warn('No stream available');
        return;
    }

    // Capture the canvas stream
    const canvasStream = canvas.captureStream(30);
    recordedChunks = [];

    mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000,
    });

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finger-effect-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('✅ Download ready!');
        document.getElementById('download-btn').classList.remove('hidden');
        document.getElementById('record-text').textContent = 'Record';
        document.getElementById('record-btn').classList.remove('recording');
        document.getElementById('recording-indicator').classList.add('hidden');
        isRecording = false;
    };

    mediaRecorder.start(1000); // Capture in 1-second chunks
    isRecording = true;
    document.getElementById('record-text').textContent = '⏹️ Stop';
    document.getElementById('record-btn').classList.add('recording');
    document.getElementById('recording-indicator').classList.remove('hidden');
    document.getElementById('download-btn').classList.add('hidden');
    console.log('🔴 Recording started');
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        console.log('⏹️ Recording stopped');
    }
}

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

        offCtx.save();
        offCtx.translate(canvas.width, 0);
        offCtx.scale(-1, 1);
        offCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
        offCtx.restore();

        const imageData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
        applyFilterToData(imageData.data, currentFilter);
        offCtx.putImageData(imageData, 0, 0);

        // Special handling for Glass filter - apply blur
        if (currentFilter === 'glass') {
            // Apply canvas blur filter to the offscreen canvas
            offCtx.save();
            offCtx.filter = 'blur(8px)';
            offCtx.drawImage(offscreenCanvas, 0, 0);
            offCtx.restore();
        }

        // --- 4. Draw filtered canvas inside finger frame ---
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

        // --- 5. Draw outline ---
        drawFrameOutline(framePoints);
        // --- 6. Draw grid overlay ---
        drawGridOverlay();
        // --- 7. Draw neon edges if applicable ---
        drawNeonEdges();
    }

    // --- 8. Update FPS ---
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate > 1000) {
        fpsDisplay.textContent = frameCount;
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
// NEON EDGE DETECTION (SIMPLIFIED)
// ============================================================
// ============================================================
// NEON EDGE DETECTION - Real Edge Detection with Sobel
// ============================================================
function drawNeonEdges() {
    if (currentFilter !== 'neon') return;

    const framePoints = calculateFingerFrame(handLandmarks);
    if (!framePoints || framePoints.length < 4) return;

    // Get the filtered offscreen canvas (already darkened)
    const imageData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const w = canvas.width;
    const h = canvas.height;

    // 1. Grayscale
    const gray = new Float32Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
        gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    // 2. Simple Sobel (no blur, no NMS - just magnitude)
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    const magnitude = new Float32Array(w * h);

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            let gx = 0, gy = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const idx = (y + ky) * w + (x + kx);
                    gx += gray[idx] * sobelX[(ky + 1) * 3 + (kx + 1)];
                    gy += gray[idx] * sobelY[(ky + 1) * 3 + (kx + 1)];
                }
            }
            magnitude[y * w + x] = Math.sqrt(gx * gx + gy * gy);
        }
    }

    // 3. Adaptive threshold - use 20% of max magnitude
    let maxMag = 0;
    for (let i = 0; i < magnitude.length; i++) {
        if (magnitude[i] > maxMag) maxMag = magnitude[i];
    }
    const threshold = Math.max(maxMag * 0.12, 10); // 18% of max - works for any lighting

    // 4. Create edge mask
    const edges = new Uint8ClampedArray(w * h);
    for (let i = 0; i < magnitude.length; i++) {
        edges[i] = magnitude[i] > threshold ? 255 : 0;
    }

    // 5. Draw neon edges INSIDE finger frame
    ctx.save();

    ctx.beginPath();
    ctx.moveTo(framePoints[0].x, framePoints[0].y);
    for (let i = 1; i < framePoints.length; i++) {
        ctx.lineTo(framePoints[i].x, framePoints[i].y);
    }
    ctx.closePath();
    ctx.clip();

    // Build edge image
    const edgeData = new ImageData(new Uint8ClampedArray(w * h * 4), w, h);
    for (let i = 0; i < edges.length; i++) {
        const idx = i * 4;
        if (edges[i] > 0) {
            // Neon pink/cyan
            edgeData.data[idx] = 255;     // R
            edgeData.data[idx + 1] = 80;  // G
            edgeData.data[idx + 2] = 180; // B
            edgeData.data[idx + 3] = 255;
        } else {
            edgeData.data[idx] = 0;
            edgeData.data[idx + 1] = 0;
            edgeData.data[idx + 2] = 0;
            edgeData.data[idx + 3] = 0;
        }
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(edgeData, 0, 0);

    // Glow
    ctx.shadowColor = 'rgba(255, 80, 180, 0.9)';
    ctx.shadowBlur = 20;
    ctx.drawImage(tempCanvas, 0, 0);

    // Core lines (brighter)
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(tempCanvas, 0, 0);

    ctx.restore();
}


// ============================================================
// FILTER APPLIER
// ============================================================
function applyFilterToData(data, filter) {
    const w = canvas.width;
    const h = canvas.height;

    switch (filter) {
        // ============================================================
        // ORIGINAL FILTERS
        // ============================================================
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
                const r = data[i],
                    g = data[i + 1],
                    b = data[i + 2];
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
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const t = brightness / 255;
                if (t < 0.33) {
                    data[i] = 0;
                    data[i + 1] = t * 3 * 255;
                    data[i + 2] = 255;
                } else if (t < 0.66) {
                    data[i] = (t - 0.33) * 3 * 255;
                    data[i + 1] = 255;
                    data[i + 2] = 255 - (t - 0.33) * 3 * 255;
                } else {
                    data[i] = 255;
                    data[i + 1] = 255 - (t - 0.66) * 3 * 255;
                    data[i + 2] = 0;
                }
            }
            break;

        case 'vignette':
            const cx = w / 2,
                cy = h / 2;
            const maxDist = Math.sqrt(cx * cx + cy * cy);
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const idx = (y * w + x) * 4;
                    const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
                    const factor = 1 - (dist / maxDist) * 0.7;
                    data[idx] *= factor;
                    data[idx + 1] *= factor;
                    data[idx + 2] *= factor;
                }
            }
            break;

        // ============================================================
        // NEW FIXED EFFECTS (RGBA ORDER)
        // ============================================================

        case 'grid':
            // Blueprint style: high contrast + blue tint
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const enhanced = Math.min(255, gray * 1.15 + 8);
                // RGB: red = 0.8, green = 0.85, blue = 0.9 of enhanced + base tint
                data[i] = Math.min(255, enhanced * 0.8 + 15);    // R
                data[i + 1] = Math.min(255, enhanced * 0.85 + 20); // G
                data[i + 2] = Math.min(255, enhanced * 0.9 + 30);  // B
            }
            break;

        case 'comic':
            // Pop-art comic: posterize to 4 levels with bold colors
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                // Simple histogram stretch (like cv2.equalizeHist)
                const equalized = Math.min(255, Math.max(0, (gray - 64) * 1.5 + 64));
                const level = Math.floor(equalized / 64) * 64;
                // Bold comic colors (RGB)
                if (level < 64) {
                    data[i] = 10;
                    data[i + 1] = 0;
                    data[i + 2] = 20;   // near-black
                } else if (level < 128) {
                    data[i] = 215;
                    data[i + 1] = 20;
                    data[i + 2] = 30;   // red
                } else if (level < 192) {
                    data[i] = 255;
                    data[i + 1] = 140;
                    data[i + 2] = 30;   // orange
                } else {
                    data[i] = 255;
                    data[i + 1] = 235;
                    data[i + 2] = 70;   // yellow
                }
            }
            break;

        case 'duotone':
            // Navy → Violet → Pink gradient map (4 stops)
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const equalized = Math.min(255, Math.max(0, (gray - 64) * 1.5 + 64));
                const t = equalized / 255;
                let r, g, b;
                // Stops in RGB: (10,20,70) -> (120,40,140) -> (235,60,90) -> (255,215,225)
                if (t < 0.25) {
                    const lt = t / 0.25;
                    r = 10 * (1 - lt) + 120 * lt;
                    g = 20 * (1 - lt) + 40 * lt;
                    b = 70 * (1 - lt) + 140 * lt;
                } else if (t < 0.50) {
                    const lt = (t - 0.25) / 0.25;
                    r = 120 * (1 - lt) + 235 * lt;
                    g = 40 * (1 - lt) + 60 * lt;
                    b = 140 * (1 - lt) + 90 * lt;
                } else if (t < 0.75) {
                    const lt = (t - 0.50) / 0.25;
                    r = 235 * (1 - lt) + 255 * lt;
                    g = 60 * (1 - lt) + 215 * lt;
                    b = 90 * (1 - lt) + 225 * lt;
                } else {
                    const lt = (t - 0.75) / 0.25;
                    r = 255;
                    g = 215 * (1 - lt) + 255 * lt;
                    b = 225 * (1 - lt) + 255 * lt;
                }
                data[i] = Math.min(255, r);
                data[i + 1] = Math.min(255, g);
                data[i + 2] = Math.min(255, b);
            }
            break;

        case 'glass':
            // Glassmorphism: frosted glass effect with FULL COLOR
            for (let i = 0; i < data.length; i += 4) {
                // Keep original colors, just brighten and add blue tint
                const r = data[i], g = data[i + 1], b = data[i + 2];
                // Mix with white but preserve color
                data[i] = Math.min(255, r * 0.7 + 255 * 0.3);
                data[i + 1] = Math.min(255, g * 0.7 + 255 * 0.3);
                data[i + 2] = Math.min(255, b * 0.7 + 255 * 0.3);
            }
            break;


        case 'neon':
            // Dark background with slight purple/blue tint
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const avg = (r + g + b) / 3;
                data[i] = avg * 0.08 + 10;    // R
                data[i + 1] = avg * 0.08 + 5; // G
                data[i + 2] = avg * 0.08 + 20; // B (more blue)
            }
            break;

        default:
            break;
    }
}

// ============================================================
// DRAW FRAME OUTLINE
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

/// ============================================================
// GRID OVERLAY
// ============================================================
function drawGridOverlay() {
    // Only draw grid for 'grid' filter, not 'neon'
    if (currentFilter !== 'grid') return;

    const framePoints = calculateFingerFrame(handLandmarks);
    if (!framePoints || framePoints.length < 4) return;

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(framePoints[0].x, framePoints[0].y);
    for (let i = 1; i < framePoints.length; i++) {
        ctx.lineTo(framePoints[i].x, framePoints[i].y);
    }
    ctx.closePath();
    ctx.clip();

    const w = canvas.width;
    const h = canvas.height;
    const step = Math.max(14, Math.floor(w / 18));

    // Draw grid with mixed line styles
    for (let x = 0; x < w; x += step) {
        const index = Math.floor(x / step);
        // Every 4th line is thick and white
        if (index % 4 === 0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = 'rgba(160, 157, 152, 0.5)';
            ctx.lineWidth = 1;
        }
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }

    for (let y = 0; y < h; y += step) {
        const index = Math.floor(y / step);
        // Every 4th line is thick and white
        if (index % 4 === 0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = 'rgba(160, 157, 152, 0.5)';
            ctx.lineWidth = 1;
        }
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    ctx.restore();
}

// ============================================================
// UI EVENT HANDLERS
// ============================================================

// Filter buttons
document.querySelectorAll('.filter-btn').forEach((btn, index) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        filterIndex = index;
        console.log(`🎨 Filter changed to: ${currentFilter}`);
    });
});

// Record button
document.getElementById('record-btn').addEventListener('click', toggleRecording);

// Download button
document.getElementById('download-btn').addEventListener('click', () => {
    // The download is already triggered when recording stops
    // This button is just a visual indicator
    document.getElementById('download-btn').classList.add('hidden');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextFilter();
    } else if (e.key === 'r' || e.key === 'R') {
        toggleRecording();
    }
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
        console.log('🎮 Gestures: ✊=Next Filter, ✌️=Toggle Record');
        console.log('⌨️ Keyboard: Space=Next Filter, R=Toggle Record');
    } catch (error) {
        console.error('❌ Failed to start:', error);
    }
}

init();