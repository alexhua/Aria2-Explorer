# Aria2 Suite 重构版本

这是 Aria2 Suite 的重构版本，采用模块化架构，将 HTML、CSS、JavaScript 分离，便于维护和扩展。

## 项目结构

```
├── index.html              # 主HTML文件
├── css/                    # 样式文件目录
│   ├── variables.css       # CSS变量定义
│   ├── base.css           # 基础样式和重置
│   ├── components.css     # 组件样式
│   ├── layout.css         # 布局样式
│   ├── responsive.css     # 响应式样式
│   └── themes.css         # 主题样式
├── js/                     # JavaScript文件目录
│   ├── theme-manager.js    # 主题管理器
│   ├── language-manager.js # 语言管理器
│   ├── ui-components.js    # UI组件管理器
│   └── main.js            # 主应用文件
├── data/                   # 数据文件目录
│   ├── en.json            # 英文翻译
│   └── zh.json            # 中文翻译
└── README.md              # 项目说明
```

## 架构特点

### 🎨 模块化CSS架构
- **variables.css** - 统一的设计系统变量
- **base.css** - 基础样式和重置
- **components.css** - 可复用的组件样式
- **layout.css** - 页面布局样式
- **responsive.css** - 响应式断点样式
- **themes.css** - 主题切换样式

### 🔧 模块化JavaScript架构
- **ThemeManager** - 主题切换管理（浅色/深色/跟随系统）
- **LanguageManager** - 多语言管理（中英文切换）
- **UIComponents** - UI交互组件管理
- **Aria2SuiteApp** - 主应用协调器

### 📊 数据驱动的多语言
- JSON格式的翻译文件
- 支持嵌套键值结构
- 异步加载翻译数据
- 降级到内联翻译

## 使用方法

### 直接打开
双击 `index.html` 文件即可在浏览器中打开。

### 本地服务器（推荐）
```bash
# 使用Python
python -m http.server 8000

# 使用Node.js
npx serve .

# 使用PHP
php -S localhost:8000
```

然后访问 `http://localhost:8000`

## 功能特性

### 🎨 主题系统
- **浅色主题** - 明亮清爽的界面
- **深色主题** - 护眼的深色界面
- **跟随系统** - 自动跟随操作系统设置
- 平滑的主题切换动画
- 主题偏好本地存储

### 🌍 多语言支持
- 中英文双语切换
- 基于JSON的翻译系统
- 支持嵌套翻译键
- 浏览器语言自动检测
- 语言偏好本地存储

### 📱 响应式设计
- 移动优先的设计理念
- 流畅的断点过渡
- 触摸友好的交互
- 现代化的视觉效果

### ⚡ 性能优化
- 模块化加载
- CSS变量系统
- 防抖和节流优化
- 懒加载动画## 开发
指南

### 添加新的翻译
1. 在 `data/en.json` 和 `data/zh.json` 中添加新的键值对
2. 在HTML中使用 `data-i18n="your.key"` 属性
3. 调用 `languageManager.applyLanguage()` 应用翻译

### 添加新的主题
1. 在 `css/themes.css` 中定义新主题的CSS变量
2. 在 `js/theme-manager.js` 中添加主题选项
3. 更新主题切换逻辑

### 添加新的组件
1. 在 `css/components.css` 中定义组件样式
2. 在 `js/ui-components.js` 中添加交互逻辑
3. 在HTML中使用相应的类名

### 自定义样式
所有样式变量都在 `css/variables.css` 中定义，包括：
- 颜色系统
- 字体系统
- 间距系统
- 阴影和圆角
- 动画时长

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 部署

### 静态托管
可以直接部署到任何静态网站托管服务：
- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

### CDN优化
建议将CSS和JS文件上传到CDN以提高加载速度。

## 维护指南

### 代码组织
- 每个模块职责单一
- 使用ES6+语法
- 遵循命名约定
- 添加适当的注释

### 性能监控
- 使用浏览器开发者工具监控性能
- 定期检查包大小
- 优化关键渲染路径

### 测试
- 在不同设备上测试响应式布局
- 测试主题切换功能
- 验证多语言显示
- 检查浏览器兼容性

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

**版本优势**：模块化架构，便于维护和扩展，适合长期开发和团队协作！🚀