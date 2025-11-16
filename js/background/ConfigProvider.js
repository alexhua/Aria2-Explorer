/**
 * ConfigProvider - 配置提供者，统一管理配置访问
 */
import { DefaultConfigs } from "../config.js";

export class ConfigProvider {
    constructor() {
        this.config = { ...DefaultConfigs };
        this.remoteAria2List = null;
    }

    /**
     * 初始化配置
     */
    async init() {
        try {
            const configs = await chrome.storage.local.get();
            Object.assign(this.config, configs);
        } catch (error) {
            console.error("ConfigProvider init error:", error);
        }
    }

    /**
     * 获取配置
     */
    getConfig() {
        return this.config;
    }

    /**
     * 更新配置
     */
    updateConfig(updates) {
        Object.assign(this.config, updates);
    }

    /**
     * 设置远程Aria2列表引用
     */
    setRemoteAria2List(list) {
        this.remoteAria2List = list;
    }

    /**
     * 获取远程Aria2列表
     */
    getRemoteAria2List() {
        return this.remoteAria2List;
    }
}
