/**
 * MenuManager - Handles context menu logic
 */
import exportAllLinks from "../content/exportAll.js";
import Logger from "../logger.js";
import Utils from "../utils.js";
import { ConfigService } from "../services/ConfigService.js";

export class MenuManager {
    constructor(contextMenus, downloadManager, uiManager, monitorManager) {
        this.configService = ConfigService.getInstance();
        this.contextMenus = contextMenus;
        this.downloadManager = downloadManager;
        this.uiManager = uiManager;
        this.monitorManager = monitorManager;
        this.currentTabUrl = "about:blank";
        this.lastHostname = "";

        // Setup reactive subscriptions to configuration changes
        this.#setupConfigSubscriptions();
    }

    /**
     * Setup subscriptions to automatically update menus when config changes
     */
    #setupConfigSubscriptions() {
        // 1. Reactive checkbox updates
        this.configService.subscribe('integration', (value) => {
            this.contextMenus.update("MENU_CAPTURE_DOWNLOAD", { checked: Boolean(value) })
                .catch(error => Logger.warn("Menu item MENU_CAPTURE_DOWNLOAD not found:", error));
        });

        this.configService.subscribe('monitorAria2', (value) => {
            this.contextMenus.update("MENU_MONITOR_ARIA2", { checked: Boolean(value) })
                .catch(error => Logger.warn("Menu item MENU_MONITOR_ARIA2 not found:", error));
        });

