/**
 * MonitorManager - Handles Aria2 monitoring logic
 */
import Utils from "../utils.js";
import Logger from "../logger.js";
import Aria2 from "../aria2.js";
import { ConfigService } from "../services/ConfigService.js";

const INTERVAL_SHORT = 1000;
const INTERVAL_LONG = 3000;

export class MonitorManager {
    constructor(notificationManager, contextMenus) {
        this.configService = ConfigService.getInstance();
        this.notificationManager = notificationManager;
        this.contextMenus = contextMenus;
        this.monitorId = null;
        this.monitorInterval = INTERVAL_LONG;
        this.remoteAria2List = [];
        // Share the same AnimationController instance with NotificationManager
        this.iconAnimController = notificationManager.getAnimationController();
    }

    /**
     * Initialize remote Aria2 list
     */
    initRemoteAria2List() {
        const config = this.configService.get();
        const uniqueRpcList = Utils.compactRpcList(config.rpcList);

        for (const i in uniqueRpcList) {
            this.remoteAria2List = this.remoteAria2List.slice(0, uniqueRpcList.length);
            const rpcItem = uniqueRpcList[i];
            const remote = Utils.parseUrl(rpcItem.url);
            remote.name = rpcItem.name;

            try {
                if (this.remoteAria2List[i]) {
                    this.remoteAria2List[i].setRemote(remote.name, remote.rpcUrl, remote.secretKey);
                } else {
                    this.remoteAria2List[i] = new Aria2(remote);
                }

                if (config.monitorAria2) {
                    this.remoteAria2List[i].regMessageHandler(
                        this.notificationManager.notifyTaskStatus.bind(this.notificationManager)
                    );
                } else {
                    this.remoteAria2List[i].unRegMessageHandler(
                        this.notificationManager.notifyTaskStatus.bind(this.notificationManager)
                    );
                }
            } catch (error) {
                Logger.error('Failed to initialize Aria2 RPC server', error.message);
            }
        }
    }

    /**
     * Enable monitoring
     */
    enable() {
        if (this.monitorId) {
            Logger.warn("Warn: Monitor has already started.");
            return;
        }

        this.#monitor();
        this.monitorId = setInterval(() => this.#monitor(), this.monitorInterval);
        // Only update menu if it exists
        try {
            this.contextMenus.update("MENU_MONITOR_ARIA2", { checked: true });
        } catch (error) {
            Logger.warn("Menu item MENU_MONITOR_ARIA2 not found:", error);
        }
    }

    /**
     * Disable monitoring
     */
    disable() {
        if (this.monitorId) {
            clearInterval(this.monitorId);
            this.monitorId = null;
        }

        this.remoteAria2List.forEach(aria2 => aria2.closeSocket());
        chrome.action.setBadgeText({ text: "" });
        chrome.action.setTitle({ title: "" });
        // Only update menu if it exists
        try {
            this.contextMenus.update("MENU_MONITOR_ARIA2", { checked: false });
        } catch (error) {
            Logger.warn("Menu item MENU_MONITOR_ARIA2 not found:", error);
        }
        chrome.power.releaseKeepAwake();
    }

    /**
     * Get remote Aria2 list
     */
    getRemoteAria2List() {
        return this.remoteAria2List;
    }

    /**
     * Monitor Aria2 servers
     */
    async #monitor() {
        const config = this.configService.get();
        const stats = {
            connected: 0,
            disconnected: 0,
            localConnected: 0,
            active: 0,
            stopped: 0,
            waiting: 0,
            uploadSpeed: 0,
            downloadSpeed: 0,
            errorMessage: ''
        };

        for (const i in this.remoteAria2List) {
            const remoteAria2 = this.remoteAria2List[i];

            try {
                remoteAria2.openSocket();
                const response = await remoteAria2.getGlobalStat();

                if (response?.error) {
                    throw response.error;
                }

                stats.connected++;
                if (remoteAria2.isLocalhost) stats.localConnected++;

                stats.active += Number(response.result.numActive);
                stats.stopped += Number(response.result.numStopped);
                stats.waiting += Number(response.result.numWaiting);
                stats.uploadSpeed += Number(response.result.uploadSpeed);
                stats.downloadSpeed += Number(response.result.downloadSpeed);

                // Handle progress animation (default Aria2 only)
                // Only show progress when there are active tasks
                if (i == 0 && response.result.percentActive) {
                    const numActive = Number(response.result.numActive);
                    const percent = response.result.percentActive;

                    if (numActive > 0 && !isNaN(percent)) {
                        this.iconAnimController.start('Progress', percent / 100);
                    }
                }
            } catch (error) {
                stats.disconnected++;
                if (i == 0) {
                    stats.errorMessage = this.#parseMonitorError(error);
                }
            } finally {
                if (!config.monitorAria2) {
                    remoteAria2.closeSocket();
                }
                if (!config.monitorAll) break;
            }
        }

        this.#updateMonitorInterval(stats.active);
        this.#updatePowerState(stats.active, stats.waiting, stats.localConnected);
        this.#updateIconAnimation(stats.active, stats.waiting);
        this.#updateBadgeAndTitle(stats);
    }

