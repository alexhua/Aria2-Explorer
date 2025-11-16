# 代码迁移对照指南

本文档帮助开发者理解重构前后代码的对应关系。

## Background.js 函数迁移对照表

| 原函数/变量 | 新位置 | 说明 |
|------------|--------|------|
| `download()` | `DownloadManager.download()` | 下载函数 |
| `send2Aria()` | `DownloadManager.send2Aria()` | 发送到Aria2 |
| `getCookies()` | `DownloadManager._getCookies()` | 获取Cookies（私有方法） |
| `getRpcServer()` | `DownloadManager.getRpcServer()` | 获取RPC服务器 |
| `matchRule()` | `DownloadManager._matchRule()` | 匹配规则（私有方法） |
| `shouldCapture()` | `CaptureManager._shouldCapture()` | 判断是否捕获（私有方法） |
| `enableCapture()` | `CaptureManager.enable()` | 启用捕获 |
| `disableCapture()` | `CaptureManager.disable()` | 禁用捕获 |
| `captureDownload()` | `CaptureManager._captureDownload()` | 捕获下载（私有方法） |
| `enableMonitor()` | `MonitorManager.enable()` | 启用监控 |
| `disableMonitor()` | `MonitorManager.disable()` | 禁用监控 |
| `monitorAria2()` | `MonitorManager._monitor()` | 监控Aria2（私有方法） |
| `notifyTaskStatus()` | `NotificationManager.notifyTaskStatus()` | 通知任务状态 |
| `launchUI()` | `UIManager.launchUI()` | 启动UI |
| `openInWindow()` | `UIManager._openInWindow()` | 在窗口中打开（私有方法） |
| `resetSidePanel()` | `UIManager.resetSidePanel()` | 重置侧边栏 |
| `createOptionMenu()` | `MenuManager._createOptionMenu()` | 创建选项菜单（私有方法） |
| `createContextMenu()` | `MenuManager._createContextMenu()` | 创建上下文菜单（私有方法） |
| `createRpcOptionsMenu()` | `MenuManager._createRpcOptionsMenu()` | 创建RPC选项菜单（私有方法） |
| `updateOptionMenu()` | `MenuManager.updateOptionMenu()` | 更新选项菜单 |
| `onMenuClick()` | `MenuManager.handleMenuClick()` | 处理菜单点击 |
| `updateAllowedSites()` | `MenuManager._updateAllowedSites()` | 更新允许的网站（私有方法） |
| `updateBlockedSites()` | `MenuManager._updateBlockedSites()` | 更新阻止的网站（私有方法） |
| `exportAllLinks()` | `MenuManager._exportAllLinksScript()` | 导出所有链接脚本（私有方法） |
| `registerAllListeners()` | `EventHandler.registerAll()` | 注册所有监听器 |
| `init()` | `Application.init()` | 初始化 |
| `initRemoteAria2()` | `MonitorManager.initRemoteAria2List()` | 初始化远程Aria2 |
| `initClickChecker()` | `EventHandler._initClickChecker()` | 初始化点击检查器（私有方法） |
| `Configs` | `ConfigProvider` | 配置对象 |
| `AltKeyPressed` | `CaptureManager.altKeyPressed` | Alt键状态 |
| `CurrentWindowId` | `UIManager.currentWindowId` | 当前窗口ID |
| `CurrentTabUrl` | `CaptureManager.currentTabUrl` / `MenuManager.currentTabUrl` | 当前标签页URL |
| `MonitorId` | `MonitorManager.monitorId` | 监控ID |
| `MonitorInterval` | `MonitorManager.monitorInterval` | 监控间隔 |
| `RemoteAria2List` | `MonitorManager.remoteAria2List` | 远程Aria2列表 |
| `IconAnimController` | `NotificationManager.iconAnimController` | 图标动画控制器 |
| `ContextMenus` | `Application.managers.contextMenus` | 上下文菜单 |

## Options.js 函数迁移对照表

