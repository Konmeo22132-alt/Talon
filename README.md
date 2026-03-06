<h1 align="center">🦅 Talon</h1>

<p align="center">
  <strong>A personal Windows assistant powered by LLaMA 3.1, controlled remotely via Telegram.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-ES%20Modules-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/AI-Groq%20(LLaMA%203.1)-f55036" alt="Groq AI">
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white" alt="Windows">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
</p>

---

Talon is an autonomous agent running directly on your Windows machine. It acts as an intelligent planner that interprets natural language via Telegram, deciding how to interact with your desktop. It handles app launching, raw mouse/keyboard inputs, file management, and web research without relying on heavy C++ build tools.

*Single user. Single machine. Full control from your phone.*

> **🌐 [Đọc tài liệu bằng Tiếng Việt (Read in Vietnamese)](README_vi.md)**

## 📋 Table of Contents

- [Architecture & Flow](#architecture--flow)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration Variables](#configuration-variables)
- [License](#license)

---

## 🏗 Architecture & Flow

Talon is designed around a multi-step action loop. The AI does not just answer questions; it actively uses tools, observes the results, and decides the next step.

    User (Telegram) ──▶ Bot Layer ──▶ AI Planner (Groq) ──▶ Action Engine ──▶ Windows OS
                                           ▲                                      │
                                           │ (Context: 30 msgs)                   │
                                           └────────── [ Result Feedback ] ───────┘
                                              Max 6 iterations per request

**Design Principles:**
1. **Raw Data Returns:** Actions execute and return strictly raw data. The AI synthesizes this into a natural Vietnamese response.
2. **Zero Native Dependencies:** Mouse/keyboard control runs purely on PowerShell + Win32 API via .NET interop. No `node-gyp` or C++ compilers required.
3. **Modular Extensibility:** Every action is a standalone module dynamically loaded by the registry.

## ✨ Core Features

### AI Planning & Execution
* **Multi-Step Reasoning:** Capable of complex loops (e.g., *Search for a topic → Read specific URL → Extract data → Reply*).
* **Context Retention:** Maintains a rolling history of the last 30 messages.

### Desktop Automation & Control
* **Grid System:** Screen is mapped to a 16x18 grid (A1 to P18). Allows precise clicking, area screenshots, and targeted OCR.
* **Live Control Mode:** Telegram inline keyboard for manual D-Pad navigation, clicking, and scrolling.
* **Visual Overlays:** Automatically injects a red crosshair on screenshots to indicate current cursor position.
* **Keyboard Emulation:** Sends keystrokes via `SendKeys`.

### Research & Connectivity
* **Bypass Anti-Bot:** Integrates `Jina.ai Reader` to bypass Cloudflare for scraping Medium, YouTube descriptions, and news sites.
* **Fallback Search:** 3-tier routing (`SearchAPI.io` → `SerpAPI` → `DuckDuckGo`).
* **Image Caching:** Media searches cache results. Triggering "ảnh khác" (next image) instantly serves the next item without re-fetching.

### System & File Management
* **Smart App Launcher:** Aliased execution (e.g., "Mở Discord") falling back to PowerShell's `Get-StartApps`.
* **Auto-Provisioning:** Detects missing Python/Node packages and auto-installs them via `pip` or `npm`.
* **Safe I/O:** Restricts file downloads, moving, and listing strictly to the user's Desktop, Documents, and Downloads folders.

## 🛠 Tech Stack

| Component | Technology |
|---|---|
| **Runtime** | Node.js (ES Modules) |
| **Brain** | Groq SDK (LLaMA 3.1 8B) |
| **Interface** | Telegram Bot API |
| **I/O Control** | PowerShell + Win32 API |
| **Vision / OCR** | `screenshot-desktop`, `sharp`, `Tesseract.js` |
| **Web Data** | SearchAPI.io, SerpAPI, DuckDuckGo, Jina.ai |

## 📁 Project Structure

    talon/
    ├── data/                     # Runtime outputs (screenshots, logs)
    │   └── _mouse.ps1            # Auto-generated PowerShell script for I/O
    ├── src/
    │   ├── actions/              # Modular action scripts
    │   │   ├── registry.js       # Auto-discovery & dispatch
    │   │   ├── webSearch.js      # DuckDuckGo / SearchAPI.io fallback
    │   │   ├── serpSearch.js     # SerpAPI (images/news/videos)
    │   │   ├── fetchUrl.js       # Jina.ai Reader (bypass Cloudflare)
    │   │   ├── runCommand.js     # Controlled shell execution
    │   │   ├── openApp.js        # App launcher via aliases & StartApps
    │   │   ├── openBrowser.js    # Default browser URL open
    │   │   ├── screenshot.js     # Full screen + grid overlay
    │   │   ├── gridClick.js      # Click at grid coordinate
    │   │   ├── gridScreenshot.js # Crop region screenshot
    │   │   ├── gridOcr.js        # OCR on grid region
    │   │   ├── typeText.js       # Keyboard input via SendKeys
    │   │   ├── controlModeOn.js  # Activate inline keyboard control
    │   │   ├── controlModeOff.js # Deactivate control mode
    │   │   ├── getFileList.js    # List files in safe directories
    │   │   ├── downloadFile.js   # HTTP download to safe directories
    │   │   ├── moveFile.js       # Move between safe directories
    │   │   ├── detectEnv.js      # Detect node/python versions
    │   │   └── installPackage.js # Auto-detect and pip/npm install
    │   ├── grid/                 # Grid math, parsing (A1:C3), and SVG overlay
    │   ├── planner/              # Groq client, prompt engineering, loop logic
    │   ├── telegram/             # Bot listeners, control mode UI
    │   ├── utils/                # PowerShell wrappers (mouse.js)
    │   ├── config.js             # Environment validation
    │   └── index.js              # Entry point
    ├── .env.example
    ├── package.json
    └── README.md

## 🚀 Getting Started

### Prerequisites
* Windows 10/11
* Node.js v18+
* A Telegram Bot Token from [@BotFather](https://t.me/BotFather)

### Installation

1. **Clone the repository:**
   `git clone https://github.com/Konmeo22132-alt/Talon.git`
   `cd talon`

2. **Install dependencies:**
   `npm install`

3. **Environment Setup:**
   `cp .env.example .env`
   
   Fill in your `.env` file with the required keys (see Configuration below).

4. **Start Talon:**
   `npm start`

## ⚙ Configuration Variables

Edit your `.env` file before starting the application:

| Variable | Status | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | **Required** | Provided by BotFather. |
| `TELEGRAM_OWNER_ID` | **Required** | Your personal Telegram User ID. Only this ID can issue commands. |
| `GROQ_API_KEY` | **Required** | Authentication for the LLaMA planner. |
| `SEARCHAPI_KEY` | Optional | For enhanced Google search capabilities. |
| `SERPAPI_API_KEY` | Optional | For image, news, and video search. |

## 📄 License

This project is licensed under the MIT License.
