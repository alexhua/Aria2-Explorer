/**
 * UIManager - 负责UI启动和管理相关的逻辑
 */

const NID_TASK_STOPPED = "NID_TASK_STOPPED";

export class UIManager {
    constructor(configProvider, downloadManager) {
        this.configProvider = configProvider;
        this.downloadManager = downloadManager;
        this.currentWindowId = 0;
    }

    /**
     * 设置当前窗口ID
     */
    setCurrentWindowId(windowId) {
        this.currentWindowId = windowId;
    }

    /**
     * 获取当前窗口ID
     */
    getCurrentWindowId() {
        return this.currentWindowId;
    }

    /**
     * 启动UI
     * @param {Object|string} info - 标签页信息或通知ID
     */
    async launchUI(info) {
        const config = this.configProvider.getConfig();
        const index = chrome.runtime.getURL('ui/ariang/index.html');
        let webUiUrl = index + '#!';

        // 尝试打开侧边栏
        let sidePanelOpened = false;
        if (config.webUIOpenStyle === "sidePanel") {
            sidePanelOpened = await this._openSidePanel(info);
        }

        // 组装最终的WebUI URL
        webUiUrl = await this._buildWebUiUrl(webUiUrl, info);

        // 如果侧边栏已打开，更新路径
        if (sidePanelOpened) {
            await this._updateSidePanelPath(info, webUiUrl);
            return;
        }

        // 否则在标签页或窗口中打开
        await this._openInTabOrWindow(index, webUiUrl);
    }

    /**
     * 打开侧边栏
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
     * 构建WebUI URL
     */
    async _buildWebUiUrl(baseUrl, info) {
        // 从通知启动
        if (typeof info === "string" && info.startsWith(NID_TASK_STOPPED)) {
            const gid = info.slice(NID_TASK_STOPPED.length) || '';
            return baseUrl + (gid ? "/task/detail/" + gid : "/stopped");
        }

        // 新任务启动
        if (info?.hasOwnProperty("filename") && info.url) {
            return await this._buildNewTaskUrl(baseUrl, info);
        }

        // 默认URL
        return chrome.runtime.getURL('ui/ariang/index.html');
    }

    /**
     * 构建新任务URL
     */
    async _buildNewTaskUrl(baseUrl, downloadItem) {
        let url = baseUrl + "/new?url=" + encodeURIComponent(btoa(encodeURI(downloadItem.url)));

        // 添加referrer
        if (downloadItem.referrer && 
            downloadItem.referrer !== "" && 
            downloadItem.referrer !== "about:blank") {
            url += "&referer=" + encodeURIComponent(downloadItem.referrer);
        }

        // 添加header
        const header = await this._buildHeader(downloadItem);
        if (header) {
            url += "&header=" + encodeURIComponent(header);
        }

        // 添加filename
        if (downloadItem.filename) {
            url += "&filename=" + encodeURIComponent(downloadItem.filename);
        }

        // 添加dir
        if (downloadItem.dir) {
            url += "&dir=" + encodeURIComponent(downloadItem.dir);
        }

        return url;
    }

    /**
     * 构建请求头
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
     * 获取Cookies
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
     * 更新侧边栏路径
     */
    async _updateSidePanelPath(info, webUiUrl) {
        if (info && 'id' in info) {
            await chrome.sidePanel.setOptions({ tabId: info.id, path: webUiUrl });
        } else {
            await chrome.sidePanel.setOptions({ path: webUiUrl });
        }
    }

    /**
     * 在标签页或窗口中打开
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
     * 在窗口中打开
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
     * 重置侧边栏
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
