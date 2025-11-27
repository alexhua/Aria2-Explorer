# Aria2 Explorer

<div align="center">

![Logo](images/logo128.png)

**功能强大的 Chrome 扩展，无缝集成 Aria2 下载管理器**

[![Chrome 应用商店](https://img.shields.io/badge/Chrome-应用商店-red?logo=google-chrome)](https://chromewebstore.google.com/detail/mpkodccbngfoacfalldjimigbofkhgjn)
[![许可证](https://img.shields.io/badge/license-BSD--3--Clause-green.svg)](LICENSE)
[![版本](https://img.shields.io/github/v/release/alexhua/Aria2-Explorer.svg?color=gold)](manifest.json)

[English](./README.md) | [中文](#中文)

</div>

---

## 📖 简介

Aria2 Explorer 是一款功能强大的 Chrome 扩展，可将 Aria2 下载管理器无缝集成到浏览器中。它能自动捕获下载、监控 Aria2 状态，并提供美观的 Web UI 来管理您的下载任务。

## ✨ 核心功能

### 🎯 智能下载捕获
- **自动拦截**：根据文件大小和类型自动捕获浏览器下载
- **灵活过滤**：支持域名和文件扩展名的白名单/黑名单
- **Alt 键覆盖**：按住 Alt 键点击可绕过捕获
- **多 URL 支持**：同时处理多个下载链接

### 📊 实时监控
- **实时状态**：监控活动、等待和已完成的任务
- **速度显示**：在徽章中实时显示上传/下载速度
- **多服务器**：支持监控多个 Aria2 服务器
- **智能间隔**：根据活动状态自适应轮询

### 🎨 精美界面
- **集成 WebUI**：内置 AriaNg 界面
- **多种模式**：可作为弹窗、标签页、窗口或侧边栏打开
- **深色模式**：跟随系统主题自动切换
- **动画图标**：下载状态的视觉反馈

### 🔧 高级配置
- **多 RPC 服务器**：配置并在多个服务器间切换
- **模式匹配**：根据 URL 模式自动选择服务器
- **Cookie 支持**：自动转发 Cookie 用于需要认证的下载
- **自定义请求头**：为下载请求添加自定义请求头

### 🌐 右键菜单集成
- **快速导出**：右键点击链接发送到 Aria2
- **批量导出**：导出当前页面的所有链接
- **网站过滤**：快速添加/移除网站到白名单/黑名单
- **服务器选择**：从右键菜单选择目标服务器

### 🔔 智能通知
- **任务状态**：下载完成/错误时获得通知
- **静音模式**：可选的静音通知
- **自定义消息**：通知中显示详细上下文
- **点击操作**：点击通知打开 WebUI

## 🚀 安装

### 从 Chrome 网上应用店安装（推荐）

[![Chrome Web Store](https://aria2e.com/assets/badges/chrome-web-store.png)](https://chromewebstore.google.com/detail/mpkodccbngfoacfalldjimigbofkhgjn)

### 从 GitHub 安装
1. 访问 [Releases 页面](https://github.com/alexhua/Aria2-Explorer/releases) 下载最新的 `.crx` 文件
2. 打开 Chrome 并导航到 `chrome://extensions/`
3. 启用"开发者模式"（右上角开关）
4. 将下载的 `.crx` 文件拖拽到扩展页面完成安装

## ⚙️ 配置

### 基本设置
1. 点击扩展图标并选择"选项"
2. 配置您的 Aria2 RPC 服务器：
   - **名称**：服务器的友好名称
   - **RPC URL**：Aria2 RPC 端点（例如：`http://localhost:6800/jsonrpc`）
   - **密钥**：Aria2 RPC 密钥（如果已配置）
   - **下载位置**：默认下载目录

### 下载捕获
- **启用/禁用**：切换自动下载捕获
- **文件大小**：要捕获的最小文件大小（MB）
- **检查 Alt 点击**：检测 Alt 键以绕过捕获
- **下载前询问**：发送到 Aria2 前显示 UI

### 监控
- **启用监控**：切换 Aria2 状态监控
- **监控全部**：监控所有已配置的服务器
- **保持唤醒**：下载期间防止系统休眠
- **徽章文本**：在徽章中显示活动下载数

### 过滤
- **允许的网站**：域名白名单（每行一个）
- **阻止的网站**：域名黑名单（每行一个）
- **允许的扩展名**：文件类型白名单（例如：`zip`、`mp4`）
- **阻止的扩展名**：文件类型黑名单

## 🎯 使用方法

### 自动捕获
1. 在选项中启用"下载捕获"
2. 点击任何下载链接
3. 扩展自动发送到 Aria2

### 手动导出
1. 右键点击任何链接
2. 选择"导出到 Aria2"
3. 选择目标服务器（如果配置了多个）

### 批量导出
1. 在页面上右键点击
2. 选择"导出所有链接"
3. 扩展扫描并导出所有有效链接

### 监控状态
1. 在选项中启用"监控 Aria2"
2. 徽章显示活动下载数
3. 悬停图标查看详细状态
4. 点击图标打开 WebUI

## 🔑 键盘快捷键

- **Alt + A**：切换下载捕获
- **Alt + X**：启动 Aria2（仅 Windows）

*在 `chrome://extensions/shortcuts` 自定义快捷键*

## 🧩 外部调用

允許其他擴展使用這個擴展作為與 Aria2 的中介軟體來下載檔案。  

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

## 🏗️ 架构

扩展采用模块化架构以提高可维护性：

<details> <summary>目录内容</summary>

```
├── background.js              # Service Worker 入口
├── manifest.json              # 扩展清单文件
├── options.html               # 选项页面
├── aria2.html                 # Aria2 WebUI 页面
├── magnet.html                # 磁力链接处理页面
├── css/                       # 样式文件
│   ├── options.css            # 选项页面样式
│   ├── options.dark.css       # 深色模式样式
│   └── ...
├── images/                    # 图标资源
├── js/
│   ├── background/            # 后台模块
│   │   ├── DownloadManager.js    # 下载处理
│   │   ├── CaptureManager.js     # 捕获逻辑
│   │   ├── MonitorManager.js     # Aria2 监控
│   │   ├── NotificationManager.js # 通知管理
│   │   ├── MenuManager.js        # 右键菜单
│   │   ├── UIManager.js          # UI 管理
│   │   └── EventHandler.js       # 事件处理
│   ├── content/               # 内容脚本
│   │   ├── clickChecker.js       # 点击检测
│   │   └── exportAll.js          # 批量导出
│   ├── options/               # 选项页面模块
│   │   ├── ConfigManager.js      # 配置增删改查
│   │   ├── UIController.js       # UI 控制
│   │   ├── RpcManager.js         # RPC 列表管理
│   │   ├── options.js            # 选项页面主逻辑
│   │   └── initTheme.js          # 主题初始化
│   ├── IconUtils/             # 图标动画工具
│   │   ├── IconManager.js        # 图标管理器
│   │   ├── AnimationController.js # 动画控制
│   │   ├── Animation.js          # 动画实现
│   │   ├── TransitionManager.js  # 过渡管理
│   │   ├── Canvas.js             # Canvas 绘制
│   │   ├── Easing.js             # 缓动函数
│   │   └── Constants.js          # 常量定义
│   ├── aria2.js               # Aria2 RPC 客户端
│   ├── aria2Options.js        # Aria2 选项处理
│   ├── config.js              # 配置定义
│   ├── contextMenu.js         # 右键菜单配置
│   ├── magnet.js              # 磁力链接处理
│   ├── startAria2.js          # Aria2 启动器
│   └── utils.js               # 工具函数
├── ui/ariang/                 # 集成的 AriaNg WebUI
└── _locales/                  # 国际化语言文件
    ├── zh_CN/                 # 简体中文
    ├── en/                    # 英语
    └── ...                    # 其他语言
```

</details>

## 🤝 贡献

欢迎贡献！请阅读我们的[贡献指南](CONTRIBUTING.md)了解详情。

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📝 许可证

本项目采用 BSD 3-Clause 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Aria2](https://aria2.github.io/) - 强大的下载工具
- [AriaNg](https://github.com/mayswind/AriaNg) - Aria2 的现代 Web 前端
- 所有贡献者和用户

## 📮 支持

- **问题反馈**：[GitHub Issues](https://github.com/alexhua/Aria2-Explorer/issues)
- **官网**：[https://aria2e.com](https://aria2e.com)
- **邮箱**：通过 GitHub 联系

---

<div align="center">

**用 ❤️ 制作 by Alex Hua**

⭐ 在 GitHub 上给我们一个星标 — 这对我们很有帮助！

[🇺🇸 English Documentation](./README.md)

</div>
