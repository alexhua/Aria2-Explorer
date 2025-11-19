/**
 * MenuManager - Handles context menu logic
 */
import exportAllLinks from "../content/exportAll.js";
import Utils from "../utils.js";

export class MenuManager {
    constructor(configProvider, contextMenus, downloadManager, uiManager) {
        this.configProvider = configProvider;
        this.contextMenus = contextMenus;
        this.downloadManager = downloadManager;
        this.uiManager = uiManager;
        this.currentTabUrl = "about:blank";
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
        return new Promise((resolve) => {
            this.contextMenus.removeAll(() => {
                this.#createOptionMenu();
                this.#createContextMenu();
                this.updateOptionMenu({ url: this.currentTabUrl, active: true });
                resolve();
            });
        });
    }

    /**
     * Create option menu
     */
    #createOptionMenu() {
        const config = this.configProvider.getConfig();

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
        const remoteAria2List = this.configProvider.getRemoteAria2List?.() || [];
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
        const config = this.configProvider.getConfig();
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
        const config = this.configProvider.getConfig();
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
                title: strExport + "AriaNG",
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
     * Update option menu
     */
    updateOptionMenu(tab) {
        if (!tab?.active) {
            if (!tab) {
                console.warn("Could not get active tab, update option menu failed.");
            }
            return;
        }

        const config = this.configProvider.getConfig();
        const url = new URL(tab.url || "about:blank");
        const blockedSitesSet = new Set(config.blockedSites);
        const allowedSitesSet = new Set(config.allowedSites);

        // Update whitelist menu
        let title = '✅ ';
        title += allowedSitesSet.has(url.hostname)
            ? chrome.i18n.getMessage("removeFromWhiteListStr")
            : chrome.i18n.getMessage("addToWhiteListStr");
        this.contextMenus.update("MENU_UPDATE_ALLOW_SITE", { title });

        // Update blacklist menu
        title = '🚫 ';
        title += blockedSitesSet.has(url.hostname)
            ? chrome.i18n.getMessage("removeFromBlackListStr")
            : chrome.i18n.getMessage("addToBlackListStr");
        this.contextMenus.update("MENU_UPDATE_BLOCK_SITE", { title });
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
                await chrome.storage.local.set({ integration: info.checked });
                break;

            case info.menuItemId === "MENU_MONITOR_ARIA2":
                await chrome.storage.local.set({ monitorAria2: info.checked });
                break;

            case info.menuItemId === "MENU_UPDATE_BLOCK_SITE":
                this.#updateBlockedSites(tab);
                this.updateOptionMenu(tab);
                break;

            case info.menuItemId === "MENU_UPDATE_ALLOW_SITE":
                this.#updateAllowedSites(tab);
                this.updateOptionMenu(tab);
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
    #updateAllowedSites(tab) {
        if (!tab?.active || !tab.url || tab.url.startsWith("chrome")) return;

        const config = this.configProvider.getConfig();
        const allowedSitesSet = new Set(config.allowedSites);
        const url = new URL(tab.url);

        if (allowedSitesSet.has(url.hostname)) {
            allowedSitesSet.delete(url.hostname);
        } else {
            allowedSitesSet.add(url.hostname);
        }

        chrome.storage.local.set({ allowedSites: Array.from(allowedSitesSet) });
    }

    /**
     * Update blocked sites
     */
    #updateBlockedSites(tab) {
        if (!tab?.active || !tab.url || tab.url.startsWith("chrome")) return;

        const config = this.configProvider.getConfig();
        const blockedSitesSet = new Set(config.blockedSites);
        const url = new URL(tab.url);

        if (blockedSitesSet.has(url.hostname)) {
            blockedSitesSet.delete(url.hostname);
        } else {
            blockedSitesSet.add(url.hostname);
        }

        chrome.storage.local.set({ blockedSites: Array.from(blockedSitesSet) });
    }

    /**
     * Handle RPC list click
     */
    #handleRpcListClick(menuItemId) {
        const config = this.configProvider.getConfig();
        const id = menuItemId.split('-')[1];

        // Clear current default
        const currentDefault = config.rpcList.find(rpc => rpc.pattern === '*');
        if (currentDefault) {
            currentDefault.pattern = '';
        }

        // Set new default
        config.rpcList[id].pattern = '*';
        chrome.storage.local.set({ rpcList: config.rpcList });
    }

    /**
     * Handle export click
     */
    async #handleExportClick(info, tab) {
        const config = this.configProvider.getConfig();
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

        const config = this.configProvider.getConfig();
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