| 原函数/变量 | 新位置 | 说明 |
|------------|--------|------|
| `Configs.init()` | `OptionsApp.init()` | 初始化 |
| `Configs.save()` | `ConfigManager.save()` | 保存配置 |
| `Configs.reset()` | `ConfigManager.reset()` | 重置配置 |
| `Configs.upload()` | `ConfigManager.upload()` | 上传配置 |
| `Configs.download()` | `ConfigManager.download()` | 下载配置 |
| `Configs.export()` | `ConfigManager.export()` | 导出配置 |
| `Configs.import()` | `ConfigManager.import()` | 导入配置 |
| `Configs.handleConfigImport()` | 集成到 `ConfigManager.import()` | 处理配置导入 |
| `Configs.notifySyncResult()` | `UIController.showResult()` | 显示同步结果 |
| `Configs.notifyImportExportResult()` | `UIController.showResult()` | 显示导入导出结果 |
| `setColorMode()` | `UIController._setColorMode()` | 设置颜色模式（私有方法） |
| `markRpc()` | `RpcManager._markRpc()` | 标记RPC（私有方法） |
| `isRpcListChanged()` | `ConfigManager.isRpcListChanged()` | 检查RPC列表是否改变 |
| `toggleMagnetHandler()` | `UIController._toggleMagnetHandler()` | 切换磁力链接处理器（私有方法） |
| `upgradeStorage()` | `OptionsApp._upgradeStorage()` | 升级存储（私有方法） |
| RPC列表渲染逻辑 | `RpcManager.render()` | RPC列表渲染 |
| RPC项验证逻辑 | `RpcManager._validateInput()` | RPC项验证（私有方法） |
| 表单数据收集 | `UIController.collectFormData()` | 收集表单数据 |
| 依赖关系设置 | `UIController._setupDependencies()` | 设置依赖关系（私有方法） |
| 事件绑定 | `UIController._bindEvents()` | 绑定事件（私有方法） |

## 使用示例对比

### 示例 1: 下载文件

**重构前:**
```javascript
// 在 background.js 中直接调用
download(downloadItem, rpcItem);
```

**重构后:**
```javascript
// 通过 DownloadManager 调用
app.managers.downloadManager.download(downloadItem, rpcItem);
```

### 示例 2: 启用捕获

**重构前:**
```javascript
// 在 background.js 中直接调用
enableCapture();
```

**重构后:**
```javascript
// 通过 CaptureManager 调用
app.managers.captureManager.enable();
```

### 示例 3: 保存配置

**重构前:**
```javascript
// 在 options.js 中
Configs.save();
```

**重构后:**
```javascript
// 通过 ConfigManager 调用
const formData = uiController.collectFormData();
await configManager.save(formData);
```

### 示例 4: 获取配置

**重构前:**
```javascript
// 直接访问全局变量
if (Configs.integration) {
    // ...
}
```

**重构后:**
```javascript
// 通过 ConfigProvider 获取
const config = configProvider.getConfig();
if (config.integration) {
    // ...
}
```

## 访问模式变化

### Background 中访问其他模块

**重构前:**
```javascript
// 全局函数直接调用
download(item);
enableCapture();
monitorAria2();
```

**重构后:**
```javascript
// 通过管理器调用
this.managers.downloadManager.download(item);
this.managers.captureManager.enable();
this.managers.monitorManager._monitor();
```

### Options 中访问配置

**重构前:**
```javascript
// 直接访问全局对象
Configs.rpcList
Configs.integration
```

**重构后:**
```javascript
// 通过 ConfigManager 获取
const config = this.configManager.getConfig();
config.rpcList
config.integration
```

## 事件处理变化

### 重构前
```javascript
// 事件监听器分散在各处
chrome.action.onClicked.addListener(launchUI);
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    // ...
});
```

### 重构后
```javascript
// 统一在 EventHandler 中注册
class EventHandler {
    registerAll() {
        this._registerActionListeners();
        this._registerTabListeners();
        // ...
    }
    
    _registerActionListeners() {
        chrome.action.onClicked.addListener((tab) => {
            this.managers.uiManager.launchUI(tab);
        });
    }
}
```

