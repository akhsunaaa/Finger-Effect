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
const filterNames = ['none', 'grayscale', 'sepia', 'invert', 'pixelate', 'glitch', 'thermal', 'vignette'];
const filterIcons = ['👁️', '⚪', '🟫', '🔄', '📺', '📡', '🔥', '🎭'];

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
    }

    // --- 6. Update FPS ---
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
// FILTER APPLIER
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