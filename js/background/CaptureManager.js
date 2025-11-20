/**
 * CaptureManager - Handles download capture logic
 */
import Utils from "../utils.js";
import Logger from "../logger.js";
import { IconManager } from "../IconUtils/IconManager.js";
import { ConfigService } from "../services/ConfigService.js";

export class CaptureManager {
    constructor(downloadManager, contextMenus) {
        this.configService = ConfigService.getInstance();
        this.downloadManager = downloadManager;
        this.contextMenus = contextMenus;
        this.altKeyPressed = false;
        this.currentTabUrl = "about:blank";
        
        // Bind captureDownload to preserve 'this' context
        this.captureDownload = this.captureDownload.bind(this);
    }

    /**
     * Enable download capture
     */
    enable() {
        if (!this.isListening()) {
            chrome.downloads.onDeterminingFilename.addListener(this.captureDownload);
        }
        IconManager.turnOn();
        // Only update menu if it exists
        try {
            this.contextMenus.update("MENU_CAPTURE_DOWNLOAD", { checked: true });
        } catch (error) {
            Logger.warn("Menu item MENU_CAPTURE_DOWNLOAD not found:", error);
        }
    }

    /**
     * Disable download capture
     */
    disable() {
        if (this.isListening()) {
            chrome.downloads.onDeterminingFilename.removeListener(this.captureDownload);
        }
        const iconOffStyle = this.configService.get('iconOffStyle');
        IconManager.turnOff(iconOffStyle);
        // Only update menu if it exists
        try {
            this.contextMenus.update("MENU_CAPTURE_DOWNLOAD", { checked: false });
        } catch (error) {
            Logger.warn("Menu item MENU_CAPTURE_DOWNLOAD not found:", error);
        }
    }

    /**
     * Check if currently listening
     */
    isListening() {
        return chrome.downloads.onDeterminingFilename.hasListener(this.captureDownload);
    }

    /**
     * Set Alt key pressed state
     */
    setAltKeyPressed(pressed) {
        this.altKeyPressed = pressed;
    }

    /**
     * Set current tab URL
     */
    setCurrentTabUrl(url) {
        this.currentTabUrl = url;
    }

    /**
     * Capture download
     */
    async captureDownload(downloadItem, suggest) {
        const config = this.configService.get();

        // Handle extension download reminder
        if (downloadItem.byExtensionId) {
            suggest();
            this.#showCaptureReminder(downloadItem);
        }

        // Use finalUrl if available
        if (downloadItem.finalUrl && downloadItem.finalUrl !== "about:blank") {
            downloadItem.url = downloadItem.finalUrl;
        }

        if (!config.integration || !this.#shouldCapture(downloadItem)) {
            return;
        }

        // Cancel Chrome download
        chrome.downloads.cancel(downloadItem.id).then(() => {
            if (chrome.runtime.lastError) {
                chrome.runtime.lastError = null;
            }
        });

        if (downloadItem.referrer === "about:blank") {
            downloadItem.referrer = "";
        }

        const rpcItem = this.downloadManager.getRpcServer(downloadItem.url + downloadItem.filename);
        const successful = await this.downloadManager.download(downloadItem, rpcItem);

        // If failed and is localhost, temporarily disable capture and use browser download
        if (!successful && Utils.isLocalhost(rpcItem.url)) {
            this.disable();
            chrome.downloads.download({ url: downloadItem.url }).then(() => this.enable());
        }
    }

    /**
     * Show capture reminder
     */
    #showCaptureReminder(downloadItem) {
        const config = this.configService.get();
        
        if (!config.remindCaptureTip || downloadItem.byExtensionId === chrome.runtime.id) {
            return;
        }

        const title = chrome.i18n.getMessage("RemindCaptureTip");
        const message = chrome.i18n.getMessage("RemindCaptureTipDes");
        const btnTitle1 = chrome.i18n.getMessage("Dismiss");
        const btnTitle2 = chrome.i18n.getMessage("NeverRemind");
        const buttons = [{ title: btnTitle1 }, { title: btnTitle2 }];
        
        Utils.showNotification(
            { title, message, buttons, requireInteraction: true },
            "NID_CAPTURED_OTHERS"
        );
    }

    /**
     * Determine if download should be captured
     */
    #shouldCapture(downloadItem) {
        const config = this.configService.get();
        
        // Check Alt key
        if (this.altKeyPressed) {
            this.altKeyPressed = false;
            return false;
        }

        // Check download state
        if (downloadItem.error || 
            downloadItem.state !== "in_progress" || 
            !/^(https?|s?ftp):/i.test(downloadItem.url)) {
            return false;
        }

        // Check extension ID
        if (downloadItem.byExtensionId === chrome.runtime.id) {
            return false;
        }

        // Check extension blacklist
        if (downloadItem.byExtensionId && 
            !config.allowedSites.includes(downloadItem.byExtensionId) &&
            (config.blockedSites.includes("*") || 
             config.blockedSites.includes(downloadItem.byExtensionId))) {
            return false;
        }

        const currentTabUrl = new URL(this.currentTabUrl);
        const url = new URL(downloadItem.referrer || downloadItem.url);

        // Check whitelist
        for (const pattern of config.allowedSites) {
            if (this.#matchRule(currentTabUrl.hostname, pattern) || 
                this.#matchRule(url.hostname, pattern)) {
                return true;
            }
        }

        // Check blacklist
        for (const pattern of config.blockedSites) {
            if (this.#matchRule(currentTabUrl.hostname, pattern) || 
                this.#matchRule(url.hostname, pattern)) {
                return false;
            }
        }

        // Check file extension whitelist
        for (const ext of config.allowedExts) {
            if (downloadItem.filename.endsWith(ext) || ext === "*") {
                return true;
            }
        }

        // Check file extension blacklist
        for (const ext of config.blockedExts) {
            if (downloadItem.filename.endsWith(ext) || ext === "*") {
                return false;
            }
        }

        // Check file size
        return downloadItem.fileSize >= config.fileSize * 1024 * 1024;
    }

    /**
     * Match rule pattern
     */
    #matchRule(str, rule) {
        return new RegExp("^" + rule.replaceAll('*', '.*') + "$").test(str);
    }
}
