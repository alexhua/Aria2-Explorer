/**
 * UIManager - Handles UI launch and management logic
 */
import { ConfigService } from "../services/ConfigService.js";
import Logger from "../logger.js";

const NID_TASK_STOPPED = "NID_TASK_STOPPED";
const POPUP_UI_INDEX = "ui/ariang/popup.html";
const DEFAULT_UI_INDEX = "ui/ariang/index.html";

export class UIManager {
    #currentWindowId = 0;
    #uiWindowId = 0;    // track the popup window opened by openInWindow
    #uiWindowBounds = null; // cache last known bounds before window close

    // Hold listener references so they can be removed later
    #boundsChangedListener = null;
    #windowRemovedListener = null;

    constructor() {
        this.configService = ConfigService.getInstance();
        this.#initWindowListeners();
    }

    /**
     * Set current window ID
     */
    setCurrentWindowId(windowId) {
        this.#currentWindowId = windowId;
    }

    /**
     * Get current window ID
     */
    getCurrentWindowId() {
        return this.#currentWindowId;
    }

    /**
     * Launch UI
     * @param {Object|string} info - Tab info or notification ID
     */
    async launchUI(info) {
        const config = this.configService.get();
        const index = config.webUIOpenStyle === "popup" ? POPUP_UI_INDEX : DEFAULT_UI_INDEX;
        const indexUrl = chrome.runtime.getURL(index);

        let webUiUrl = indexUrl + '#!';

        // Try to open side panel
        let sidePanelOpened = false;
        if (config.webUIOpenStyle === "sidePanel") {
            sidePanelOpened = await this.#openSidePanel(info);
        }

        // Build final WebUI URL
        webUiUrl = await this.#buildWebUiUrl(webUiUrl, info);

        // If side panel opened successfully, update path
        if (sidePanelOpened) {
            await this.#updateSidePanelPath(info, webUiUrl);
        } else if (config.webUIOpenStyle === "popup") {
            const popupUrl = chrome.runtime.getURL(index);
            await chrome.action.setPopup({ popup: webUiUrl });
            await chrome.action.openPopup();
            await chrome.action.setPopup({ popup: popupUrl });
        } else {
            // Otherwise open in tab or window
            await this.#openInTabOrWindow(indexUrl, webUiUrl);
        }
    }

    /**
     * Open side panel
     */
    async #openSidePanel(info) {
        try {
            if (info && 'id' in info) {
                await chrome.sidePanel.open({ tabId: info.id });
            } else {
                await chrome.sidePanel.open({ windowId: this.#currentWindowId });
            }
            return true;
        } catch (error) {
            Logger.warn("Open side panel failed:", error);
            return false;
        }
    }

    /**
     * Build WebUI URL
     */
    async #buildWebUiUrl(baseUrl, info) {
        // Launch from notification
        if (typeof info === "string" && info.startsWith(NID_TASK_STOPPED)) {
            const gid = info.slice(NID_TASK_STOPPED.length) || '';
            return baseUrl + (gid ? "/task/detail/" + gid : "/stopped");
        }

        // Launch for new task
        if (info?.hasOwnProperty("filename") && info.url) {
            return await this.#buildNewTaskUrl(baseUrl, info);
        }

        // Default URL
        return chrome.runtime.getURL(DEFAULT_UI_INDEX);
    }

    /**
     * Build new task URL
     */
    async #buildNewTaskUrl(baseUrl, downloadItem) {
        let url = baseUrl + "/new?url=" + encodeURIComponent(btoa(encodeURI(downloadItem.url)));

        // Add referrer
        if (downloadItem.referrer &&
            downloadItem.referrer !== "" &&
            downloadItem.referrer !== "about:blank") {
            url += "&referer=" + encodeURIComponent(downloadItem.referrer);
        }

        // Add header
        const header = await this.#buildHeader(downloadItem);
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
    async #buildHeader(downloadItem) {
        let header = "User-Agent: " + navigator.userAgent;

        const cookies = await this.#getCookies(downloadItem);
        if (cookies.length > 0) {
            header += "\nCookie: " + cookies.join(";");
        }

