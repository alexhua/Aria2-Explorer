/**
 * UIManager - Handles UI launch and management logic
 */

const NID_TASK_STOPPED = "NID_TASK_STOPPED";

export class UIManager {
    constructor(configProvider, downloadManager) {
        this.configProvider = configProvider;
        this.downloadManager = downloadManager;
        this.currentWindowId = 0;
    }

    /**
     * Set current window ID
     */
    setCurrentWindowId(windowId) {
        this.currentWindowId = windowId;
    }

    /**
     * Get current window ID
     */
    getCurrentWindowId() {
        return this.currentWindowId;
    }

    /**
     * Launch UI
     * @param {Object|string} info - Tab info or notification ID
     */
    async launchUI(info) {
        const config = this.configProvider.getConfig();
        const index = chrome.runtime.getURL('ui/ariang/index.html');
        let webUiUrl = index + '#!';

        // Try to open side panel
        let sidePanelOpened = false;
        if (config.webUIOpenStyle === "sidePanel") {
            sidePanelOpened = await this._openSidePanel(info);
        }

        // Build final WebUI URL
        webUiUrl = await this._buildWebUiUrl(webUiUrl, info);

        // If side panel opened, update path
        if (sidePanelOpened) {
            await this._updateSidePanelPath(info, webUiUrl);
            return;
        }

        // Otherwise open in tab or window
        await this._openInTabOrWindow(index, webUiUrl);
    }

    /**
     * Open side panel
     */
    async _openSidePanel(info) {
        try {
            if (info && 'id' in info) {
                await chrome.sidePanel.open({ tabId: info.id });
            } else {
                await chrome.sidePanel.open({ windowId: this.currentWindowId });
            }
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Build WebUI URL
     */
    async _buildWebUiUrl(baseUrl, info) {
        // Launch from notification
        if (typeof info === "string" && info.startsWith(NID_TASK_STOPPED)) {
            const gid = info.slice(NID_TASK_STOPPED.length) || '';
            return baseUrl + (gid ? "/task/detail/" + gid : "/stopped");
        }

        // Launch for new task
        if (info?.hasOwnProperty("filename") && info.url) {
            return await this._buildNewTaskUrl(baseUrl, info);
        }

        // Default URL
        return chrome.runtime.getURL('ui/ariang/index.html');
    }

    /**
     * Build new task URL
     */
    async _buildNewTaskUrl(baseUrl, downloadItem) {
        let url = baseUrl + "/new?url=" + encodeURIComponent(btoa(encodeURI(downloadItem.url)));

        // Add referrer
        if (downloadItem.referrer && 
            downloadItem.referrer !== "" && 
            downloadItem.referrer !== "about:blank") {
            url += "&referer=" + encodeURIComponent(downloadItem.referrer);
        }

        // Add header
        const header = await this._buildHeader(downloadItem);
        if (header) {
            url += "&header=" + encodeURIComponent(header);
        }

        // Add filename
        if (downloadItem.filename) {
            url += "&filename=" + encodeURIComponent(downloadItem.filename);
        }

        // Add dir
        if (downloadItem.dir) {
            url += "&dir=" + encodeURIComponent(downloadItem.dir);
        }

        return url;
    }

    /**
     * Build request header
     */
    async _buildHeader(downloadItem) {
        let header = "User-Agent: " + navigator.userAgent;

        const cookies = await this._getCookies(downloadItem);
        if (cookies.length > 0) {
            header += "\nCookie: " + cookies.join(";");
        }

        return header;
    }

    /**
     * Get cookies
     */
    async _getCookies(downloadItem) {
        try {
            const storeId = chrome.extension.inIncognitoContext ? "1" : "0";
            const url = downloadItem.multiTask ? downloadItem.referrer : downloadItem.url;
            const cookies = await chrome.cookies.getAll({ url, storeId });
            return cookies.map(cookie => `${cookie.name}=${cookie.value}`);
        } catch {
            return [];
        }
    }

    /**
     * Update side panel path
     */
    async _updateSidePanelPath(info, webUiUrl) {
        if (info && 'id' in info) {
            await chrome.sidePanel.setOptions({ tabId: info.id, path: webUiUrl });
        } else {
            await chrome.sidePanel.setOptions({ path: webUiUrl });
        }
    }

    /**
     * Open in tab or window
     */
    async _openInTabOrWindow(index, webUiUrl) {
        const config = this.configProvider.getConfig();
        const tabs = await chrome.tabs.query({ "url": index });

        if (tabs?.length > 0) {
            await chrome.windows.update(tabs[0].windowId, { focused: true });
            const prop = { active: true };
            if (webUiUrl !== index) prop.url = webUiUrl;
            await chrome.tabs.update(tabs[0].id, prop);
            return;
        }

        if (config.webUIOpenStyle === "window") {
            await this._openInWindow(webUiUrl);
        } else {
            await chrome.tabs.create({ url: webUiUrl });
        }
    }

    /**
     * Open in window
     */
    async _openInWindow(url) {
        const screen = await chrome.system.display.getInfo();
        const w = Math.floor(screen[0].workArea.width * 0.75);
        const h = Math.floor(screen[0].workArea.height * 0.75);
        const l = Math.floor(screen[0].workArea.width * 0.12);
        const t = Math.floor(screen[0].workArea.height * 0.12);

        const window = await chrome.windows.create({
            url: url,
            width: w,
            height: h,
            left: l,
            top: t,
            type: 'popup',
            focused: false
        });

        await chrome.windows.update(window.id, { focused: true });
    }

    /**
     * Reset side panel
     */
    async resetSidePanel(tabId) {
        const config = this.configProvider.getConfig();
        
        if (config.webUIOpenStyle !== "sidePanel") return;

        try {
            const { path } = await chrome.sidePanel.getOptions(tabId ? { tabId } : undefined);
            const defaultPath = 'ui/ariang/index.html';
            
            if (!path.endsWith(defaultPath)) {
                const options = tabId ? { tabId, path: defaultPath } : { path: defaultPath };
                await chrome.sidePanel.setOptions(options);
            }
        } catch (error) {
            console.warn("Reset side panel failed:", error);
        }
    }
}
