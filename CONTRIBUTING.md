# Contributing to Aria2 Explorer

Thank you for your interest in contributing to Aria2 Explorer! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Submitting Changes](#submitting-changes)
- [Testing](#testing)

## 📜 Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please be respectful and constructive in all interactions.

## 🚀 Getting Started

### Prerequisites

- Google Chrome or Chromium-based browser
- Basic knowledge of JavaScript, Chrome Extension APIs
- Git for version control

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Aria2-Explorer.git
   cd Aria2-Explorer
   ```

2. **Load Extension**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory

3. **Make Changes**
   - Edit files in your preferred editor
   - Reload extension to see changes

## 📁 Project Structure

```
Aria2-Explorer/
├── background.js              # Service worker entry point
├── js/
│   ├── background/           # Background service modules
│   │   ├── DownloadManager.js   # Download handling
│   │   ├── CaptureManager.js    # Download capture logic
│   │   ├── MonitorManager.js    # Aria2 monitoring
│   │   ├── NotificationManager.js # Notification handling
│   │   ├── MenuManager.js       # Context menu management
│   │   ├── UIManager.js         # UI management
│   │   └── EventHandler.js      # Event handling
│   ├── options/              # Options page modules
│   │   ├── ConfigManager.js     # Config CRUD operations
│   │   ├── UIController.js      # UI control
│   │   └── RpcManager.js        # RPC list management
│   ├── content/              # Content scripts
│   ├── IconUtils/            # Icon utilities
│   ├── aria2.js              # Aria2 RPC client
│   ├── config.js             # Default configurations
│   ├── utils.js              # Utility functions
│   └── contextMenu.js        # Context menu wrapper
├── ui/ariang/               # Integrated AriaNg WebUI
├── css/                     # Stylesheets
├── images/                  # Icons and images
├── _locales/                # Internationalization
├── options.html             # Options page
└── manifest.json            # Extension manifest
```

## 💻 Coding Guidelines

### JavaScript Style

- Use ES6+ features (classes, arrow functions, async/await)
- Use meaningful variable and function names
- Add JSDoc comments for public methods
- Keep functions small and focused
- Use `const` by default, `let` when reassignment is needed

### Module Organization

- Each module should have a single responsibility
- Use dependency injection for better testability
- Export only what's necessary
- Keep private methods prefixed with `_`

### Example

```javascript
/**
 * ExampleManager - Handles example functionality
 */
import { ConfigService } from "../services/ConfigService.js";

export class ExampleManager {
    constructor(otherDependency) {
        this.configService = ConfigService.getInstance();
        this.otherDependency = otherDependency;
    }

    /**
     * Public method with clear documentation
     * @param {string} param - Parameter description
     * @returns {Promise<boolean>} - Return value description
     */
    async publicMethod(param) {
        const config = this.configService.get();
        return await this._privateMethod(param, config);
    }

    /**
     * Private helper method
     */
    _privateMethod(param, config) {
        // Implementation
    }
}
```

### Comments

- Write comments in English
- Use JSDoc for public APIs
- Explain "why" not "what" in inline comments
- Keep comments up-to-date with code changes

### Naming Conventions

- **Classes**: PascalCase (e.g., `DownloadManager`)
- **Functions/Methods**: camelCase (e.g., `handleDownload`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Private methods**: Prefix with `_` (e.g., `_internalMethod`)
- **Files**: PascalCase for classes (e.g., `DownloadManager.js`)

## 📝 Submitting Changes

### Commit Messages

Follow conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(download): add support for magnet links
fix(monitor): correct badge count calculation
docs(readme): update installation instructions
```

### Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, documented code
   - Follow coding guidelines
   - Test your changes

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

4. **Push to Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Go to GitHub and create a PR
   - Provide clear description
   - Reference related issues
   - Wait for review

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Comments are in English
- [ ] All functions have JSDoc comments
- [ ] Changes have been tested
- [ ] No console errors in browser
- [ ] Extension loads and works correctly
- [ ] Commit messages follow convention
- [ ] PR description is clear and complete

## 🧪 Testing

### Manual Testing

1. **Load Extension**
   - Load unpacked extension in Chrome
   - Check for console errors

2. **Test Features**
   - Download capture
   - Aria2 monitoring
   - Context menus
   - Options page
   - Notifications

3. **Test Edge Cases**
   - Large files
   - Multiple downloads
   - Network errors
   - Invalid configurations

### Testing Checklist

- [ ] Extension loads without errors
- [ ] Download capture works
- [ ] Monitoring displays correct status
- [ ] Context menus appear and function
- [ ] Options save and load correctly
- [ ] Notifications appear as expected
- [ ] No memory leaks
- [ ] Works in incognito mode

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**:
   - Browser version
   - Extension version
   - Operating system
6. **Screenshots**: If applicable
7. **Console Logs**: Any error messages

## 💡 Feature Requests

When requesting features:

1. **Use Case**: Describe the problem you're trying to solve
2. **Proposed Solution**: Your idea for solving it
3. **Alternatives**: Other solutions you've considered
4. **Additional Context**: Any other relevant information

## 📚 Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Aria2 Documentation](https://aria2.github.io/manual/en/html/)
- [AriaNg Project](https://github.com/mayswind/AriaNg)

## 🤝 Community

- **Issues**: [GitHub Issues](https://github.com/alexhua/Aria2-Explorer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/alexhua/Aria2-Explorer/discussions)
- **Website**: [https://aria2e.com](https://aria2e.com)

## 📄 License

By contributing, you agree that your contributions will be licensed under the BSD 3-Clause License.

---

Thank you for contributing to Aria2 Explorer! 🎉
