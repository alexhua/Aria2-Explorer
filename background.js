/**
 * Background Service Worker - Main entry point
 */
import Logger from "./js/logger.js";
import ContextMenu from "./js/contextMenu.js";
import { ConfigService } from "./js/services/ConfigService.js";
import { DownloadManager } from "./js/background/DownloadManager.js";
import { CaptureManager } from "./js/background/CaptureManager.js";
import { MonitorManager } from "./js/background/MonitorManager.js";
import { NotificationManager } from "./js/background/NotificationManager.js";
import { MenuManager } from "./js/background/MenuManager.js";
import { UIManager } from "./js/background/UIManager.js";
import { EventHandler } from "./js/background/EventHandler.js";
import { IconManager } from "./js/IconUtils/IconManager.js";

/**
 * Application class - Manages all modules
 */
class Application {
    constructor() {
        this.managers = {};
        this.initialized = false;

        // 1. Synchronously create context menu and config instances
        const contextMenus = new ContextMenu();
        const configService = ConfigService.getInstance();

        // 2. Synchronously create all managers
        const notificationManager = new NotificationManager();
        const monitorManager = new MonitorManager(notificationManager);
        const uiManager = new UIManager();
        const downloadManager = new DownloadManager(uiManager, notificationManager);
        const captureManager = new CaptureManager(downloadManager);
        const menuManager = new MenuManager(contextMenus, downloadManager, uiManager, monitorManager);

        // 3. Create event handler
        const eventHandler = new EventHandler({
            configService,
            contextMenus,
            downloadManager,
            captureManager,
            monitorManager,
            notificationManager,
            menuManager,
            uiManager
        });

        // Save manager references
        this.managers = {
            configService,
            contextMenus,
            downloadManager,
            captureManager,
            monitorManager,
            notificationManager,
            menuManager,
            uiManager,
            eventHandler
        };

        // 4. Synchronously register all core event listeners in Turn 0 (MV3 requirement)
        this.#setupInstallListener();
        eventHandler.registerAll();

        // 5. Synchronously enable download capture if enabled in config snapshot
        if (configService.get('integration')) {
            captureManager.enable();
        }

        // 6. Setup reactive configuration listeners
        this.#setupConfigListeners();
    }

    /**
     * Initialize asynchronous states (UI, monitoring, dynamic scripts)
     */
    async init() {
        if (this.initialized) return;

        // Ensure configuration is fully hydrated from storage before UI and RPC initialization
        await this.managers.configService.init();

        const config = this.managers.configService.get();

        // Initialize remote Aria2 list
        this.managers.monitorManager.initRemoteAria2List();

        // Initialize UI states (popup, sidepanel, context menus)
        await this.#setupInitialUIState();

        // Enable monitoring if configured
        if (config.monitorAria2) {
            this.managers.monitorManager.enable();
        }

        // Initialize dynamic click checker content script
        await this.managers.eventHandler.initClickChecker();

        this.initialized = true;
        Logger.log("Aria2 Explorer initialized successfully");
    }

    /**
     * Handle installed event
     */
    #setupInstallListener() {
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === "install") {
                const url = chrome.runtime.getURL("options.html?welcome");
                chrome.tabs.create({ url });
            } else if (details.reason === "update") {
                // Can add update notification here
            }
        });
    }

    /**
     * Setup configuration change listeners
     * Handles service-level side effects (menu-specific effects are handled inside MenuManager)
     */
    #setupConfigListeners() {
        const configService = this.managers.configService;

        // Listen for integration (download capture) changes
        configService.subscribe('integration', async (value) => {
            Logger.log('[App] Integration changed to:', value);
            if (value) {
                this.managers.captureManager.enable();
            } else {
                this.managers.captureManager.disable();
            }
            await this.managers.eventHandler.initClickChecker();
        });

        // Listen for monitorAria2 changes
        configService.subscribe('monitorAria2', (value) => {
            Logger.log('[App] MonitorAria2 changed to:', value);
            if (value) {
                this.managers.monitorManager.enable();
            } else {
                this.managers.monitorManager.disable();
            }
        });

        // Listen for allowNotification changes
        configService.subscribe('allowNotification', (value) => {
            Logger.log('[App] AllowNotification changed to:', value);
            this.managers.monitorManager.processMessageHandlers(value);
        });

        // Listen for webUIOpenStyle changes
        configService.subscribe('webUIOpenStyle', async (value) => {
            Logger.log('[App] WebUIOpenStyle changed to:', value);
            const popupUrl = value === "popup"
                ? chrome.runtime.getURL('ui/ariang/popup.html')
                : '';
            await chrome.action.setPopup({ popup: popupUrl });

            await chrome.sidePanel.setPanelBehavior({
                openPanelOnActionClick: value === "sidePanel"
            });
        });

        // Listen for iconOffStyle changes
        configService.subscribe('iconOffStyle', (value) => {
            Logger.log('[App] IconOffStyle changed to:', value);
            if (!configService.get('integration')) {
                IconManager.turnOff(value);
            }
        });

        // Listen for captureMagnet changes
        configService.subscribe('captureMagnet', async (value) => {
            Logger.log('[App] CaptureMagnet changed to:', value);
            await this.managers.eventHandler.initClickChecker();
        });

        // Listen for checkClick changes
        configService.subscribe('checkClick', async (value) => {
            Logger.log('[App] CheckClick changed to:', value);
            await this.managers.eventHandler.initClickChecker();
        });

        // Listen for RPC list changes to refresh monitor (Aria2 connection pool).
        // Note: MenuManager also subscribes to rpcList independently for rebuilding UI context menus.
        configService.subscribe('rpcList', () => {
            Logger.log('[App] Refreshing remote Aria2 list due to rpcList change');
            this.managers.monitorManager.initRemoteAria2List();
        });
    }

    /**
     * Setup initial UI state
     */
    async #setupInitialUIState() {
        const config = this.managers.configService.get();

        // Setup popup style
        const popupUrl = config.webUIOpenStyle === "popup"
            ? chrome.runtime.getURL('ui/ariang/popup.html')
            : '';
        await chrome.action.setPopup({ popup: popupUrl });

        // Set side panel behavior
        await chrome.sidePanel.setPanelBehavior({
            openPanelOnActionClick: config.webUIOpenStyle === "sidePanel"
        });

        // Create menus
        await this.managers.menuManager.createAllMenus();
    }
}

// Create and initialize application
const app = new Application();
app.init().catch(error => {
    Logger.error("Failed to initialize Aria2 Explorer:", error);
});
