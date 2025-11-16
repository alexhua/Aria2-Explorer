/**
 * CaptureManager - 负责下载捕获相关的逻辑
 */
import Utils from "../utils.js";
import { IconManager } from "../IconUtils/IconManager.js";

export class CaptureManager {
    constructor(configProvider, downloadManager, contextMenus) {
        this.configProvider = configProvider;
        this.downloadManager = downloadManager;
        this.contextMenus = contextMenus;
        this.altKeyPressed = false;
        this.currentTabUrl = "about:blank";
    }

    /**
     * 启用下载捕获
     */
    enable() {
        if (!this.isListening()) {
            chrome.downloads.onDeterminingFilename.addListener(this._captureDownload.bind(this));
        }
        IconManager.turnOn();
        this.configProvider.updateConfig({ integration: true });
        this.contextMenus.update("MENU_CAPTURE_DOWNLOAD", { checked: true });
    }

    /**
     * 禁用下载捕获
     */
    disable() {
        if (this.isListening()) {
            chrome.downloads.onDeterminingFilename.removeListener(this._captureDownload.bind(this));
        }
        const config = this.configProvider.getConfig();
        IconManager.turnOff(config.iconOffStyle);
        this.configProvider.updateConfig({ integration: false });
        this.contextMenus.update("MENU_CAPTURE_DOWNLOAD", { checked: false });
    }

    /**
     * 检查是否正在监听
     */
    isListening() {
        return chrome.downloads.onDeterminingFilename.hasListener(this._captureDownload.bind(this));
    }

    /**
     * 设置Alt键状态
     */
    setAltKeyPressed(pressed) {
        this.altKeyPressed = pressed;
    }

    /**
     * 设置当前标签页URL
     */
    setCurrentTabUrl(url) {
        this.currentTabUrl = url;
    }

    /**
     * 捕获下载
     */
    async _captureDownload(downloadItem, suggest) {
        const config = this.configProvider.getConfig();

        // 处理扩展下载提示
        if (downloadItem.byExtensionId) {
            suggest();
            this._showCaptureReminder(downloadItem);
        }

        // 使用finalUrl
        if (downloadItem.finalUrl && downloadItem.finalUrl !== "about:blank") {
            downloadItem.url = downloadItem.finalUrl;
        }

        if (!config.integration || !this._shouldCapture(downloadItem)) {
            return;
        }

        // 取消Chrome下载
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

        // 如果失败且是本地服务器，临时禁用捕获并使用浏览器下载
        if (!successful && Utils.isLocalhost(rpcItem.url)) {
            this.disable();
            chrome.downloads.download({ url: downloadItem.url }).then(() => this.enable());
        }
    }

    /**
     * 显示捕获提醒
     */
    _showCaptureReminder(downloadItem) {
        const config = this.configProvider.getConfig();
        
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
     * 判断是否应该捕获
     */
    _shouldCapture(downloadItem) {
        const config = this.configProvider.getConfig();
        
        // 检查Alt键
        if (this.altKeyPressed) {
            this.altKeyPressed = false;
            return false;
        }

        // 检查下载状态
        if (downloadItem.error || 
            downloadItem.state !== "in_progress" || 
            !/^(https?|s?ftp):/i.test(downloadItem.url)) {
            return false;
        }

        // 检查扩展ID
        if (downloadItem.byExtensionId === chrome.runtime.id) {
            return false;
        }

        // 检查扩展黑名单
        if (downloadItem.byExtensionId && 
            !config.allowedSites.includes(downloadItem.byExtensionId) &&
            (config.blockedSites.includes("*") || 
             config.blockedSites.includes(downloadItem.byExtensionId))) {
            return false;
        }

        const currentTabUrl = new URL(this.currentTabUrl);
        const url = new URL(downloadItem.referrer || downloadItem.url);

        // 检查白名单
        for (const pattern of config.allowedSites) {
            if (this._matchRule(currentTabUrl.hostname, pattern) || 
                this._matchRule(url.hostname, pattern)) {
                return true;
            }
        }

        // 检查黑名单
        for (const pattern of config.blockedSites) {
            if (this._matchRule(currentTabUrl.hostname, pattern) || 
                this._matchRule(url.hostname, pattern)) {
                return false;
            }
        }

        // 检查文件扩展名白名单
        for (const ext of config.allowedExts) {
            if (downloadItem.filename.endsWith(ext) || ext === "*") {
                return true;
            }
        }

        // 检查文件扩展名黑名单
        for (const ext of config.blockedExts) {
            if (downloadItem.filename.endsWith(ext) || ext === "*") {
                return false;
            }
        }

        // 检查文件大小
        return downloadItem.fileSize >= config.fileSize * 1024 * 1024;
    }

    /**
     * 匹配规则
     */
    _matchRule(str, rule) {
        return new RegExp("^" + rule.replaceAll('*', '.*') + "$").test(str);
    }
}
