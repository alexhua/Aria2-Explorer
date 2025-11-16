# 重构后的架构说明

## Background Service Worker 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      background.js                          │
│                    (Application 主类)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ 初始化所有管理器
                              ├─ 设置初始状态
                              └─ 注册事件处理器
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
┌───────▼────────┐                         ┌───────▼────────┐
│ ConfigProvider │                         │ EventHandler   │
│  配置提供者     │                         │  事件处理器     │
└───────┬────────┘                         └───────┬────────┘
        │                                           │
        │ 提供配置                                   │ 分发事件
        │                                           │
┌───────┴────────────────────────────────────────┬─┴────────┐
│                                                │          │
│  ┌──────────────────┐    ┌──────────────────┐ │          │
│  │ DownloadManager  │    │ CaptureManager   │ │          │
│  │   下载管理器      │    │   捕获管理器      │ │          │
│  └──────────────────┘    └──────────────────┘ │          │
│                                                │          │
│  ┌──────────────────┐    ┌──────────────────┐ │          │
│  │ MonitorManager   │    │NotificationMgr   │ │          │
│  │   监控管理器      │    │   通知管理器      │ │          │
│  └──────────────────┘    └──────────────────┘ │          │
│                                                │          │
│  ┌──────────────────┐    ┌──────────────────┐ │          │
│  │  MenuManager     │    │   UIManager      │ │          │
│  │  菜单管理器       │    │   UI管理器       │ │          │
│  └──────────────────┘    └──────────────────┘ │          │
│                                                │          │
└────────────────────────────────────────────────┘          │
                                                            │
                    ┌───────────────────────────────────────┘
                    │
            ┌───────▼────────┐
            │  ContextMenu   │
            │  右键菜单封装   │
            └────────────────┘
```

## Options 页面架构

```
┌─────────────────────────────────────────────────────────────┐
│                      options.js                             │
│                   (OptionsApp 主类)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ 初始化管理器
                              ├─ 绑定按钮事件
                              └─ 处理存储升级
                              │
        ┌─────────────────────┴─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌───────▼────────┐   ┌───────▼────────┐
│ ConfigManager  │   │ UIController   │   │  RpcManager    │
│  配置管理器     │   │  UI控制器      │   │  RPC管理器     │
└────────────────┘   └────────────────┘   └────────────────┘
        │                     │                     │
        │                     │                     │
        ├─ 加载/保存配置       ├─ 渲染UI            ├─ 渲染RPC列表
        ├─ 导入/导出          ├─ 收集表单数据       ├─ 验证输入
        ├─ 云端同步           ├─ 处理事件          ├─ 收集RPC数据
        └─ 重置配置           └─ 显示结果          └─ 管理安全标记
```

## 数据流向

### 下载流程

```
用户触发下载
    │
    ▼
CaptureManager.captureDownload()
    │
    ├─ 判断是否应该捕获
    │
    ▼
DownloadManager.download()
    │
    ├─ 获取RPC服务器
    ├─ 构建下载选项
    │
    ▼
DownloadManager.send2Aria()
    │
    ├─ 发送到Aria2
    │
    ▼
NotificationManager.notifyTaskStatus()
    │
    └─ 显示通知和动画
```

### 监控流程

```
MonitorManager.enable()
    │
    ▼
定时执行 MonitorManager._monitor()
    │
    ├─ 遍历所有Aria2服务器
    ├─ 获取全局状态
    ├─ 更新统计信息
    │
    ▼
更新UI
    │
    ├─ 更新徽章
    ├─ 更新标题
    ├─ 更新图标动画
    └─ 管理电源状态
```

### 配置保存流程

```
用户点击保存按钮
    │
    ▼
UIController.collectFormData()
    │
    ├─ 收集表单数据
    ├─ RpcManager.collectData()
    │
    ▼
ConfigManager.save()
    │
    ├─ 验证数据
    ├─ 更新配置对象
    │
    ▼
chrome.storage.local.set()
    │
    ▼
触发 storage.onChanged 事件
    │
    ▼
EventHandler 处理变化
    │
    └─ 重新初始化相关模块
```

## 模块依赖关系

### Background 模块依赖

```
Application
    ├─ ConfigProvider (无依赖)
    ├─ NotificationManager
    │   └─ ConfigProvider
    ├─ MonitorManager
    │   ├─ ConfigProvider
    │   ├─ NotificationManager
    │   └─ ContextMenu
    ├─ UIManager
    │   └─ ConfigProvider
    ├─ DownloadManager
    │   ├─ ConfigProvider
    │   ├─ UIManager
    │   └─ NotificationManager
    ├─ CaptureManager
    │   ├─ ConfigProvider
    │   ├─ DownloadManager
    │   └─ ContextMenu
    ├─ MenuManager
    │   ├─ ConfigProvider
    │   ├─ ContextMenu
    │   ├─ DownloadManager
    │   └─ UIManager
    └─ EventHandler
        └─ 所有管理器
```

### Options 模块依赖

```
OptionsApp
    ├─ ConfigManager (无依赖)
    ├─ RpcManager
    │   └─ ConfigManager
    └─ UIController
        ├─ ConfigManager
        └─ RpcManager
```

## 关键设计模式

### 1. 依赖注入模式
所有管理器通过构造函数接收依赖，便于测试和替换。

### 2. 单例模式
Application 和 OptionsApp 作为单例存在。

### 3. 观察者模式
通过 Chrome 的事件系统实现，EventHandler 作为中央调度器。

### 4. 策略模式
不同的下载策略（浏览器下载、Aria2下载）通过条件判断选择。

### 5. 工厂模式
RpcManager 负责创建和管理 RPC 项。

## 扩展性考虑

### 添加新功能
1. 创建新的管理器类
2. 在 Application 中初始化
3. 在 EventHandler 中注册相关事件
4. 通过 ConfigProvider 访问配置

### 修改现有功能
1. 定位到相应的管理器
2. 修改该管理器的方法
3. 不影响其他模块

### 添加新的配置项
1. 在 config.js 中添加默认值
2. 在 ConfigManager 中处理
3. 在 UIController 中渲染
4. 在相应的管理器中使用

## 性能优化

1. **懒加载**：只在需要时初始化模块
2. **事件委托**：使用事件委托减少监听器数量
3. **防抖节流**：对频繁触发的事件进行优化
4. **缓存**：ConfigProvider 缓存配置，减少存储访问

## 错误处理

1. **模块级错误处理**：每个模块独立处理错误
2. **全局错误捕获**：Application 捕获初始化错误
3. **用户友好提示**：通过 NotificationManager 显示错误信息
4. **日志记录**：使用 console.warn/error 记录错误

## 测试策略

1. **单元测试**：测试每个管理器的独立功能
2. **集成测试**：测试模块间的交互
3. **端到端测试**：测试完整的用户流程
4. **回归测试**：确保重构后功能不变
