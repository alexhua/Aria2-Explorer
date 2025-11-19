/**
 * ConfigProvider - Configuration provider, manages unified config access
 * Singleton pattern to ensure consistent config across the extension
 */
import { DefaultConfigs } from "../config.js";

export class ConfigProvider {
    static #instance = null;

    constructor() {
        // Enforce singleton pattern
        if (ConfigProvider.#instance) {
            return ConfigProvider.#instance;
        }

        this.config = { ...DefaultConfigs };
        this.remoteAria2List = null;
        
        ConfigProvider.#instance = this;
    }

    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!ConfigProvider.#instance) {
            ConfigProvider.#instance = new ConfigProvider();
        }
        return ConfigProvider.#instance;
    }

    /**
     * Initialize configuration
     */
    async init() {
        try {
            const configs = await chrome.storage.local.get();
            // Clear existing config and reassign to ensure fresh data
            this.config = { ...DefaultConfigs };
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
