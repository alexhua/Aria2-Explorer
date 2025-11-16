/**
 * ConfigProvider - Configuration provider, manages unified config access
 */
import { DefaultConfigs } from "../config.js";

export class ConfigProvider {
    constructor() {
        this.config = { ...DefaultConfigs };
        this.remoteAria2List = null;
    }

    /**
     * Initialize configuration
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
     * Get configuration
     */
    getConfig() {
        return this.config;
    }

    /**
     * Update configuration
     */
    updateConfig(updates) {
        Object.assign(this.config, updates);
    }

    /**
     * Set remote Aria2 list reference
     */
    setRemoteAria2List(list) {
        this.remoteAria2List = list;
    }

    /**
     * Get remote Aria2 list
     */
    getRemoteAria2List() {
        return this.remoteAria2List;
    }
}
