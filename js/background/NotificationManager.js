/**
 * NotificationManager - Handles notification logic
 */
import Utils from "../utils.js";
import { AnimationController } from '../IconUtils/AnimationController.js';

const NID_DEFAULT = "NID_DEFAULT";
const NID_TASK_NEW = "NID_TASK_NEW";
const NID_TASK_STOPPED = "NID_TASK_STOPPED";
const NID_CAPTURED_OTHERS = "NID_CAPTURED_OTHERS";

export class NotificationManager {
    constructor(configProvider) {
        this.configProvider = configProvider;
        this.iconAnimController = new AnimationController();
    }

    /**
     * Get the shared AnimationController instance
     * @returns {AnimationController}
     */
    getAnimationController() {
        return this.iconAnimController;
    }

    /**
     * Notify task status
     * @param {Object} data - Event data
     */
    async notifyTaskStatus(data) {
        const events = [
            "aria2.onDownloadComplete",
            "aria2.onBtDownloadComplete",
            "aria2.onDownloadError",
            "aria2.onExportSuccess",
            "aria2.onExportError"
        ];

        if (!data || !events.includes(data.method)) return;

        // Update icon animation
        this._updateIconAnimation(data.method);

        const config = this.configProvider.getConfig();
        if (!config.allowNotification) return;

        // Get context message
        const contextMessage = await this._getContextMessage(data);
        
        // Show notification
        this._showTaskNotification(data.method, data.source, data.gid, contextMessage);
    }

    /**
     * Update icon animation
     */
    _updateIconAnimation(event) {
        if (event.endsWith("ExportSuccess")) {
            this.iconAnimController.start("Download");
        } else if (event.endsWith("Complete")) {
            this.iconAnimController.start("Complete");
        } else if (event.endsWith("Error")) {
            this.iconAnimController.start("Error");
        }
    }

    /**
     * Get context message
     */
    async _getContextMessage(data) {
        if (data.contextMessage) {
            return data.contextMessage;
        }

        const gid = data.params?.length ? data.params[0]["gid"] : data.gid ?? '';
        if (!gid || !data.source) return '';

        try {
            const response = await data.source.tellStatus(gid, ["dir", "files", "bittorrent"]);
            if (!response?.result) return '';

            const result = response.result;
            const dir = Utils.formatFilepath(result.dir);
            const bittorrent = result.bittorrent;
            const files = result.files ?? [];

            let contextMessage = '';
            if (bittorrent?.info?.name) {
                contextMessage = dir + bittorrent.info.name;
            } else if (files.length && files[0].path) {
                contextMessage = Utils.formatFilepath(files[0].path, false);
            } else if (files.length && files[0].uris?.length) {
                contextMessage = dir + Utils.getFileNameFromUrl(files[0].uris[0].uri);
            }

            // Check if torrent is complete
            if (data.method === "aria2.onDownloadComplete" && 
                bittorrent && 
                !(contextMessage.startsWith("[METADATA]") || contextMessage.endsWith(".torrent"))) {
                data.method = "aria2.onSeedingComplete";
            }

            return contextMessage;
        } catch {
            console.warn("NotifyStatus: Can not get context message");
            return '';
        }
    }

    /**
     * Show task notification
     */
    _showTaskNotification(event, source, gid, contextMessage) {
        const config = this.configProvider.getConfig();
        const notificationData = this._getNotificationData(event, source, gid);

        if (!notificationData.message) return;

        const title = chrome.i18n.getMessage(notificationData.title);
        const message = chrome.i18n.getMessage(
            notificationData.message,
            source ? source.name : "Aria2"
        ) + notificationData.sign;
        const silent = config.keepSilent;

        Utils.showNotification(
            { title, message, contextMessage, silent },
            notificationData.nid
        );
    }

    /**
     * Get notification data
     */
    _getNotificationData(event, source, gid) {
        const data = {
            title: "taskNotification",
            message: '',
            sign: '',
            nid: ''
        };

        switch (event) {
            case "aria2.onDownloadStart":
                data.message = "DownloadStart";
                data.sign = ' ⬇️';
                data.nid = NID_DEFAULT + gid;
                break;
            case "aria2.onDownloadComplete":
                data.message = "DownloadComplete";
                data.sign = ' ✅';
                data.nid = NID_TASK_STOPPED + gid;
                break;
            case "aria2.onSeedingComplete":
                data.message = "SeedingOver";
                data.sign = ' ⬆️ ✅';
                data.nid = NID_DEFAULT + gid;
                break;
            case "aria2.onBtDownloadComplete":
                data.message = "DownloadComplete";
                data.sign = ' ✅';
                data.nid = NID_TASK_STOPPED + gid;
                break;
            case "aria2.onDownloadError":
                data.message = "DownloadError";
                data.sign = ' ❌';
                data.nid = NID_TASK_STOPPED + gid;
                break;
            case "aria2.onExportSuccess":
                data.title = "ExportSucceedStr";
                data.message = "ExportSucceedDes";
                data.sign = ' ⬇️';
                data.nid = NID_DEFAULT + gid;
                break;
            case "aria2.onExportError":
                data.title = "ExportFailedStr";
                data.message = "ExportFailedDes";
                data.sign = ' ❌';
                data.nid = NID_DEFAULT + (source?.RequestId || '');
                break;
        }

        return data;
    }
}

export { NID_DEFAULT, NID_TASK_NEW, NID_TASK_STOPPED, NID_CAPTURED_OTHERS };