        // 2. Reactive menu tree rebuild on structural config changes
        this.configService.subscribe((changes) => {
            const needRebuildMenu = 'rpcList' in changes ||
                'contextMenus' in changes ||
                'askBeforeExport' in changes ||
                'exportAll' in changes;

            if (needRebuildMenu) {
                Logger.log('[MenuManager] Rebuilding menus due to config changes');
                this.createAllMenus().catch(error => Logger.error('[MenuManager] Failed to rebuild menus:', error));
            }
        });
    }

    /**
     * Set current tab URL
     */
    setCurrentTabUrl(url) {
        this.currentTabUrl = url;
    }

    /**
     * Create all menus
     */
    async createAllMenus() {
        await this.contextMenus.removeAll();
        this.#createOptionMenu();
        this.#createContextMenu();
        this.updateOptionMenu({ url: this.currentTabUrl, active: true }, true);
    }

    /**
     * Create option menu
     */
    #createOptionMenu() {
        const config = this.configService.get();

        // Download capture
        this.contextMenus.create({
            type: "checkbox",
            checked: config.integration,
            id: "MENU_CAPTURE_DOWNLOAD",
            title: '📥 ' + chrome.i18n.getMessage("downloadCaptureStr"),
            contexts: ["action"]
        });

        // Monitor Aria2
        this.contextMenus.create({
            type: "checkbox",
            checked: config.monitorAria2,
            id: "MENU_MONITOR_ARIA2",
            title: '🩺 ' + chrome.i18n.getMessage("monitorAria2Str"),
            contexts: ["action"]
        });

        // Separator
        this.contextMenus.create({
            type: "separator",
            id: "MENU_SEPARATOR",
            contexts: ["action"]
        });

        // Start Aria2 or open WebUI
        const remoteAria2List = this.monitorManager.getRemoteAria2List();
        if (Utils.getPlatform() === "Windows" && remoteAria2List[0]?.isLocalhost) {
            this.contextMenus.create({
                type: "normal",
                id: "MENU_START_ARIA2",
                title: '⚡️ ' + chrome.i18n.getMessage("startAria2Str"),
                contexts: ["action"]
            });
        } else {
            this.contextMenus.create({
                type: "normal",
                id: "MENU_OPEN_WEB_UI",
                title: '🪟 ' + chrome.i18n.getMessage("openWebUIStr"),
                contexts: ["action"]
            });
        }

        // Website filter
        this.#createWebsiteFilterMenu();

        // RPC options
        this.#createRpcOptionsMenu();
    }

    /**
     * Create website filter menu
     */
    #createWebsiteFilterMenu() {
        this.contextMenus.create({
            type: "normal",
            id: "MENU_WEBSITE_FILTER",
            title: '🔛 ' + chrome.i18n.getMessage("websiteFilterStr"),
            contexts: ["action"]
        });

        this.contextMenus.create({
            type: "normal",
            id: "MENU_UPDATE_ALLOW_SITE",
            parentId: "MENU_WEBSITE_FILTER",
            title: '✅ ' + chrome.i18n.getMessage("addToWhiteListStr"),
            contexts: ["action"]
        });

        this.contextMenus.create({
            type: "normal",
            id: "MENU_UPDATE_BLOCK_SITE",
            parentId: "MENU_WEBSITE_FILTER",
            title: '🚫 ' + chrome.i18n.getMessage("addToBlackListStr"),
            contexts: ["action"]
        });
    }

    /**
     * Create RPC options menu
     */
    #createRpcOptionsMenu() {
        const config = this.configService.get();
        const rpcOptionsList = [];

        for (const i in config.rpcList) {
            if (!config.rpcList[i].pattern || config.rpcList[i].pattern === '*') {
                rpcOptionsList.push({ id: i, name: config.rpcList[i].name });
            }
        }

        if (rpcOptionsList.length < 1) return;

        this.contextMenus.create({
            type: "normal",
            id: "MENU_RPC_LIST",
            title: '🔘 ' + chrome.i18n.getMessage("selectDefaultRpcStr"),
            contexts: ["action"]
        });

        for (const menuItem of rpcOptionsList) {
            const checked = config.rpcList[menuItem.id].pattern === '*';
            this.contextMenus.create({
                type: "radio",
                checked: checked,
                id: "MENU_RPC_LIST-" + menuItem.id,
                parentId: "MENU_RPC_LIST",
                title: menuItem.name,
                contexts: ["action"]
            });
        }
    }

    /**
     * Create context menu
     */
    #createContextMenu() {
        const config = this.configService.get();
        const strExport = chrome.i18n.getMessage("contextmenuTitle");
        const strExportAllDes = chrome.i18n.getMessage("exportAllDes");

        if (config.exportAll) {
            this.contextMenus.create({
                id: "MENU_EXPORT_ALL",
                title: strExportAllDes,
                contexts: ['page']
            });
        }

        if (!config.contextMenus) return;

        if (config.askBeforeExport) {
            this.contextMenus.create({
                id: "MENU_EXPORT_TO",
                title: strExport + chrome.i18n.getMessage("mainUI"),
                contexts: ['link', 'selection']
            });
        } else {
            for (const i in config.rpcList) {
                let title = '';
                if (config.rpcList.length === 1) {
                    title = strExport + config.rpcList[i].name + '  📥';
                } else {
                    title = '📥 ' + strExport + config.rpcList[i].name;
                }

                this.contextMenus.create({
                    id: "MENU_EXPORT_TO-" + i,
                    title: title,
                    contexts: ['link', 'selection']
                });
            }
        }
    }

    /**
     * Update option menu based on active tab
     * @param {Object} tab - Active tab object
     * @param {boolean} [force=false] - Force update even if hostname hasn't changed
     */
    updateOptionMenu(tab, force = false) {
        if (!tab?.active) {
            if (!tab) {
                Logger.warn("Could not get active tab, update option menu failed.");
            }
            return;
        }

        const url = new URL(tab.url || "about:blank");
        if (!force && url.hostname === this.lastHostname) {
            return;
        }
        this.lastHostname = url.hostname;

        const config = this.configService.get();
        const blockedSitesSet = new Set(config.blockedSites);
        const allowedSitesSet = new Set(config.allowedSites);

        // Update whitelist menu
        let title = '✅ ';
        title += allowedSitesSet.has(url.hostname)
            ? chrome.i18n.getMessage("removeFromWhiteListStr")
            : chrome.i18n.getMessage("addToWhiteListStr");
        this.contextMenus.update("MENU_UPDATE_ALLOW_SITE", { title })
            .catch(() => {
                // Menu item might not exist yet
            });

        // Update blacklist menu
        title = '🚫 ';
        title += blockedSitesSet.has(url.hostname)
            ? chrome.i18n.getMessage("removeFromBlackListStr")
            : chrome.i18n.getMessage("addToBlackListStr");
        this.contextMenus.update("MENU_UPDATE_BLOCK_SITE", { title })
            .catch(() => {
                // Menu item might not exist yet
            });
    }

    /**
     * Handle menu click
     */
    async handleMenuClick(info, tab) {
        switch (true) {
            case info.menuItemId === "MENU_OPEN_WEB_UI":
                await this.uiManager.launchUI(tab);
                break;

            case info.menuItemId === "MENU_START_ARIA2":
                await chrome.tabs.create({ url: chrome.runtime.getURL('aria2.html') });
                break;

            case info.menuItemId === "MENU_CAPTURE_DOWNLOAD":
                await this.configService.set({ integration: info.checked });
                break;

            case info.menuItemId === "MENU_MONITOR_ARIA2":
                await this.configService.set({ monitorAria2: info.checked });
                break;

            case info.menuItemId === "MENU_UPDATE_BLOCK_SITE":
                this.#updateBlockedSites(tab);
                this.updateOptionMenu(tab, true);
                break;

            case info.menuItemId === "MENU_UPDATE_ALLOW_SITE":
                this.#updateAllowedSites(tab);
                this.updateOptionMenu(tab, true);
                break;

            case info.menuItemId.startsWith("MENU_RPC_LIST-"):
                this.#handleRpcListClick(info.menuItemId);
                break;

            case info.menuItemId.startsWith("MENU_EXPORT_TO"):
                await this.#handleExportClick(info, tab);
                break;

            case info.menuItemId === "MENU_EXPORT_ALL":
                await this.#handleExportAll(info, tab);
                break;
        }
    }

    /**
     * Update allowed sites
     */
    async #updateAllowedSites(tab) {
        if (!tab?.active || !tab.url || tab.url.startsWith("chrome")) return;

        const config = this.configService.get();
        const allowedSitesSet = new Set(config.allowedSites);
        const url = new URL(tab.url);

        if (allowedSitesSet.has(url.hostname)) {
            allowedSitesSet.delete(url.hostname);
        } else {
            allowedSitesSet.add(url.hostname);
        }

        await this.configService.set({ allowedSites: Array.from(allowedSitesSet) });
    }

    /**
     * Update blocked sites
     */
    async #updateBlockedSites(tab) {
        if (!tab?.active || !tab.url || tab.url.startsWith("chrome")) return;

        const config = this.configService.get();
        const blockedSitesSet = new Set(config.blockedSites);
        const url = new URL(tab.url);

        if (blockedSitesSet.has(url.hostname)) {
            blockedSitesSet.delete(url.hostname);
        } else {
            blockedSitesSet.add(url.hostname);
        }

        await this.configService.set({ blockedSites: Array.from(blockedSitesSet) });
    }

    /**
     * Handle RPC list click
     */
    async #handleRpcListClick(menuItemId) {
        const config = this.configService.get();
        const id = menuItemId.split('-')[1];

        // Clear current default
        const currentDefault = config.rpcList.find(rpc => rpc.pattern === '*');
        if (currentDefault) {
            currentDefault.pattern = '';
        }

        // Set new default
        config.rpcList[id].pattern = '*';
        await this.configService.set({ rpcList: config.rpcList });
    }

    /**
     * Handle export click
     */
    async #handleExportClick(info, tab) {
        const config = this.configService.get();
        const url = info.linkUrl || info.selectionText;
        const referrer = info.frameUrl || info.pageUrl;
        const downloadItem = {
            url,
            referrer,
            filename: '',
            incognito: tab.incognito
        };

        if (config.askBeforeExport) {
            const rpcItem = this.downloadManager.getRpcServer(downloadItem.url);
            downloadItem.dir = rpcItem.location;
            downloadItem.id = tab.id;
            await this.uiManager.launchUI(downloadItem);
        } else {
            const id = info.menuItemId.split('-')[1];
            const rpcItem = config.rpcList[id];
            downloadItem.dir = rpcItem.location;
            await this.downloadManager.send2Aria(downloadItem, rpcItem);
        }
    }

    /**
     * Handle export all
     */
    async #handleExportAll(info, tab) {
        if (tab.url.startsWith("chrome")) return;

        const config = this.configService.get();
        await chrome.scripting.executeScript({
            target: {
                tabId: tab.id,
                allFrames: !info.frameId,
                frameIds: info.frameId ? [info.frameId] : undefined
            },
            func: exportAllLinks,
            args: [config.allowedExts, config.blockedExts]
        });
    }
}
