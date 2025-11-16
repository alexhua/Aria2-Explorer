/**
 * ConfigManager - 配置管理器
 */
import Utils from "../utils.js";
import { DefaultConfigs, DefaultAriaNgOptions } from "../config.js";

const AriaNgOptionsKey = "AriaNg.Options";

export class ConfigManager {
    constructor() {
        this.config = { ...DefaultConfigs };
    }

    /**
     * 初始化配置
     */
    async init() {
        try {
            const configs = await chrome.storage.local.get();
            Object.assign(this.config, DefaultConfigs, configs);
        } catch (error) {
            console.error("ConfigManager init error:", error);
        }
    }

    /**
     * 获取配置
     */
    getConfig() {
        return this.config;
    }

    /**
     * 保存配置
     */
    async save(formData) {
        // 更新RPC列表
        this.config.rpcList = formData.rpcList;

        // 更新复选框配置
        for (const [key, value] of Object.entries(formData.checkboxes)) {
            if (this.config.hasOwnProperty(key)) {
                this.config[key] = value;
            }
        }

        // 更新输入框配置
        for (const [key, value] of Object.entries(formData.inputs)) {
            if (this.config.hasOwnProperty(key)) {
                this.config[key] = value;
            }
        }

        // 更新单选按钮配置
        this.config.webUIOpenStyle = formData.webUIOpenStyle;
        this.config.iconOffStyle = formData.iconOffStyle;

        // 更新文本域配置
        for (const [key, value] of Object.entries(formData.textareas)) {
            const tempSet = new Set(value.trim().split("\n").filter(item => item));
            this.config[key] = Array.from(tempSet);
        }

        // 保存到存储
        await chrome.storage.local.set(this.config);
    }

    /**
     * 重置配置
     */
    async reset() {
        const confirmed = confirm(chrome.i18n.getMessage("ClearSettingsDes"));
        if (!confirmed) return false;

        localStorage.clear();
        await chrome.storage.local.clear();
        await chrome.storage.local.set(DefaultConfigs);
        return true;
    }

    /**
     * 上传配置到云端
     */
    async upload() {
        try {
            // 获取AriaNG选项
            let ariaNgOptionsValue = localStorage.getItem(AriaNgOptionsKey);
            if (typeof ariaNgOptionsValue === "string") {
                this.config.ariaNgOptions = JSON.parse(ariaNgOptionsValue);
            }
        } catch {
            this.config.ariaNgOptions = DefaultAriaNgOptions;
            console.warn("Upload: Local AriaNG options is invalid, default is loaded.");
        }

        // 检查RPC列表有效性
        if (!this.config.rpcList || !this.config.rpcList.length) {
            const str = chrome.i18n.getMessage("uploadConfigWarn");
            if (!confirm(str)) return { success: false };
        }

        try {
            await chrome.storage.sync.set(this.config);
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
     * 从云端下载配置
     */
    async download() {
        try {
            const configs = await chrome.storage.sync.get();
            
            if (Object.keys(configs).length === 0) {
                throw new TypeError("Invalid extension configs");
            }

            // 处理AriaNG选项
            if (configs.ariaNgOptions) {
                try {
                    if (typeof configs.ariaNgOptions === "string") {
                        configs.ariaNgOptions = JSON.parse(configs.ariaNgOptions);
                    }
                    
                    const optionsLength = Object.keys(configs.ariaNgOptions).length;
                    const defaultLength = Object.keys(DefaultAriaNgOptions).length;
                    
                    if (optionsLength >= defaultLength) {
                        localStorage.setItem(AriaNgOptionsKey, JSON.stringify(configs.ariaNgOptions));
                    } else {
                        throw new TypeError("Invalid AriaNG options");
                    }
                } catch {
                    delete configs.ariaNgOptions;
                    console.warn("Download: AriaNG options is invalid.");
                }
            }

            Object.assign(this.config, configs);
            await chrome.storage.local.set(this.config);

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
     * 导出配置到文件
     */
    export() {
        const configData = {};

        // 复制所有非函数属性
        for (const key in this.config) {
            if (typeof this.config[key] !== 'function') {
                configData[key] = this.config[key];
            }
        }

        // 添加AriaNG选项
        try {
            const ariaNgOptionsValue = localStorage.getItem(AriaNgOptionsKey);
            if (typeof ariaNgOptionsValue === "string") {
                configData.ariaNgOptions = JSON.parse(ariaNgOptionsValue);
            }
        } catch {
            configData.ariaNgOptions = DefaultAriaNgOptions;
        }

        const dataStr = JSON.stringify(configData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `aria2-explorer-config-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return {
            success: true,
            message: chrome.i18n.getMessage("exportConfigSuccess")
        };
    }

    /**
     * 从文件导入配置
     */
    async import(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const configData = JSON.parse(e.target.result);

                    if (!configData || typeof configData !== 'object') {
                        throw new Error('Invalid config format');
                    }

                    const confirmMsg = chrome.i18n.getMessage("importConfigConfirm");
                    if (!confirm(confirmMsg)) {
                        resolve({ success: false, cancelled: true });
                        return;
                    }

                    // 导入AriaNG选项
                    if (configData.ariaNgOptions) {
                        try {
                            localStorage.setItem(AriaNgOptionsKey, JSON.stringify(configData.ariaNgOptions));
                        } catch (error) {
                            console.warn("Failed to import AriaNG options:", error);
                        }
                        delete configData.ariaNgOptions;
                    }

                    // 合并配置
                    Object.assign(this.config, DefaultConfigs, configData);
                    await chrome.storage.local.set(this.config);

                    resolve({
                        success: true,
                        message: chrome.i18n.getMessage("importConfigSuccess")
                    });
                } catch (error) {
                    console.error("Import config error:", error);
                    resolve({
                        success: false,
                        message: chrome.i18n.getMessage("importConfigFailed") + ` (${error.message})`
                    });
                }
            };

            reader.onerror = () => {
                resolve({
                    success: false,
                    message: chrome.i18n.getMessage("importConfigFailed")
                });
            };

            reader.readAsText(file);
        });
    }

    /**
     * 检查RPC列表是否改变
     */
    isRpcListChanged(oldList, newList) {
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
     * 更新AriaNG RPC配置
     */
    updateAriaNgRpc(rpcList) {
        let oldAriaNgOptions = localStorage[AriaNgOptionsKey];
        let ariaNgOptions = null;

        try {
            ariaNgOptions = JSON.parse(oldAriaNgOptions);
        } catch (error) {
            console.warn("The stored AriaNG options is null or invalid.");
        }

        const newAriaNgOptions = JSON.stringify(Utils.exportRpcToAriaNg(rpcList, ariaNgOptions));
        const str = chrome.i18n.getMessage("OverwriteAriaNgRpcWarn");

        if (newAriaNgOptions !== oldAriaNgOptions && confirm(str)) {
            localStorage[AriaNgOptionsKey] = newAriaNgOptions;
        }
    }
}
