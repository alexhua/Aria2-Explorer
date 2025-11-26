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
    }

    /**
     * Initialize application
     */
    async init() {
        if (this.initialized) return;

        // Create context menu instance
        const contextMenus = new ContextMenu();

        // Create config service (singleton)
        const configService = ConfigService.getInstance();
        await configService.init();

        const notificationManager = new NotificationManager();
        const monitorManager = new MonitorManager(notificationManager, contextMenus);
        const uiManager = new UIManager();
        const downloadManager = new DownloadManager(uiManager, notificationManager);
        const captureManager = new CaptureManager(downloadManager, contextMenus);
        const menuManager = new MenuManager(contextMenus, downloadManager, uiManager, monitorManager);

        // Create and register event handler
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

        // Initialize remote Aria2 list
        monitorManager.initRemoteAria2List();

        // Setup config change listeners (BEFORE initial state)
        this.#setupConfigListeners();

        // Setup initial state
        await this.#setupInitialState();

        // Register event listeners
        eventHandler.registerAll();

        this.initialized = true;
        Logger.log("Aria2 Explorer initialized successfully");
    }

    /**
     * Setup configuration change listeners
     * This is the central place for handling config-driven side effects
     */
    #setupConfigListeners() {
        const configService = this.managers.configService;

        // Listen for integration (download capture) changes
        configService.subscribe('integration', (value) => {
            Logger.log('[App] Integration changed to:', value);
            if (value) {
                this.managers.captureManager.enable();
            } else {
                this.managers.captureManager.disable();
            }
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
            const uninstallUrl = value
                ? "https://github.com/alexhua/Aria2-Explore/issues/98"
                : '';
            await chrome.runtime.setUninstallURL(uninstallUrl);
        });

        // Listen for checkClick changes
        configService.subscribe('checkClick', async (value) => {
            Logger.log('[App] CheckClick changed to:', value);
            await this.managers.eventHandler.initClickChecker();
        });

        // Listen for changes that require menu rebuild
        configService.subscribe((changes) => {
            const needRebuildMenu = changes.rpcList ||
                changes.contextMenus ||
                changes.askBeforeExport ||
                changes.exportAll;

            if (needRebuildMenu) {
                Logger.log('[App] Rebuilding menus due to config changes');
                this.managers.menuManager.createAllMenus();
            }

            if (changes.rpcList) {
                Logger.log('[App] Rebuilding remote Aria2 list due to config changes');
                this.managers.monitorManager.initRemoteAria2List();
            }
        });
    }

    /**
     * Setup initial state
     */
    async #setupInitialState() {
        const config = this.managers.configService.get();

        // Setup popup
        const popupUrl = config.webUIOpenStyle === "popup"
            ? chrome.runtime.getURL('ui/ariang/popup.html')
            : '';
        await chrome.action.setPopup({ popup: popupUrl });

        // Create menus and wait for completion
        await this.managers.menuManager.createAllMenus();

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
    Logger.error("Failed to initialize Aria2 Explorer:", error);
});
