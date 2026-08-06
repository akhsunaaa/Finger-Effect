# 🖐️ Finger Frame Effects

> Real-time interactive video effects controlled by your fingers—no buttons needed!

[![Live Demo](https://img.shields.io/badge/Live_Demo-View-0096ff?style=for-the-badge)](https://akhsunaaa.github.io/Finger-Effect)
[![Made with JavaScript](https://img.shields.io/badge/Made_with-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Uses MediaPipe](https://img.shields.io/badge/Uses-MediaPipe-00c300?style=for-the-badge)](https://developers.google.com/mediapipe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 🎯 What is this?

A browser-based real-time video effect tool that detects your hands using **MediaPipe** and applies creative filters inside the frame created by your fingers—just like the viral TikTok/Instagram trend—but with **gesture controls and video recording** built in!

<div align="center">
  <img src="assets/demo.gif" alt="Finger Frame Effect Demo" width="700"/>
  <br>
  <em>Create magic with just your fingers ✨</em>
</div>

---

## ✨ Features

### 🎨 8 Visual Filters
| Filter | Description |
| :--- | :--- |
| 👁️ **Normal** | No filter applied |
| ⚪ **Grayscale** | Classic black & white |
| 🟫 **Sepia** | Vintage warm-toned look |
| 🔄 **Invert** | Color negative effect |
| 📺 **Pixelate** | Retro 8-bit block effect |
| 📡 **Glitch** | RGB split distortion |
| 🔥 **Thermal** | Heatmap style (blue → yellow → red) |
| 🎭 **Vignette** | Darkened edges for cinematic look |

### 🎮 Gesture Controls (Hands-Free!)
| Gesture | Action |
| :--- | :--- |
| ✊ **Fist** | Switch to next filter |
| ✌️ **Peace Sign** | Start/Stop recording |
| 🖐️ **Open Hand** | Visual feedback (no action) |
| 👍 **Thumbs Up** | Visual feedback (no action) |

### ⌨️ Keyboard Shortcuts
| Key | Action |
| :--- | :--- |
| `Space` or `→` | Next filter |
| `R` | Toggle recording |

### 📹 Recording & Export
- Record your creation with one gesture
- Export as `.webm` video file
- Download directly from the browser

### 🎨 Modern UI
- Sidebar filter list (outside the camera frame)
- Glass-morphism design
- Real-time FPS counter
- Hand detection status
- Gesture feedback display
- Recording indicator
- Fully responsive (mobile-friendly!)

---

## 🧠 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                       Your Webcam                           │
└────────────────────┬────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    MediaPipe Hands                          │
│     Detects 21 landmarks per hand in real-time              │
└────────────────────┬────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Gesture Recognition                            │
│  • Fist ✊ → Next filter                                    │
│  • Peace ✌️ → Toggle recording                              │
└────────────────────┬────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Finger Frame Calculation                          │
│  Left thumb + index tip → Left side of frame                │
│  Right thumb + index tip → Right side of frame              │
└────────────────────┬────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Canvas Compositing                             │
│  1. Draw video background                                   │
│  2. Apply filter to offscreen canvas                        │
│  3. Clip & draw filtered version inside frame               │
│  4. Draw "marching ants" outline + corner dots              │
└────────────────────┬────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Output                                 │
│              Display + Recording                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **HTML5** | Structure |
| **CSS3** | Styling & responsive design |
| **Vanilla JavaScript** | Core logic |
| **MediaPipe Hands** | Hand landmark detection |
| **HTML5 Canvas** | Video rendering & filter compositing |
| **WebRTC / getUserMedia** | Camera capture |
| **MediaRecorder API** | Video recording |
| **Offscreen Canvas** | Isolated filter rendering |

---

## 🚀 Getting Started

### Prerequisites
- A web browser with WebGL support (Chrome recommended)
- A webcam
- Local server (for development)

### Installation

```bash
# Clone the repository
git clone https://github.com/akhsunaaa/Finger-Effect.git

# Navigate to project directory
cd Finger-Effect

# Open with VS Code (or any editor)
code .

# Start a local server (Python)
python3 -m http.server 8080

# Open in browser
# Navigate to: http://localhost:8080
```

> **⚠️ Note:** You **must** use a local server. Opening the HTML file directly (`file://`) will block camera access.

### VS Code Quick Start
1. Install **Live Server** extension
2. Right-click `index.html` → "Open with Live Server"
3. Allow camera access
4. Make a finger frame gesture with both hands!
5. Use ✊ fist to change filters, ✌️ peace to record

---

## 📁 Project Structure

```
Finger-Effect/
├── index.html          # Main HTML structure
├── styles.css          # Modern glass-morphism UI
├── script.js           # Core logic (MediaPipe + Canvas + Gestures + Recording)
├── assets/
│   └── demo.gif        # Demo animation (optional)
├── .gitignore          # Git ignore rules
├── LICENSE             # MIT License
└── README.md           # This file
```

---

## 🎮 How To Use

1. **Position your hands** in front of the camera
2. **Make a finger frame** with both hands (thumbs and index fingers touching)
3. **Filters apply automatically** inside the frame
4. **Make a fist ✊** to cycle through filters
5. **Make a peace sign ✌️** to start recording
6. **Make peace sign again** to stop and download your video

### Pro Tips
- Good lighting improves hand tracking dramatically
- Keep your hands at a comfortable distance (about arms' length)
- The frame works best when your hands form a rectangle
- Use the FPS counter to check performance

---

## 🔧 Adding Custom Filters

Filters are defined in `applyFilterToData()` in `script.js`. Here's the structure:

```javascript
case 'your-filter-name':
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Modify r, g, b here
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
    }
    break;
```

Then add your filter to the `filterNames` and `filterIcons` arrays, and add a button in the HTML.

---

## 🐛 Troubleshooting

| Issue | Solution |
| :--- | :--- |
| Camera not loading | Run on a server (Live Server or Python HTTP) |
| Hands not detected | Improve lighting, move closer/farther |
| Recording not working | Use Chrome, ensure camera permissions |
| Filters apply to whole screen | Make sure both hands are detected |

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-filter`)
3. Commit your changes (`git commit -m 'Add amazing filter'`)
4. Push to the branch (`git push origin feature/amazing-filter`)
5. Open a Pull Request

---

## 📝 License

This project is open source and available under the **MIT License**. See the [LICENSE](LICENSE) file for more details.

---

## 🙏 Acknowledgments

- [MediaPipe](https://developers.google.com/mediapipe) for hand tracking
- [ThatSINEWAVE/Hand-Tracker](https://github.com/ThatSINEWAVE/Hand-Tracker) for inspiration
- The open-source community for making this possible

---

## 📬 Contact

- **GitHub**: [@akhsunaaa](https://github.com/akhsunaaa)
<!-- - **Portfolio**: [akhsunaaa.dev](https://akhsunaaa.dev) -->

---

## ⭐ Support

If you find this project useful, please give it a star! ⭐

---

*Built with ❤️ by [akhsunaaa](https://github.com/akhsunaaa)*
```
