# 🖐️ Finger Frame Effects

> Real-time interactive video effects controlled by your fingers—no buttons needed!

[![Live Demo](https://img.shields.io/badge/🚀_TRY_IT_NOW-Live_Demo-0096ff?style=for-the-badge)](https://akhsunaaa.github.io/Finger-Effect)
[![Made with JavaScript](https://img.shields.io/badge/Made_with-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Uses MediaPipe](https://img.shields.io/badge/Uses-MediaPipe-00c300?style=for-the-badge)](https://developers.google.com/mediapipe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 🚀 Try It Now!

**No installation. No downloads. Just open and go!**

👉 **[Click here to try the live demo](https://akhsunaaa.github.io/Finger-Effect)**

Just allow camera access, make a finger frame with both hands, and watch the magic happen!

<div align="center">
  <img src="assets/demo.gif" alt="Finger Frame Effect Demo" width="700"/>
  <br>
  <em>Create magic with just your fingers ✨</em>
</div>

---

## 🎯 What is this?

A browser-based real-time video effect tool that detects your hands using **MediaPipe** and applies creative filters inside the frame created by your fingers—just like the viral TikTok/Instagram trend—but with **gesture controls and video recording** built in!

**No app to install, no account to create—just your browser and your webcam.**

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

## 🎮 How To Use

1. Open the **[live demo](https://akhsunaaa.github.io/Finger-Effect)**
2. Allow camera access when prompted
3. **Position your hands** in front of the camera
4. **Make a finger frame** with both hands (thumbs and index fingers touching)
5. **Filters apply automatically** inside the frame
6. **Make a fist ✊** to cycle through filters
7. **Make a peace sign ✌️** to start recording
8. **Make peace sign again** to stop and download your video

### Pro Tips
- Good lighting improves hand tracking dramatically
- Keep your hands at a comfortable distance (about arms' length)
- The frame works best when your hands form a rectangle
- Use the FPS counter to check performance

---

### 📂 Project Structure

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

## 📝 License

This project is open source and available under the **MIT License**. See the [LICENSE](LICENSE) file for more details.

---

## 🙏 Acknowledgments

- [MediaPipe](https://developers.google.com/mediapipe) for hand tracking
- [ThatSINEWAVE/Hand-Tracker](https://github.com/ThatSINEWAVE/Hand-Tracker) for inspiration
- The open-source community for making this possible

---

## 📬 Contact
<a href="mailto:anu723jain@gmail.com"><img alt="Email" width="30px" style="padding-right:10px;" src="https://www.svgrepo.com/show/353812/google-gmail.svg"/></a>

<a href="https://www.linkedin.com/in/anushka-jain5674"><img alt="Linkedin" width="30px" style="padding-right:10px;" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-original.svg"/></a>

<a href="https://www.instagram.com/_anu723_"><img alt="Instagram" width="30px" style="padding-right:10px;" src="https://www.svgrepo.com/show/452229/instagram-1.svg"/></a>
<a href="https://x.com/akhsuna_"><img alt="Twitter/X" width="27px" style="padding-right:10px;" src="https://github.com/akhsunaaa/akhsunaaa/blob/main/logo.svg" /></a>

<a href="https://www.threads.net/@_anu723_"> <img alt="Twitter/X" width="30px" style="padding-right:10px;" src="https://raw.githubusercontent.com/akhsunaaa/akhsunaaa/e41e1ef82ba2d745d08562caa24a8b6b7821df5c/threads-app-icon.svg" /></a>

<a href="https://pin.it/2jFTU0XO7"><img alt="Pinterest" width="30px" style="padding-right:10px;" src="https://www.svgrepo.com/show/354183/pinterest.svg"/></a>
</p>

---

## ⭐ Support

If you find this project useful, please give it a star! ⭐

---

*Built with ❤️ by [akhsunaaa](https://github.com/akhsunaaa)*