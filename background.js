/**
 * Background Service Worker - 主入口
 * 重构后的模块化架构
 */
import ContextMenu from "./js/contextMenu.js";
import { ConfigProvider } from "./js/background/ConfigProvider.js";
import { DownloadManager } from "./js/background/DownloadManager.js";
import { CaptureManager } from "./js/background/CaptureManager.js";
import { MonitorManager } from "./js/background/MonitorManager.js";
import { NotificationManager } from "./js/background/NotificationManager.js";
import { MenuManager } from "./js/background/MenuManager.js";
import { UIManager } from "./js/background/UIManager.js";
import { EventHandler } from "./js/background/EventHandler.js";

/**
 * 应用程序类 - 统一管理所有模块
 */
class Application {
    constructor() {
        this.managers = {};
        this.initialized = false;
    }

    /**
     * 初始化应用程序
     */
    async init() {
        if (this.initialized) return;

        // 创建上下文菜单实例
        const contextMenus = new ContextMenu();

        // 创建配置提供者
        const configProvider = new ConfigProvider();
        await configProvider.init();

        // 创建各个管理器
        const notificationManager = new NotificationManager(configProvider);
        const monitorManager = new MonitorManager(configProvider, notificationManager, contextMenus);
        const uiManager = new UIManager(configProvider);
        const downloadManager = new DownloadManager(configProvider, uiManager, notificationManager);
        const captureManager = new CaptureManager(configProvider, downloadManager, contextMenus);
        const menuManager = new MenuManager(configProvider, contextMenus, downloadManager, uiManager);

        // 保存管理器引用
        this.managers = {
            configProvider,
            contextMenus,
            downloadManager,
            captureManager,
            monitorManager,
            notificationManager,
            menuManager,
            uiManager
        };

        // 初始化远程Aria2列表
        monitorManager.initRemoteAria2List();
        configProvider.setRemoteAria2List(monitorManager.getRemoteAria2List());

        // 设置初始状态
        await this._setupInitialState();

        // 创建并注册事件处理器
        const eventHandler = new EventHandler(this.managers);
        eventHandler.registerAll();

        this.initialized = true;
        console.log("Aria2 Explorer initialized successfully");
    }

    /**
     * 设置初始状态
     */
    async _setupInitialState() {
        const config = this.managers.configProvider.getConfig();

        // 设置popup
        const popupUrl = config.webUIOpenStyle === "popup" 
            ? chrome.runtime.getURL('ui/ariang/popup.html') 
            : '';
        await chrome.action.setPopup({ popup: popupUrl });

        // 创建菜单
        this.managers.menuManager.createAllMenus();

        // 启用/禁用捕获
        if (config.integration) {
            this.managers.captureManager.enable();
        } else {
            this.managers.captureManager.disable();
        }

        // 启用/禁用监控
        if (config.monitorAria2) {
            this.managers.monitorManager.enable();
        } else {
            this.managers.monitorManager.disable();
        }

        // 设置卸载URL
        const uninstallUrl = config.captureMagnet 
            ? "https://github.com/alexhua/Aria2-Explore/issues/98" 
            : '';
        await chrome.runtime.setUninstallURL(uninstallUrl);

        // 设置侧边栏行为
        await chrome.sidePanel.setPanelBehavior({ 
            openPanelOnActionClick: config.webUIOpenStyle === "sidePanel" 
        });
    }
}

// 创建并初始化应用程序
const app = new Application();
app.init().catch(error => {
    console.error("Failed to initialize Aria2 Explorer:", error);
});