    /**
     * Parse monitor error
     */
    #parseMonitorError(error) {
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('unauthorized')) {
            return "Secret key is incorrect";
        } else if (msg.includes("failed to fetch")) {
            return "Aria2 server is unreachable";
        }
        return '';
    }

    /**
     * Update monitor interval
     */
    #updateMonitorInterval(active) {
        const newInterval = active > 0 ? INTERVAL_SHORT : INTERVAL_LONG;

        if (this.monitorInterval !== newInterval) {
            this.monitorInterval = newInterval;
            clearInterval(this.monitorId);
            this.monitorId = setInterval(() => this.#monitor(), this.monitorInterval);
        }
    }

    /**
     * Update power state
     */
    #updatePowerState(active, waiting, localConnected) {
        const config = this.configService.get();

        if (active > 0 && config.keepAwake && localConnected > 0) {
            chrome.power.requestKeepAwake("system");
        } else {
            chrome.power.releaseKeepAwake();
        }
    }

    /**
     * Update icon animation
     */
    #updateIconAnimation(active, waiting) {
        if (active === 0 && waiting > 0) {
            this.iconAnimController.start('Pause');
        }
    }

    /**
     * Update badge and title
     */
    #updateBadgeAndTitle(stats) {
        const config = this.configService.get();

        if (!config.monitorAria2) return;

        const { connected, disconnected, active, waiting, stopped, uploadSpeed, downloadSpeed, errorMessage, localConnected } = stats;

        let bgColor = 'green';
        let textColor = 'white';
        let text = '';
        let title = '';

        const connectedStr = chrome.i18n.getMessage("connected");
        const disconnectedStr = chrome.i18n.getMessage("disconnected");

        if (config.monitorAll) {
            title = `${connectedStr}: ${connected} ${disconnectedStr}: ${disconnected}\n`;
        }

        if (connected > 0) {
            text = this.#getBadgeText(active, waiting, connected);
            bgColor = this.#getBadgeColor(active, waiting, connected);
            textColor = (active === 0 && waiting === 0) ? '#666' : 'white';

            const uploadStr = chrome.i18n.getMessage("upload");
            const downloadStr = chrome.i18n.getMessage("download");
            const waitStr = chrome.i18n.getMessage("wait");
            const finishStr = chrome.i18n.getMessage("finish");

            const upSpeed = Utils.getReadableSpeed(uploadSpeed);
            const downSpeed = Utils.getReadableSpeed(downloadSpeed);

            title += `${downloadStr}: ${active}  ${waitStr}: ${waiting}  ${finishStr}: ${stopped}\n`;
            title += `${uploadStr}: ${upSpeed}  ${downloadStr}: ${downSpeed}`;
        } else {
            if (localConnected === 0) chrome.power.releaseKeepAwake();
            bgColor = "#A83030";
            text = 'E';
            title += config.monitorAll
                ? 'No Aria2 server is reachable.'
                : `Failed to connect with ${this.remoteAria2List[0].name}. ${errorMessage}.`;
        }

        chrome.action.setBadgeTextColor({ color: textColor });
        chrome.action.setBadgeBackgroundColor({ color: bgColor });
        chrome.action.setBadgeText({ text });
        chrome.action.setTitle({ title });
    }

    /**
     * Get badge text
     */
    #getBadgeText(active, waiting, connected) {
        const config = this.configService.get();

        if (!config.badgeText) return '';
        if (active > 0) return active.toString();
        if (waiting > 0) return waiting.toString();
        return '0';
    }

    /**
     * Get badge color
     */
    #getBadgeColor(active, waiting, connected) {
        const config = this.configService.get();

        if (active > 0) {
            return (config.monitorAll && connected < this.remoteAria2List.length)
                ? '#0077cc'
                : 'green';
        }
        if (waiting > 0) return '#AAA';
        return '#E1EEF5';
    }
}