        return header;
    }

    /**
     * Get cookies
     */
    async #getCookies(downloadItem) {
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
    async #updateSidePanelPath(info, webUiUrl) {
        if (info && 'id' in info) {
            await chrome.sidePanel.setOptions({ tabId: info.id, path: webUiUrl });
        } else {
            await chrome.sidePanel.setOptions({ path: webUiUrl });
        }
    }

    /**
     * Open in tab or window
     */
    async #openInTabOrWindow(index, webUiUrl) {
        const config = this.configService.get();
        const tabs = await chrome.tabs.query({ "url": index });

        if (tabs?.length > 0) {
            await chrome.windows.update(tabs[0].windowId, { focused: true });
            const prop = { active: true };
            if (webUiUrl !== index) prop.url = webUiUrl;
            await chrome.tabs.update(tabs[0].id, prop);
            return;
        }

        if (config.webUIOpenStyle === "window") {
            await this.#openInWindow(webUiUrl);
        } else {
            await chrome.tabs.create({ url: webUiUrl });
        }
    }

    /**
     * Open in window
     */
    async #openInWindow(url) {
        const savedBounds = this.configService.get('uiWindowBounds');
        const windowProps = { url, type: 'popup', focused: false, ...savedBounds };
        const win = await chrome.windows.create(windowProps);
        this.#uiWindowId = win.id;
        await chrome.windows.update(win.id, { focused: true });
    }

    /**
     * Reset side panel
     */
    async resetSidePanel(tabId) {
        const config = this.configService.get();

        if (config.webUIOpenStyle !== "sidePanel") return;

        try {
            const { path } = await chrome.sidePanel.getOptions(tabId ? { tabId } : undefined);
            const defaultPath = DEFAULT_UI_INDEX;

            if (!path.endsWith(defaultPath)) {
                const options = tabId ? { tabId, path: defaultPath } : { path: defaultPath };
                await chrome.sidePanel.setOptions(options);
            }
        } catch (error) {
            Logger.warn("Reset side panel failed:", error);
        }
    }

    /**
     * Initialize window listeners based on current config,
     * then subscribe to webUIOpenStyle changes.
     */
    #initWindowListeners() {
        if (this.configService.get('webUIOpenStyle') === 'window') {
            this.#registerWindowListener();
        }

        // Dynamically register/unregister on style change
        this.configService.subscribe('webUIOpenStyle', (value) => {
            if (value === 'window') {
                this.#registerWindowListener();
            } else {
                this.#unregisterWindowListener();
            }
        });
    }

    /**
     * Register bounds tracking listeners for the popup window.
     * Safe to call multiple times - skips if already registered.
     */
    #registerWindowListener() {
        if (this.#boundsChangedListener) return; // Already registered

        /* Cache popup window bounds to memory on move/resize (no storage IO) */
        this.#boundsChangedListener = (win) => {
            if (win.id === this.#uiWindowId) {
                this.#uiWindowBounds = { left: win.left, top: win.top, width: win.width, height: win.height };
            }
        };
        chrome.windows.onBoundsChanged.addListener(this.#boundsChangedListener);

        /* Persist bounds via ConfigService when popup window closes */
        this.#windowRemovedListener = (windowId) => {
            if (windowId !== this.#uiWindowId) return;
            if (this.#uiWindowBounds) {
                this.configService.set({ uiWindowBounds: this.#uiWindowBounds });
            }
            this.#uiWindowId = null;
            this.#uiWindowBounds = null;
        };
        chrome.windows.onRemoved.addListener(this.#windowRemovedListener);
    }

    /**
     * Unregister bounds tracking listeners.
     */
    #unregisterWindowListener() {
        if (this.#boundsChangedListener) {
            chrome.windows.onBoundsChanged.removeListener(this.#boundsChangedListener);
            this.#boundsChangedListener = null;
        }
        if (this.#windowRemovedListener) {
            chrome.windows.onRemoved.removeListener(this.#windowRemovedListener);
            this.#windowRemovedListener = null;
        }
    }
}
