/**
 * EventHandler - Event handler, manages all Chrome event listeners
 */
import { NID_TASK_NEW, NID_TASK_STOPPED, NID_CAPTURED_OTHERS } from "./NotificationManager.js";
import { IconManager } from "../IconUtils/IconManager.js";

export class EventHandler {
    constructor(managers) {
        this.managers = managers;
    }

    /**
     * Register all event listeners
     */
    registerAll() {
        this._registerActionListeners();
        this._registerTabListeners();
        this._registerWindowListeners();
        this._registerNotificationListeners();
        this._registerCommandListeners();
        this._registerRuntimeListeners();
        this._registerStorageListeners();
    }

    /**
     * Register action listeners
     */
    _registerActionListeners() {
        chrome.action.onClicked.addListener((tab) => {
            this.managers.uiManager.launchUI(tab);
        });
    }

    /**
     * Register tab listeners
     */
    _registerTabListeners() {
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === "loading" && tab?.active) {
                const url = tab?.url || "about:blank";
                this.managers.captureManager.setCurrentTabUrl(url);
                this.managers.menuManager.setCurrentTabUrl(url);
                this.managers.menuManager.updateOptionMenu(tab);
            }
            this.managers.uiManager.resetSidePanel(tabId);
        });

        chrome.tabs.onActivated.addListener((activeInfo) => {
            chrome.tabs.get(activeInfo.tabId).then((tab) => {
                const url = tab?.url || "about:blank";
                this.managers.captureManager.setCurrentTabUrl(url);
                this.managers.menuManager.setCurrentTabUrl(url);
                this.managers.menuManager.updateOptionMenu(tab);
            });
            this.managers.uiManager.resetSidePanel(activeInfo.tabId);
        });
    }

    /**
     * Register window listeners
     */
    _registerWindowListeners() {
        chrome.windows.onFocusChanged.addListener((windowId) => {
            this.managers.uiManager.setCurrentWindowId(windowId);
            chrome.tabs.query({ windowId: windowId, active: true }).then((tabs) => {
                if (tabs?.length > 0) {
                    const url = tabs[0].url || "about:blank";
                    this.managers.captureManager.setCurrentTabUrl(url);
                    this.managers.menuManager.setCurrentTabUrl(url);
                    this.managers.menuManager.updateOptionMenu(tabs[0]);
                }
            });
        });
    }

    /**
     * Register notification listeners
     */
    _registerNotificationListeners() {
        chrome.notifications.onClicked.addListener((id) => {
            if (id.startsWith(NID_TASK_NEW) || id.startsWith(NID_TASK_STOPPED)) {
                this.managers.uiManager.launchUI(id);
            }
            chrome.notifications.clear(id);
        });

        chrome.notifications.onButtonClicked.addListener((nid, buttonIndex) => {
            if (nid === NID_CAPTURED_OTHERS) {
                if (buttonIndex === 1) {
                    chrome.storage.local.set({ remindCaptureTip: false });
                }
            }
            chrome.notifications.clear(nid);
        });
    }

    /**
     * Register command listeners
     */
    _registerCommandListeners() {
        chrome.commands.onCommand.addListener((command) => {
            const config = this.managers.configProvider.getConfig();

            if (command === "toggle-capture") {
                const newValue = !config.integration;
                chrome.storage.local.set({ integration: newValue });
            } else if (command === "launch-aria2") {
                const url = chrome.runtime.getURL('aria2.html');
                chrome.tabs.create({ url });
            }
        });
    }

    /**
     * Register runtime listeners
     */
    _registerRuntimeListeners() {
        // Install/update listener
        chrome.runtime.onInstalled.addListener((details) => {
            this._handleInstalled(details);
        });

        // External message listener
        chrome.runtime.onMessageExternal.addListener((downloadItem) => {
            const config = this.managers.configProvider.getConfig();
            if (config.allowExternalRequest) {
                this.managers.downloadManager.download(downloadItem);
            }
        });

        // Internal message listener
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this._handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open
        });

        // Context menu click listener
        this.managers.contextMenus.onClicked.addListener((info, tab) => {
            this.managers.menuManager.handleMenuClick(info, tab);
        });
    }

    /**
     * Register storage listeners
     */
    _registerStorageListeners() {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== "local") return;

            const needReInit = changes.rpcList || changes.contextMenus || 
                changes.askBeforeExport || changes.exportAll || 
                changes.allowNotification || changes.integration ||
                changes.monitorAria2 || changes.monitorAll || 
                changes.captureMagnet || changes.webUIOpenStyle;

            if (needReInit) {
                this._reinitialize();
            } else {
                for (const [key, { newValue }] of Object.entries(changes)) {
                    this.managers.configProvider.updateConfig({ [key]: newValue });
                }
            }

            // Special handling
            if (changes.checkClick) {
                this._initClickChecker();
            }

            if (changes.iconOffStyle && !this.managers.configProvider.getConfig().integration) {
                IconManager.turnOff(changes.iconOffStyle.newValue);
            }
        });
    }

    /**
     * Handle installed event
     */
    _handleInstalled(details) {
        const config = this.managers.configProvider.getConfig();

        if (details.reason === "install") {
            const url = chrome.runtime.getURL("options.html");
            chrome.storage.local.set(config).then(() => {
                chrome.tabs.create({ url });
            });
        } else if (details.reason === "update") {
            // Can add update notification here
        }
    }

    /**
     * Handle message
     */
    _handleMessage(message, sender, sendResponse) {
        switch (message.type) {
            case "DOWNLOAD":
            case "EXPORT_ALL":
                this.managers.downloadManager.download(message.data);
                break;

            case "DOWNLOAD_VIA_BROWSER":
                const downloadItem = message.data || {};
                downloadItem.type = "DOWNLOAD_VIA_BROWSER";
                this.managers.downloadManager.download(downloadItem);
                break;

            case "QUERY_WINDOW_STATE":
                chrome.windows.get(message.data).then((window) => {
                    sendResponse({ data: window });
                });
                break;

            case "CLICK_EVENT":
                this.managers.captureManager.setAltKeyPressed(message.data.altKeyPressed);
                break;
        }
    }

    /**
     * Reinitialize
     */
    async _reinitialize() {
        await this.managers.configProvider.init();
        const config = this.managers.configProvider.getConfig();

        // Setup popup
        const url = config.webUIOpenStyle === "popup" 
            ? chrome.runtime.getURL('ui/ariang/popup.html') 
            : '';
        await chrome.action.setPopup({ popup: url });

        // Initialize remote Aria2
        this.managers.monitorManager.initRemoteAria2List();
        this.managers.configProvider.setRemoteAria2List(
            this.managers.monitorManager.getRemoteAria2List()
        );

        // Initialize click checker
        await this._initClickChecker();

        // Rebuild menus and wait for completion
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

    /**
     * Initialize click checker
     */
    async _initClickChecker() {
        const config = this.managers.configProvider.getConfig();
        const CS_ID = 'ALT_CLICK_CHECKER';
        const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: [CS_ID] });

        if (config.integration && config.checkClick && scripts.length === 0) {
            await chrome.scripting.registerContentScripts([{
                id: CS_ID,
                matches: ['<all_urls>'],
                js: ['js/content/clickChecker.js'],
                runAt: 'document_end',
                allFrames: true
            }]);
        } else if (!config.checkClick && scripts.length !== 0) {
            await chrome.scripting.unregisterContentScripts({ ids: [CS_ID] });
        }
    }
}
