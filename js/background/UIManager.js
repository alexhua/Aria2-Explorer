/**
 * UIManager - Handles UI launch and management logic
 */
import { ConfigService } from "../services/ConfigService.js";
import Logger from "../logger.js";
import Utils from "../utils.js";

const NID_TASK_STOPPED = "NID_TASK_STOPPED";
const POPUP_UI_INDEX = "ui/ariang/popup.html";
const DEFAULT_UI_INDEX = "ui/ariang/index.html";

export class UIManager {
    #currentTabId = 0;
    #currentWindowId = 0;
    #uiWindowId = 0;    // track the popup window opened by openInWindow
    #uiWindowBounds = null; // cache last known bounds before window close
    #isOpeningWindow = false; // flag to prevent race conditions during window creation
    #uiWindowFocused = false; // whether the UI window has been focused at least once
    #isClosingWindow = false; // flag to prevent duplicate close calls

    // Hold listener references so they can be removed later
    #boundsChangedListener = null;
    #windowRemovedListener = null;

    constructor() {
        this.configService = ConfigService.getInstance();
        this.#initWindowListeners();
        this.#restoreUIWindowState();
    }

    /**
     * Set current tab ID
     */
    setCurrentTabId(tabId) {
        this.#currentTabId = tabId;
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
     * Restore UI window state on service worker wake-up
     */
    async #restoreUIWindowState() {
        try {
            const indexUrl = chrome.runtime.getURL(DEFAULT_UI_INDEX);
            const tabs = await chrome.tabs.query({ url: [indexUrl, indexUrl + '*'] });
            if (tabs?.length > 0) {
                const win = await chrome.windows.get(tabs[0].windowId);
                if (win.type === 'popup') {
                    this.#uiWindowId = win.id;
                    this.#uiWindowFocused = win.focused;
                }
            }
        } catch {
            // Ignore if window lookup fails
        }
    }

