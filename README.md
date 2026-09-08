# Aria2 Explorer

<div align="center">

![Logo](images/logo128.png)

**A powerful Chrome extension for seamless Aria2 integration**

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-red?logo=google-chrome)](https://chromewebstore.google.com/detail/mpkodccbngfoacfalldjimigbofkhgjn)
[![License](https://img.shields.io/badge/license-BSD--3--Clause-green.svg)](LICENSE)
[![Version](https://img.shields.io/github/v/release/alexhua/Aria2-Explorer.svg?color=gold)](manifest.json)

[English](#english) | [中文](./README.cn.md)

</div>

---

## 📖 Overview

Aria2 Explorer is a feature-rich Chrome extension that seamlessly integrates Aria2 download manager into your browser. It automatically captures downloads, monitors Aria2 status, and provides a beautiful web UI for managing your downloads.

## ✨ Key Features

### 🎯 Smart Download Capture
- **Automatic Interception**: Captures browser downloads based on file size and type
- **Flexible Filtering**: Whitelist/blacklist by domain and file extension
- **Alt-Key Override**: Hold Alt while clicking to bypass capture
- **Multi-URL Support**: Handle multiple download URLs simultaneously

### 📊 Real-time Monitoring
- **Live Status**: Monitor active, waiting, and completed tasks
- **Speed Display**: Real-time upload/download speed in badge
- **Multi-Server**: Support monitoring multiple Aria2 servers
- **Smart Intervals**: Adaptive polling based on activity

### 🎨 Beautiful Interface
- **Integrated WebUI**: Built-in AriaNg interface
- **Multiple Modes**: Open as popup, tab, window, or side panel
- **Dark Mode**: System-aware theme switching
- **Animated Icons**: Visual feedback for download states

### 🔧 Advanced Configuration
- **Multiple RPC Servers**: Configure and switch between servers
- **Pattern Matching**: Auto-select server based on URL patterns
- **Cookie Support**: Automatic cookie forwarding for authenticated downloads
- **Custom Headers**: Add custom headers to download requests

### 🌐 Context Menu Integration
- **Quick Export**: Right-click links to send to Aria2
- **Batch Export**: Export all links from current page
- **Site Filtering**: Quick add/remove sites from whitelist/blacklist
- **Server Selection**: Choose target server from context menu

### 🔔 Smart Notifications
- **Task Status**: Get notified on download complete/error
- **Silent Mode**: Optional silent notifications
- **Custom Messages**: Detailed context in notifications
- **Click Actions**: Click notification to open WebUI

## 🚀 Installation

### From Chrome Web Store (Recommended)

[![Chrome Web Store](https://aria2e.com/assets/badges/chrome-web-store.png)](https://chromewebstore.google.com/detail/mpkodccbngfoacfalldjimigbofkhgjn)

### From GitHub
1. Visit the [Releases page](https://github.com/alexhua/Aria2-Explorer/releases) and download the latest `.crx` file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right corner)
4. Drag and drop the downloaded `.crx` file onto the extensions page to install

## ⚙️ Configuration

### Basic Setup
1. Click the extension icon and select "Options"
2. Configure your Aria2 RPC server:
   - **Name**: A friendly name for your server
   - **RPC URL**: Your Aria2 RPC endpoint (e.g., `http://localhost:6800/jsonrpc`)
   - **Secret Key**: Your Aria2 RPC secret (if configured)
   - **Download Location**: Default download directory

### Download Capture
- **Enable/Disable**: Toggle automatic download capture
- **File Size**: Minimum file size to capture (MB)
- **Check Alt-Click**: Detect Alt key to bypass capture
- **Ask Before Download**: Show UI before sending to Aria2

### Monitoring
- **Enable Monitoring**: Toggle Aria2 status monitoring
- **Monitor All**: Monitor all configured servers
- **Keep Awake**: Prevent system sleep during downloads
- **Badge Text**: Show active downloads in badge

### Filtering
- **Allowed Sites**: Whitelist domains (one per line)
- **Blocked Sites**: Blacklist domains (one per line)
- **Allowed Extensions**: Whitelist file types (e.g., `zip`, `mp4`)
- **Blocked Extensions**: Blacklist file types

## 🎯 Usage

### Automatic Capture
1. Enable "Download Capture" in options
2. Click any download link
3. Extension automatically sends to Aria2

### Manual Export
1. Right-click any link
2. Select "Export to Aria2"
3. Choose target server (if multiple configured)

### Batch Export
1. Right-click on page
2. Select "Export All Links"
3. Extension scans and exports all valid links

### Monitor Status
1. Enable "Monitor Aria2" in options
2. Badge shows active download count
3. Hover icon to see detailed status
4. Click icon to open WebUI

## 🔑 Keyboard Shortcuts

- **Alt + A**: Toggle download capture
- **Alt + X**: Launch Aria2 (Windows only)

*Customize shortcuts at `chrome://extensions/shortcuts`*

## 🧩 Integration

Allow other extensions to use this extension as middleware to download files with Aria2.

```js

const downloadItem = {
    url: "https://sample.com/image.jpg",
    filename: "image_from_sample.jpg",
    referrer: "https://sample.com",
    options: { 
        split: "10", // aria2 RPC options here
        xxxxx: "oooo"
    }
}

chrome.runtime.sendMessage(`Aria2-Explorer extension ID`, downloadItem)

```

## 🏗️ Architecture

The extension follows a modular architecture for better maintainability:

<details> <summary>Directory Content</summary>

```
├── background.js              # Service worker entry point
├── manifest.json              # Extension manifest
├── options.html               # Options page
├── aria2.html                 # Aria2 WebUI page
├── css/                       # Stylesheets
│   ├── options.css            # Options page styles
│   ├── options.dark.css       # Dark mode styles
│   └── ...
├── images/                    # Icon assets
├── js/
│   ├── background/            # Background modules
│   │   ├── DownloadManager.js    # Download handling
│   │   ├── CaptureManager.js     # Capture logic
│   │   ├── MonitorManager.js     # Aria2 monitoring
│   │   ├── NotificationManager.js # Notification management
│   │   ├── MenuManager.js        # Context menus
│   │   ├── UIManager.js          # UI management
│   │   └── EventHandler.js       # Event handling
│   ├── content/               # Content scripts
│   │   ├── clickChecker.js       # Click detection
│   │   └── exportAll.js          # Batch export
│   ├── options/               # Options page modules
│   │   ├── ConfigManager.js      # Config CRUD
│   │   ├── UIController.js       # UI control
│   │   ├── RpcManager.js         # RPC list management
│   │   ├── options.js            # Options page main logic
│   │   └── initTheme.js          # Theme initialization
│   ├── IconUtils/             # Icon animation utilities
│   │   ├── IconManager.js        # Icon manager
│   │   ├── AnimationController.js # Animation controller
│   │   ├── Animation.js          # Animation implementation
│   │   ├── TransitionManager.js  # Transition management
│   │   ├── Canvas.js             # Canvas rendering
│   │   ├── Easing.js             # Easing functions
│   │   └── Constants.js          # Constants definition
│   ├── aria2.js               # Aria2 RPC client
│   ├── aria2Options.js        # Aria2 options handler
│   ├── config.js              # Configuration definitions
│   ├── contextMenu.js         # Context menu configuration
│   ├── startAria2.js          # Aria2 launcher
│   └── utils.js               # Utility functions
├── ui/ariang/                 # Integrated AriaNg WebUI
└── _locales/                  # Internationalization files
    ├── zh_CN/                 # Simplified Chinese
    ├── en/                    # English
    └── ...                    # Other languages
```

</details>

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the BSD 3-Clause License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Aria2](https://aria2.github.io/) - The amazing download utility
- [AriaNg](https://github.com/mayswind/AriaNg) - Modern web frontend for Aria2
- All contributors and users

## 📮 Support

- **Issues**: [GitHub Issues](https://github.com/alexhua/Aria2-Explorer/issues)
- **Website**: [https://aria2e.com](https://aria2e.com)
- **Email**: Contact through GitHub

---

<div align="center">

**Made with ❤️ by Alex Hua**

⭐ Star us on GitHub — it helps!

[🇨🇳 中文文档](./README.cn.md)

</div>
