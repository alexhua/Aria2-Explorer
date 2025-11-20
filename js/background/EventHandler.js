/**
 * EventHandler - Event handler, manages all Chrome event listeners
 */
import { NID_TASK_NEW, NID_TASK_STOPPED, NID_CAPTURED_OTHERS } from "./NotificationManager.js";
import { IconManager } from "../IconUtils/IconManager.js";
import { ConfigService } from "../services/ConfigService.js";

export class EventHandler {
    constructor(managers) {
        this.managers = managers;
        this.configService = ConfigService.getInstance();
    }

    /**
     * Register all event listeners
     */
    registerAll() {
        this.#registerActionListeners();
        this.#registerTabListeners();
        this.#registerWindowListeners();
        this.#registerNotificationListeners();
        this.#registerCommandListeners();
        this.#registerRuntimeListeners();
        // Note: Storage listeners removed - ConfigService handles config changes
    }

    /**
     * Register action listeners
     */
    #registerActionListeners() {
        chrome.action.onClicked.addListener((tab) => {
            this.managers.uiManager.launchUI(tab);
        });
    }

    /**
     * Register tab listeners
     */
    #registerTabListeners() {
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
    #registerWindowListeners() {
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
    #registerNotificationListeners() {
        chrome.notifications.onClicked.addListener((id) => {
            if (id.startsWith(NID_TASK_NEW) || id.startsWith(NID_TASK_STOPPED)) {
                this.managers.uiManager.launchUI(id);
            }
            chrome.notifications.clear(id);
        });

        chrome.notifications.onButtonClicked.addListener(async (nid, buttonIndex) => {
            if (nid === NID_CAPTURED_OTHERS) {
                if (buttonIndex === 1) {
                    await this.configService.set({ remindCaptureTip: false });
                }
            }
            chrome.notifications.clear(nid);
        });
    }

    /**
     * Register command listeners
     */
    #registerCommandListeners() {
        chrome.commands.onCommand.addListener(async (command) => {
            if (command === "toggle-capture") {
                const current = this.configService.get('integration');
                await this.configService.set({ integration: !current });
            } else if (command === "launch-aria2") {
                const url = chrome.runtime.getURL('aria2.html');
                chrome.tabs.create({ url });
            }
        });
    }

    /**
     * Register runtime listeners
     */
    #registerRuntimeListeners() {
        // Install/update listener
        chrome.runtime.onInstalled.addListener((details) => {
            this.#handleInstalled(details);
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
            this.#handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open
        });

        // Context menu click listener
        this.managers.contextMenus.onClicked.addListener((info, tab) => {
            this.managers.menuManager.handleMenuClick(info, tab);
        });
    }



    /**
     * Handle installed event
     */
    async #handleInstalled(details) {
        if (details.reason === "install") {
            const config = this.configService.get();
            const url = chrome.runtime.getURL("options.html");
            await this.configService.set(config);
            chrome.tabs.create({ url });
        } else if (details.reason === "update") {
            // Can add update notification here
        }
    }

    /**
     * Handle message
     */
    #handleMessage(message, sender, sendResponse) {
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
     * Initialize click checker
     */
    async initClickChecker() {
        const config = this.configService.get();
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
