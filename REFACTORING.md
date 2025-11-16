# 项目重构说明

## 重构概述

本次重构主要针对 `background.js` 和 options 页面相关代码，采用模块化架构，提高代码的可维护性和可扩展性。

## 重构原则

1. **单一职责原则**：每个模块只负责一个特定的功能领域
2. **依赖注入**：通过构造函数注入依赖，降低模块间耦合
3. **关注点分离**：将业务逻辑、UI控制、数据管理分离
4. **保持原有功能**：确保所有原有功能不变

## 新的文件结构

### Background 模块

```
js/background/
├── ConfigProvider.js       # 配置提供者，统一管理配置访问
├── DownloadManager.js      # 下载管理器，处理所有下载相关逻辑
├── CaptureManager.js       # 捕获管理器，处理下载捕获功能
├── MonitorManager.js       # 监控管理器，处理Aria2监控功能
├── NotificationManager.js  # 通知管理器，处理所有通知相关逻辑
├── MenuManager.js          # 菜单管理器，处理右键菜单相关逻辑
├── UIManager.js            # UI管理器，处理UI启动和管理
└── EventHandler.js         # 事件处理器，统一管理所有Chrome事件监听
```

### Options 模块

```
js/options/
├── ConfigManager.js        # 配置管理器，处理配置的增删改查
├── UIController.js         # UI控制器，处理UI渲染和交互
└── RpcManager.js           # RPC管理器，处理RPC列表的管理
```

### 主入口文件

- `background.js` - Background Service Worker 主入口（精简版）
- `js/options.js` - Options 页面主入口（精简版）

## 模块职责说明

### Background 模块

#### ConfigProvider
- 提供统一的配置访问接口
- 管理配置的初始化和更新
- 维护远程Aria2列表的引用

#### DownloadManager
- 处理下载任务的创建和执行
- 管理与Aria2的通信
- 处理下载选项的构建
- 获取匹配的RPC服务器

#### CaptureManager
- 管理下载捕获的启用/禁用
- 判断是否应该捕获下载
- 处理捕获提醒
- 管理Alt键状态

#### MonitorManager
- 管理Aria2监控的启用/禁用
- 执行定期监控任务
- 更新徽章和标题
- 管理电源状态
- 处理监控间隔调整

#### NotificationManager
- 处理任务状态通知
- 管理图标动画
- 构建通知消息
- 获取任务上下文信息

#### MenuManager
- 创建和管理右键菜单
- 处理菜单点击事件
- 更新菜单状态
- 管理网站过滤列表

#### UIManager
- 启动和管理WebUI
- 处理侧边栏
- 构建WebUI URL
- 管理窗口和标签页

#### EventHandler
- 统一注册所有Chrome事件监听器
- 分发事件到相应的管理器
- 处理存储变化
- 管理扩展生命周期事件

### Options 模块

#### ConfigManager
- 管理配置的加载、保存、重置
- 处理配置的导入/导出
- 管理云端同步
- 处理AriaNG配置

#### UIController
- 管理UI的初始化和渲染
- 处理表单数据的填充和收集
- 管理颜色模式
- 处理键盘快捷键
- 显示操作结果

#### RpcManager
- 管理RPC列表的渲染
- 处理RPC项的添加和验证
- 管理安全标记
- 收集RPC列表数据

## 重构优势

### 1. 更好的代码组织
- 每个模块职责清晰，易于理解和维护
- 相关功能集中在一起，便于查找和修改

### 2. 降低耦合度
- 通过依赖注入，模块间的依赖关系更加明确
- 便于单独测试和替换模块

### 3. 提高可扩展性
- 新增功能只需添加新模块或扩展现有模块
- 不会影响其他模块的功能

### 4. 更好的错误处理
- 每个模块可以独立处理错误
- 错误不会轻易传播到其他模块

### 5. 便于维护
- 代码结构清晰，新开发者容易上手
- 修改某个功能时，只需关注相关模块

## 向后兼容

- 所有原有功能保持不变
- API接口保持一致
- 配置格式保持兼容
- 用户体验无变化

## 备份文件

重构过程中创建了以下备份文件：
- `background.js.backup` - 原始 background.js
- `js/options.js.backup` - 原始 options.js

如需回滚，可以使用这些备份文件。

## 未修改的文件

按照要求，以下文件保持不变：
- `ui/` 目录下的所有文件
- `js/contextMenu.js`
- `js/content/` 目录下的所有文件
- `js/IconUtils/` 目录下的所有文件
- `js/aria2.js`

## 测试建议

重构后建议测试以下功能：

### Background 功能
1. 下载捕获功能
2. Aria2监控功能
3. 右键菜单功能
4. 通知功能
5. WebUI启动功能
6. 快捷键功能

### Options 页面功能
1. 配置保存和加载
2. RPC列表管理
3. 配置导入/导出
4. 云端同步
5. 颜色模式切换
6. 表单验证

## 注意事项

1. 重构后的代码使用ES6模块语法，需要在支持的环境中运行
2. 所有模块都使用 `export` 和 `import` 语句
3. 保持了原有的事件监听和处理逻辑
4. 配置管理采用了统一的接口

## 后续优化建议

1. 添加单元测试
2. 添加TypeScript类型定义
3. 进一步优化错误处理
4. 添加日志系统
5. 优化性能监控
