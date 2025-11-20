/**
 * DownloadManager - Handles all download-related logic
 */
import Utils from "../utils.js";
import Logger from "../logger.js";
import Aria2 from "../aria2.js";
import Aria2Options from "../aria2Options.js";
import { ConfigService } from "../services/ConfigService.js";

export class DownloadManager {
    constructor(uiManager, notificationManager) {
        this.configService = ConfigService.getInstance();
        this.uiManager = uiManager;
        this.notificationManager = notificationManager;
    }

    /**
     * Execute download task
     * @param {Object} downloadItem - Download item
     * @param {Object} rpcItem - RPC server configuration
     * @returns {Promise<boolean>}
     */
    async download(downloadItem, rpcItem) {
        if (!downloadItem?.url) {
            Logger.warn("Download: Invalid download item, download request is dismissed!");
            return false;
        }

        downloadItem.multiTask = downloadItem.multiTask ?? downloadItem.url.includes('\n');

        if (downloadItem.type === "DOWNLOAD_VIA_BROWSER") {
            return await this.#downloadViaBrowser(downloadItem);
        }

        rpcItem = rpcItem || this.getRpcServer(downloadItem.url + downloadItem.filename);
        downloadItem.dir = rpcItem.location;
        downloadItem.filename = downloadItem.filename || '';

        const config = this.configService.get();
        if (config.askBeforeDownload || downloadItem.multiTask) {
            try {
                await this.uiManager.launchUI(downloadItem);
                return true;
            } catch (error) {
                Logger.warn("Download: Launch UI failed.");
                return false;
            }
        }

        return await this.send2Aria(downloadItem, rpcItem);
    }

    /**
     * Download via browser
     */
    async #downloadViaBrowser(downloadItem) {
        try {
            if (downloadItem.multiTask) {
                const urls = downloadItem.url.split('\n');
                for (const url of urls) {
                    await chrome.downloads.download({ url });
                }
            } else {
                await chrome.downloads.download({ 
                    url: downloadItem.url, 
                    filename: downloadItem.filename 
                });
            }
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Send to Aria2
     */
    async send2Aria(downloadItem, rpcItem) {
        const cookieItems = await this.#getCookies(downloadItem, rpcItem);
        const headers = this.#buildHeaders(cookieItems);
        const options = await this.#buildAria2Options(downloadItem, rpcItem, headers);

        const remote = Utils.parseUrl(rpcItem.url);
        remote.name = rpcItem.name;
        const aria2 = new Aria2(remote);

        try {
            const response = await aria2.addUri(downloadItem.url, options);
            
            if (response?.error) {
                throw response.error;
            }

            await this.#setGlobalOptions(aria2, rpcItem.url);
            
            const contextMessage = this.#buildContextMessage(downloadItem, options);
            this.notificationManager.notifyTaskStatus({
                method: "aria2.onExportSuccess",
                source: aria2,
                gid: response.result,
                contextMessage
            });

            return true;
        } catch (error) {
            const contextMessage = this.#parseErrorMessage(error);
            this.notificationManager.notifyTaskStatus({
                method: "aria2.onExportError",
                source: aria2,
                contextMessage
            });
            return false;
        }
    }

    /**
     * Get cookies
     */
    async #getCookies(downloadItem, rpcItem) {
        try {
            const config = this.configService.get();
            if (!rpcItem.ignoreInsecure && !Utils.isLocalhost(rpcItem.url) && !/^(https|wss)/i.test(rpcItem.url)) {
                return [];
            }

            const storeId = chrome.extension.inIncognitoContext ? "1" : "0";
            const url = downloadItem.multiTask ? downloadItem.referrer : downloadItem.url;
            const cookies = await chrome.cookies.getAll({ url, storeId });
            
            return cookies.map(cookie => `${cookie.name}=${cookie.value}`);
        } catch (error) {
            Logger.warn(error.message);
            return [];
        }
    }

    /**
     * Build request headers
     */
    #buildHeaders(cookieItems) {
        const headers = [];
        if (cookieItems.length > 0) {
            headers.push("Cookie: " + cookieItems.join("; "));
        }
        headers.push("User-Agent: " + navigator.userAgent);
        return headers;
    }

    /**
     * Build Aria2 options
     */
    async #buildAria2Options(downloadItem, rpcItem, headers) {
        let options = await Aria2Options.getUriTaskOptions(rpcItem.url);
        
        if (options.header) {
            const existingHeaders = options.header.split('\n')
                .filter(item => !/^(cookie|user-agent|connection)/i.test(item));
            options.header = [...headers, ...existingHeaders];
        } else {
            options.header = headers;
        }

        if (downloadItem.referrer) options.referer = downloadItem.referrer;
        if (downloadItem.filename) options.out = downloadItem.filename;
        if (downloadItem.dir) options.dir = downloadItem.dir;
        if (downloadItem.options) {
            Object.assign(options, downloadItem.options);
        }

        return options;
    }

    /**
     * Set global options
     */
    async #setGlobalOptions(aria2, rpcUrl) {
        const globalOptions = await Aria2Options.getGlobalOptions(rpcUrl);
        if (Object.keys(globalOptions).length > 0) {
            aria2.setGlobalOptions(globalOptions);
        }
    }

    /**
     * Build context message
     */
    #buildContextMessage(downloadItem, options) {
        const filename = downloadItem.filename || Utils.getFileNameFromUrl(downloadItem.url);
        return Utils.formatFilepath(options.dir) + filename;
    }

    /**
     * Parse error message
     */
    #parseErrorMessage(error) {
        if (!error?.message) return '';
        
        const msg = error.message.toLowerCase();
        if (msg.includes('unauthorized')) {
            return "Secret key is incorrect.";
        } else if (msg.includes("failed to fetch")) {
            return "Aria2 server is unreachable.";
        }
        return "Error:" + error.message;
    }

    /**
     * Get matching RPC server
     */
    getRpcServer(url) {
        const config = this.configService.get();
        const rpcList = config.rpcList;
        
        let defaultIndex = 0;
        for (let i = 1; i < rpcList.length; i++) {
            const patternStr = rpcList[i].pattern;
            if (patternStr === '*') {
                defaultIndex = i;
                continue;
            }
            
            const patterns = patternStr.split(',');
            for (let pattern of patterns) {
                pattern = pattern.trim();
                if (this.#matchRule(url, pattern)) {
                    return rpcList[i];
                }
            }
        }
        
        return rpcList[defaultIndex];
    }

    /**
     * Match rule
     */
    #matchRule(str, rule) {
        return new RegExp("^" + rule.replaceAll('*', '.*') + "$").test(str);
    }
}
