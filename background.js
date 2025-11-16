/**
 * Background Service Worker - Main entry point
 * Refactored modular architecture
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
 * Application class - Manages all modules
 */
class Application {
    constructor() {
        this.managers = {};
        this.initialized = false;
    }

    /**
     * Initialize application
     */
    async init() {
        if (this.initialized) return;

        // Create context menu instance
        const contextMenus = new ContextMenu();

        // Create config provider
        const configProvider = new ConfigProvider();
        await configProvider.init();

        // Create managers
        const notificationManager = new NotificationManager(configProvider);
        const monitorManager = new MonitorManager(configProvider, notificationManager, contextMenus);
        const uiManager = new UIManager(configProvider);
        const downloadManager = new DownloadManager(configProvider, uiManager, notificationManager);
        const captureManager = new CaptureManager(configProvider, downloadManager, contextMenus);
        const menuManager = new MenuManager(configProvider, contextMenus, downloadManager, uiManager);

        // Save manager references
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

        // Initialize remote Aria2 list
        monitorManager.initRemoteAria2List();
        configProvider.setRemoteAria2List(monitorManager.getRemoteAria2List());

        // Setup initial state
        await this._setupInitialState();

        // Create and register event handler
        const eventHandler = new EventHandler(this.managers);
        eventHandler.registerAll();

        this.initialized = true;
        console.log("Aria2 Explorer initialized successfully");
    }

    /**
     * Setup initial state
     */
    async _setupInitialState() {
        const config = this.managers.configProvider.getConfig();

        // Setup popup
        const popupUrl = config.webUIOpenStyle === "popup" 
            ? chrome.runtime.getURL('ui/ariang/popup.html') 
            : '';
        await chrome.action.setPopup({ popup: popupUrl });

        // Create menus
        this.managers.menuManager.createAllMenus();

        // Enable/disable capture
        if (config.integration) {
            this.managers.captureManager.enable();
        } else {
            this.managers.captureManager.disable();
        }

        // Enable/disable monitoring
        if (config.monitorAria2) {
            this.managers.monitorManager.enable();
        } else {
            this.managers.monitorManager.disable();
        }

        // Set uninstall URL
        const uninstallUrl = config.captureMagnet 
            ? "https://github.com/alexhua/Aria2-Explore/issues/98" 
            : '';
        await chrome.runtime.setUninstallURL(uninstallUrl);

        // Set side panel behavior
        await chrome.sidePanel.setPanelBehavior({ 
            openPanelOnActionClick: config.webUIOpenStyle === "sidePanel" 
        });
    }
}

// Create and initialize application
const app = new Application();
app.init().catch(error => {
    console.error("Failed to initialize Aria2 Explorer:", error);
});
