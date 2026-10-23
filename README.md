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

### From Web Store (Recommended)

[![Chrome Web Store](https://aria2e.com/assets/badges/chrome-web-store.png)](https://chromewebstore.google.com/detail/mpkodccbngfoacfalldjimigbofkhgjn)
<a href="https://microsoftedge.microsoft.com/addons/detail/ngojgbdekanmijaphecgpmfoegoanffi"><img src="https://aria2e.com/assets/badges/microsoft-en-light.svg" alt="Edge Add-ons Store" height="59"></a>

### From GitHub
1. Visit the [Releases page](https://github.com/alexhua/Aria2-Explorer/releases) and download the latest `.crx` file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right corner)
4. Drag and drop the downloaded `.crx` file onto the extensions page to install

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