    /**
     * Handle window focus change and auto-close UI window if configured
     * @param {number} windowId - Newly focused window ID or WINDOW_ID_NONE
     */
    async handleWindowFocusChange(windowId) {
        this.setCurrentWindowId(windowId);

        const config = this.configService.get();
        if (config.webUIOpenStyle !== "window" || !config.windowBlurClose) {
            return;
        }

        // If the UI window gained focus, confirm focused and release opening lock immediately
        if (this.#uiWindowId && windowId === this.#uiWindowId) {
            this.#uiWindowFocused = true;
            this.#isOpeningWindow = false;
            return;
        }

        // Skip other focus events during initial window opening
        if (this.#isOpeningWindow) {
            return;
        }

        // Fallback: If #uiWindowId is not set (e.g. after SW restart), attempt recovery
        if (!this.#uiWindowId) {
            await this.#restoreUIWindowState();
        }

        // If UI window had been focused and now focus changed to another window or desktop
        if (this.#uiWindowId && this.#uiWindowFocused && windowId !== this.#uiWindowId) {
            if (this.#isClosingWindow) return;
            this.#isClosingWindow = true;
            try {
                await chrome.windows.remove(this.#uiWindowId);
            } catch (error) {
                Logger.warn("Failed to close UI window on blur:", error);
            } finally {
                this.#isClosingWindow = false;
            }
        }
    }

    /**
     * Launch UI
     * @param {Object|string} info - Tab info, download item or notification ID
     */
    async launchUI(info) {
        const config = this.configService.get();
        const index = config.webUIOpenStyle === "popup" ? POPUP_UI_INDEX : DEFAULT_UI_INDEX;
        const indexUrl = chrome.runtime.getURL(index);
        const tabId = (info && typeof info === "object" && "id" in info && !('fileSize' in info)) ?
            info.id : this.#currentTabId;

        let webUiUrl = indexUrl + '#!';

        // Try to open side panel
        let sidePanelActive = false;
        if (config.webUIOpenStyle === "sidePanel") {
            this.#updateSidePanelPath(tabId, webUiUrl);
            // Try open() first to preserve user gesture token
            sidePanelActive = await this.#openSidePanel(tabId);
            // If open() failed (no user gesture), check if already open
            if (!sidePanelActive) {
                sidePanelActive = await this.#isSidePanelOpen();
            }
        }

        // Build final WebUI URL
        webUiUrl = await this.#buildWebUiUrl(webUiUrl, info);

        // If side panel is active, update its path
        if (sidePanelActive) {
            this.#updateSidePanelPath(tabId, webUiUrl);
            if ('onClosed' in chrome.sidePanel) { // Chrome 142+
                chrome.sidePanel.onClosed.addListener(() => this.resetSidePanel(tabId));
            }
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
    async #openSidePanel(tabId) {
        try {
            if (tabId) {
                await chrome.sidePanel.open({ tabId });
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
     * Check if side panel is currently open
     */
    async #isSidePanelOpen() {
        if (!chrome.runtime.getContexts) return false;
        try {
            const contexts = await chrome.runtime.getContexts({
                contextTypes: ['SIDE_PANEL'],
                windowIds: [this.#currentWindowId]
            });
            return contexts.length > 0;
        } catch {
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

        const cookies = await Utils.getCookies(downloadItem);
        if (cookies.length > 0) {
            header += "\nCookie: " + cookies.join(";");
        }

        return header;
    }

    /**
     * Update side panel path
     */
    async #updateSidePanelPath(tabId, webUiUrl) {
        if (tabId) {
            await chrome.sidePanel.setOptions({ tabId, path: webUiUrl });
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
            if (config.webUIOpenStyle === "window") {
                this.#uiWindowId = tabs[0].windowId;
                this.#uiWindowFocused = true;
            }
            return;
        }

        if (config.webUIOpenStyle === "window") {
            await this.#openInWindow(webUiUrl);
        } else {
            await chrome.tabs.create({ url: webUiUrl });
        }
    }

    /**
     * Validate window bounds
     */
    #isValidBounds(bounds) {
        if (!bounds || typeof bounds !== 'object') {
            return false;
        }

        // Check if width and height are valid positive numbers (using type coercion)
        if (bounds.width != null && bounds.width <= 0) {
            return false;
        }
        if (bounds.height != null && bounds.height <= 0) {
            return false;
        }

        return true;
    }

    /**
     * Open in window
     */
    async #openInWindow(url) {
        const savedBounds = this.configService.get('uiWindowBounds');
        const validBounds = this.#isValidBounds(savedBounds) ? savedBounds : null;
        const defaultProps = { url, type: 'popup', focused: false, width: 1024, height: 600 };
        const windowProps = validBounds ? { ...defaultProps, ...validBounds } : defaultProps;

        this.#isOpeningWindow = true;
        this.#uiWindowFocused = false;

        let win;
        try {
            win = await chrome.windows.create(windowProps);
        } catch {
            // Fallback to default bounds if saved bounds are rejected (e.g. off-screen)
            try {
                win = await chrome.windows.create(defaultProps);
            } catch (error) {
                this.#isOpeningWindow = false;
                Logger.error("Failed to create UI window:", error);
                throw error;
            }
        }
        this.#uiWindowId = win.id;
        await chrome.windows.update(win.id, { focused: true });

        // Short debounce to ensure window has opened, focused, and settled
        setTimeout(() => {
            this.#isOpeningWindow = false;
            this.#uiWindowFocused = true;
        }, 150);
    }

    /**
     * Reset side panel
     */
    async resetSidePanel(tabId) {
        const config = this.configService.get();

        if (config.webUIOpenStyle !== "sidePanel") return;

        try {
            const { path } = await chrome.sidePanel.getOptions(tabId ? { tabId } : {});

            if (!path.endsWith(DEFAULT_UI_INDEX)) {
                const options = tabId ? { tabId, path: DEFAULT_UI_INDEX } : { path: DEFAULT_UI_INDEX };
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
            this.#uiWindowId = 0;
            this.#uiWindowBounds = null;
            this.#uiWindowFocused = false;
            this.#isOpeningWindow = false;
            this.#isClosingWindow = false;
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
