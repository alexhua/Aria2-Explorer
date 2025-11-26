import { ConfigService } from "../services/ConfigService.js";
import { UIController } from "./UIController.js";
import { RpcManager } from "./RpcManager.js";
import Utils from "../utils.js";
import Logger from "../logger.js";

/**
 * Options page app class
 */
class OptionsApp {
    constructor() {
        // ConfigService is a singleton
        this.configService = ConfigService.getInstance();
        this.rpcManager = new RpcManager();
        this.uiController = new UIController(this.rpcManager);
        this.configUnsubscriber = null;
    }

    /**
     * Initialize the application
     */
    async init() {
        // Check if storage upgrade is needed
        if (location.search.endsWith("upgrade-storage")) {
            await this.#upgradeStorage();
        }

        // Initialize configuration
        await this.configService.init();

        // Setup config change listener
        this.#setupConfigListener();

        // Initialize UI
        await this.uiController.init();

        // Bind button events
        this.#bindButtonEvents();
    }

    /**
     * Setup configuration change listener
     */
    #setupConfigListener() {
        // Unsubscribe previous listener if exists
        if (this.configUnsubscriber) {
            this.configUnsubscriber();
        }

        // Subscribe to all config changes
        this.configUnsubscriber = this.configService.subscribe((changes, config) => {
            Logger.log('[OptionsApp] Config changed:', changes);

            // Update UI with new config
            this.uiController.updateUI(config);

            // Handle RPC list changes
            if (changes.rpcList) {
                Logger.log('[OptionsApp] RPC list changed, calling updateAriaNgRpc');
                this.#updateAriaNgRpc(changes.rpcList);
            }

            // Handle magnet capture changes
            if (changes.captureMagnet !== undefined) {
                this.#toggleMagnetHandler(changes.captureMagnet);
            }
        });
    }

    /**
     * Bind button events
     */
    #bindButtonEvents() {
        // Save button
        $("#save").off().on("click", async () => {
            const formData = this.uiController.collectFormData();
            const success = await this.configService.set(formData);

            if (success) {
                this.uiController.showResult("save-result", "保存成功", true, 2000);
            } else {
                this.uiController.showResult("save-result", "保存失败：配置验证未通过", false, 5000);
            }
        });

        // Reset button
        $("#reset").off().on("click", async () => {
            if (!confirm(chrome.i18n.getMessage("ClearSettingsDes"))) {
                return;
            }

            const success = await this.configService.reset();
            if (success) {
                this.uiController.showResult("reset-result", "重置成功", true, 2000);
                await this.init();
            } else {
                this.uiController.showResult("reset-result", "重置失败", false, 5000);
            }
        });

        // Upload button
        $("#upload").off().on("click", async () => {
            const result = await this.#uploadConfig();
            this.uiController.showResult(
                "sync-result",
                result.message,
                result.success,
                result.success ? 2000 : 5000
            );
        });

        // Download button
        $("#download").off().on("click", async () => {
            const result = await this.#downloadConfig();
            this.uiController.showResult(
                "sync-result",
                result.message,
                result.success,
                result.success ? 2000 : 5000
            );
        });

        // Export button
        $("#exportConfig").off().on("click", () => {
            const json = this.configService.export();
            this.#downloadFile(json, `aria2-explorer-config-${new Date().toISOString().slice(0, 10)}.json`);
            this.uiController.showResult(
                "import-export-result",
                chrome.i18n.getMessage("exportConfigSuccess"),
                true,
                2000
            );
        });

        // Import button
        $("#importConfig").off().on("click", () => {
            $("#configFileInput").click();
        });

        // File input
        $("#configFileInput").off().on("change", async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();

                if (!confirm(chrome.i18n.getMessage("importConfigConfirm"))) {
                    event.target.value = '';
                    return;
                }

                const success = await this.configService.import(text);

                this.uiController.showResult(
                    "import-export-result",
                    success ? chrome.i18n.getMessage("importConfigSuccess") : chrome.i18n.getMessage("importConfigFailed"),
                    success,
                    success ? 2000 : 5000
                );

                if (success) {
                    await this.init();
                }
            } catch (error) {
                Logger.error("Import error:", error);
                this.uiController.showResult(
                    "import-export-result",
                    chrome.i18n.getMessage("importConfigFailed") + `: ${error.message}`,
                    false,
                    5000
                );
            }

            event.target.value = '';
        });
    }

    /**
     * Upload config to cloud
     */
    async #uploadConfig() {
        const config = this.configService.get();

        // Add AriaNG options
        try {
            const ariaNgOptionsValue = localStorage.getItem("AriaNg.Options");
            if (ariaNgOptionsValue) {
                config.ariaNgOptions = JSON.parse(ariaNgOptionsValue);
            }
        } catch {
            Logger.warn("Upload: Local AriaNG options is invalid");
        }

        // Check RPC list validity
        if (!config.rpcList || !config.rpcList.length) {
            const str = chrome.i18n.getMessage("uploadConfigWarn");
            if (!confirm(str)) {
                return { success: false };
            }
        }

        try {
            await chrome.storage.sync.set(config);
            return {
                success: true,
                message: chrome.i18n.getMessage("uploadConfigSucceed")
            };
        } catch (error) {
            let message = error.message;
            if (message.includes("QUOTA_BYTES_PER_ITEM")) {
                message = "Exceeded Quota (8KB). Please refine the Aria2 BT trackers.";
            }
            return {
                success: false,
                message: chrome.i18n.getMessage("uploadConfigFailed") + ` (${message})`
            };
        }
    }

    /**
     * Download config from cloud
     */
    async #downloadConfig() {
        try {
            const configs = await chrome.storage.sync.get();

            if (Object.keys(configs).length === 0) {
                throw new TypeError("Invalid extension configs");
            }

            // Handle AriaNG options
            if (configs.ariaNgOptions) {
                try {
                    if (typeof configs.ariaNgOptions === "string") {
                        configs.ariaNgOptions = JSON.parse(configs.ariaNgOptions);
                    }
                    localStorage.setItem("AriaNg.Options", JSON.stringify(configs.ariaNgOptions));
                } catch {
                    Logger.warn("Download: AriaNG options is invalid");
                }
                delete configs.ariaNgOptions;
            }

            await this.configService.set(configs);

            return {
                success: true,
                message: chrome.i18n.getMessage("downloadConfigSucceed")
            };
        } catch (error) {
            return {
                success: false,
                message: chrome.i18n.getMessage("downloadConfigFailed")
            };
        }
    }

    /**
     * Download file
     */
    #downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Check if RPC list changed
     */
    #isRpcListChanged(oldList, newList) {
        if (!oldList || !newList) return false;
        if (oldList.length !== newList.length) return true;

        for (let i in newList) {
            if (newList[i].name !== oldList[i].name ||
                newList[i].url !== oldList[i].url ||
                (newList[i].pattern === '*' && oldList[i].pattern !== '*')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Update AriaNG RPC config
     */
    #updateAriaNgRpc(rpcList) {
        const AriaNgOptionsKey = "AriaNg.Options";
        let oldAriaNgOptions = localStorage[AriaNgOptionsKey];
        let ariaNgOptions = null;

        try {
            ariaNgOptions = JSON.parse(oldAriaNgOptions);
        } catch (error) {
            Logger.warn("The stored AriaNG options is null or invalid.");
        }

        if (Utils.exportRpcToAriaNg) {
            const newAriaNgOptions = JSON.stringify(Utils.exportRpcToAriaNg(rpcList, ariaNgOptions));
            const str = chrome.i18n.getMessage("OverwriteAriaNgRpcWarn");

            if (newAriaNgOptions !== oldAriaNgOptions && confirm(str)) {
                localStorage[AriaNgOptionsKey] = newAriaNgOptions;
            }
        }
    }

    /**
     * Toggle magnet link handler
     */
    #toggleMagnetHandler(flag) {
        const magnetPage = chrome.runtime.getURL("magnet.html") + "?action=magnet&url=%s";

        if (flag) {
            try {
                navigator.registerProtocolHandler("magnet", magnetPage, "Capture Magnet");
            } catch (error) {
                Logger.warn("Failed to register magnet handler:", error);
            }
        } else {
            try {
                navigator.unregisterProtocolHandler("magnet", magnetPage);
            } catch (error) {
                Logger.warn("Failed to unregister magnet handler:", error);
            }
        }
    }

    /**
     * Upgrade storage (migrate from localStorage to chrome.storage)
     */
    async #upgradeStorage() {
        const configs = await chrome.storage.local.get("rpcList");
        if (configs.rpcList) return;

        const convertMap = {
            white_site: "allowedSites",
            black_site: "blockedSites",
            white_ext: "allowedExts",
            black_ext: "blockedExts",
            rpc_list: "rpcList",
            newwindow: "window",
            newtab: "tab"
        };

        const newConfigs = {};

        for (let [k, v] of Object.entries(localStorage)) {
            if (convertMap[k]) k = convertMap[k];
            if (convertMap[v]) v = convertMap[v];
            if (k.startsWith("AriaNg")) continue;

            if (v === "true") {
                newConfigs[k] = true;
            } else if (v === "false") {
                newConfigs[k] = false;
            } else if (/\[.*\]|\{.*\}/.test(v)) {
                newConfigs[k] = JSON.parse(v);
            } else {
                newConfigs[k] = v;
            }
        }

        await this.configService.set(newConfigs);
        Logger.log("Storage upgrade completed.");
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Cleanup config listener
        if (this.configUnsubscriber) {
            this.configUnsubscriber();
            this.configUnsubscriber = null;
        }

        // Cleanup UI controller
        if (this.uiController) {
            this.uiController.cleanup();
        }

        Logger.log('[OptionsApp] Cleanup completed');
    }
}

// Create and initialize the application
const app = new OptionsApp();

window.onload = () => {
    app.init().catch(error => {
        Logger.error("Failed to initialize options page:", error);
    });
};

window.onbeforeunload = () => {
    app.cleanup();
};