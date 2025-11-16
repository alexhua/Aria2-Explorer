# 重构后代码快速开始指南

## 文件结构概览

```
Aria2Explorer/
├── background.js                    # Background Service Worker 主入口
├── background.js.backup             # 原始文件备份
├── js/
│   ├── options.js                   # Options 页面主入口
│   ├── options.js.backup            # 原始文件备份
│   ├── background/                  # Background 模块目录
│   │   ├── ConfigProvider.js        # 配置提供者
│   │   ├── DownloadManager.js       # 下载管理器
│   │   ├── CaptureManager.js        # 捕获管理器
│   │   ├── MonitorManager.js        # 监控管理器
│   │   ├── NotificationManager.js   # 通知管理器
│   │   ├── MenuManager.js           # 菜单管理器
│   │   ├── UIManager.js             # UI管理器
│   │   └── EventHandler.js          # 事件处理器
│   └── options/                     # Options 模块目录
│       ├── ConfigManager.js         # 配置管理器
│       ├── UIController.js          # UI控制器
│       └── RpcManager.js            # RPC管理器
├── REFACTORING.md                   # 重构说明
├── ARCHITECTURE.md                  # 架构说明
├── MIGRATION_GUIDE.md               # 迁移指南
├── REFACTORING_SUMMARY.md           # 重构总结
└── QUICK_START.md                   # 本文档
```

## 快速理解新架构

### Background Service Worker

**主入口**: `background.js`
- 创建 Application 实例
- 初始化所有管理器
- 注册事件处理器

**核心管理器**:
1. **ConfigProvider** - 提供配置访问
2. **DownloadManager** - 处理下载
3. **CaptureManager** - 管理捕获
4. **MonitorManager** - 监控Aria2
5. **NotificationManager** - 处理通知
6. **MenuManager** - 管理菜单
7. **UIManager** - 管理UI
8. **EventHandler** - 处理事件

### Options 页面

**主入口**: `js/options.js`
- 创建 OptionsApp 实例
- 初始化管理器
- 绑定按钮事件

**核心管理器**:
1. **ConfigManager** - 管理配置
2. **UIController** - 控制UI
3. **RpcManager** - 管理RPC列表

## 如何添加新功能

### 在 Background 中添加新功能

1. **创建新的管理器** (如果需要)
```javascript
// js/background/NewManager.js
export class NewManager {
    constructor(configProvider, otherDependencies) {
        this.configProvider = configProvider;
        // ...
    }
    
    newMethod() {
        // 实现新功能
    }
}
```

2. **在 Application 中初始化**
```javascript
// background.js
import { NewManager } from "./js/background/NewManager.js";

class Application {
    async init() {
        // ...
        const newManager = new NewManager(configProvider, otherDeps);
        this.managers.newManager = newManager;
        // ...
    }
}
```

3. **在 EventHandler 中注册事件** (如果需要)
```javascript
// js/background/EventHandler.js
_registerNewListeners() {
    chrome.someAPI.onEvent.addListener(() => {
        this.managers.newManager.newMethod();
    });
}
```

### 在 Options 中添加新功能

1. **在 ConfigManager 中添加配置处理**
```javascript
// js/options/ConfigManager.js
async newConfigMethod() {
    // 处理新配置
}
```

2. **在 UIController 中添加UI控制**
```javascript
// js/options/UIController.js
_handleNewFeature() {
    // 处理UI交互
}
```

3. **在 OptionsApp 中绑定事件**
```javascript
// js/options.js
_bindButtonEvents() {
    $("#newButton").on("click", () => {
        this.configManager.newConfigMethod();
    });
}
```

## 如何修改现有功能

### 修改下载逻辑

1. 找到 `js/background/DownloadManager.js`
2. 修改相应的方法
3. 不影响其他模块

### 修改监控逻辑

1. 找到 `js/background/MonitorManager.js`
2. 修改相应的方法
3. 不影响其他模块

### 修改配置保存逻辑

1. 找到 `js/options/ConfigManager.js`
2. 修改 `save()` 方法
3. 不影响其他模块

## 常见任务

### 获取配置

```javascript
// 在 Background 中
const config = this.managers.configProvider.getConfig();

// 在 Options 中
const config = this.configManager.getConfig();
```

### 更新配置

```javascript
// 在 Background 中
this.managers.configProvider.updateConfig({ key: value });

// 在 Options 中
await this.configManager.save(formData);
```

### 显示通知

```javascript
// 在 Background 中
this.managers.notificationManager.notifyTaskStatus({
    method: "aria2.onExportSuccess",
    source: aria2,
    gid: gid,
    contextMessage: message
});
```

### 启动 WebUI

```javascript
// 在 Background 中
await this.managers.uiManager.launchUI(tab);
```

### 处理下载

```javascript
// 在 Background 中
await this.managers.downloadManager.download(downloadItem, rpcItem);
```

## 调试技巧

### 查看管理器状态

```javascript
// 在浏览器控制台中
// 注意：需要在 background.js 中暴露 app 实例
console.log(app.managers);
```

### 查看配置

```javascript
// 在浏览器控制台中
chrome.storage.local.get(console.log);
```

### 查看事件监听器

```javascript
// 在浏览器控制台中
chrome.downloads.onDeterminingFilename.hasListeners();
```

## 测试流程

### 1. 基本功能测试

```bash
# 加载扩展到浏览器
1. 打开 chrome://extensions/
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目目录
```

### 2. 下载测试

```bash
1. 访问任意网站
2. 点击下载链接
3. 检查是否被捕获
4. 检查是否发送到Aria2
```

### 3. 监控测试

```bash
1. 启用Aria2监控
2. 检查徽章显示
3. 检查通知功能
4. 检查图标动画
```

### 4. 配置测试

```bash
1. 打开选项页面
2. 修改配置
3. 保存配置
4. 重新加载扩展
5. 检查配置是否保存
```

## 回滚到原版本

如果需要回滚到重构前的版本：

```bash
# Windows PowerShell
Copy-Item background.js.backup background.js -Force
Copy-Item js/options.js.backup js/options.js -Force

# 删除新模块目录
Remove-Item js/background -Recurse -Force
Remove-Item js/options -Recurse -Force
```

## 常见问题

### Q: 为什么要重构？
A: 提高代码可维护性、可扩展性和可测试性。

### Q: 重构后性能会下降吗？
A: 不会，性能影响微乎其微，在可接受范围内。

### Q: 原有功能会受影响吗？
A: 不会，所有原有功能保持不变。

### Q: 如何学习新架构？
A: 阅读 ARCHITECTURE.md 和 MIGRATION_GUIDE.md。

### Q: 如何贡献代码？
A: 遵循新的模块化架构，在相应的管理器中添加功能。

## 相关文档

- **REFACTORING.md** - 详细的重构说明
- **ARCHITECTURE.md** - 架构设计文档
- **MIGRATION_GUIDE.md** - 新旧代码对照
- **REFACTORING_SUMMARY.md** - 重构总结

## 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- 项目主页

---

**祝你使用愉快！** 🚀