## 配置管理变化

### 重构前
```javascript
// 配置作为全局对象
var Configs = {
    integration: true,
    // ...
};

// 直接修改
Configs.integration = false;
```

### 重构后
```javascript
// 配置通过 ConfigProvider 管理
class ConfigProvider {
    constructor() {
        this.config = { ...DefaultConfigs };
    }
    
    getConfig() {
        return this.config;
    }
    
    updateConfig(updates) {
        Object.assign(this.config, updates);
    }
}

// 通过方法访问和修改
const config = configProvider.getConfig();
configProvider.updateConfig({ integration: false });
```

## 模块间通信

### 重构前
```javascript
// 直接调用全局函数
function captureDownload(item) {
    if (shouldCapture(item)) {
        download(item, getRpcServer(item.url));
    }
}
```

### 重构后
```javascript
// 通过依赖注入的管理器通信
class CaptureManager {
    constructor(configProvider, downloadManager, contextMenus) {
        this.downloadManager = downloadManager;
        // ...
    }
    
    async _captureDownload(item) {
        if (this._shouldCapture(item)) {
            const rpcItem = this.downloadManager.getRpcServer(item.url);
            await this.downloadManager.download(item, rpcItem);
        }
    }
}
```

## 初始化流程变化

### 重构前
```javascript
// 立即执行函数
(function main() {
    init();
    registerAllListeners();
})()
```

### 重构后
```javascript
// 应用类管理
class Application {
    async init() {
        // 创建管理器
        // 设置初始状态
        // 注册事件
    }
}

const app = new Application();
app.init().catch(error => {
    console.error("Failed to initialize:", error);
});
```

## 错误处理改进

### 重构前
```javascript
function download(item) {
    try {
        // ...
    } catch (error) {
        console.error(error);
    }
}
```

### 重构后
```javascript
class DownloadManager {
    async download(item) {
        try {
            // ...
        } catch (error) {
            console.error("DownloadManager: Download failed", error);
            this.notificationManager.notifyTaskStatus({
                method: "aria2.onExportError",
                contextMessage: error.message
            });
            return false;
        }
    }
}
```

## 测试友好性改进

### 重构前
```javascript
// 难以测试，依赖全局状态
function shouldCapture(item) {
    if (AltKeyPressed) return false;
    if (Configs.integration) {
        // ...
    }
}
```

### 重构后
```javascript
// 易于测试，依赖注入
class CaptureManager {
    constructor(configProvider, downloadManager, contextMenus) {
        this.configProvider = configProvider;
        this.altKeyPressed = false;
    }
    
    _shouldCapture(item) {
        if (this.altKeyPressed) return false;
        const config = this.configProvider.getConfig();
        if (config.integration) {
            // ...
        }
    }
}

// 测试时可以注入 mock 对象
const mockConfigProvider = {
    getConfig: () => ({ integration: true })
};
const captureManager = new CaptureManager(mockConfigProvider, null, null);
```

## 注意事项

1. **私有方法**: 以 `_` 开头的方法是私有方法，不应从外部调用
2. **依赖注入**: 所有管理器通过构造函数接收依赖
3. **配置访问**: 统一通过 ConfigProvider 访问配置
4. **事件处理**: 统一在 EventHandler 中注册
5. **错误处理**: 每个模块独立处理错误并记录日志

## 迁移检查清单

- [ ] 所有原有功能正常工作
- [ ] 下载捕获功能正常
- [ ] Aria2监控功能正常
- [ ] 右键菜单功能正常
- [ ] 通知功能正常
- [ ] WebUI启动功能正常
- [ ] Options页面功能正常
- [ ] 配置保存/加载正常
- [ ] 配置导入/导出正常
- [ ] 云端同步功能正常
- [ ] 快捷键功能正常
- [ ] 颜色模式切换正常
