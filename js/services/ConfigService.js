/**
 * ConfigService - Unified configuration management service
 * Singleton pattern with event-driven architecture
 * 
 * Features:
 * - Single source of truth for all configuration
 * - Automatic synchronization across contexts
 * - Event-driven updates
 * - Configuration validation
 * - Type safety
 */

import Logger from "../logger.js";
import DefaultConfigs from "../config.js";

export class ConfigService {
    static #instance = null;

    constructor() {
        // Enforce singleton
        if (ConfigService.#instance) {
            return ConfigService.#instance;
        }

        this.config = { ...DefaultConfigs };
        this.listeners = new Map(); // key -> Set<listener>
        this.globalListeners = new Set();
        this.initialized = false;
        this.pendingUpdates = new Set(); // Track updates to prevent duplicate notifications

        // Setup storage listener
        this.#setupStorageListener();

        ConfigService.#instance = this;
    }

    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!ConfigService.#instance) {
            ConfigService.#instance = new ConfigService();
        }
        return ConfigService.#instance;
    }

    /**
     * Initialize configuration from storage
     */
    async init() {
        if (this.initialized) {
            return this.config;
        }

        try {
            const data = await chrome.storage.local.get();
            this.config = { ...DefaultConfigs, ...data };
            this.initialized = true;
            Logger.log('[ConfigService] Initialized with config:', this.config);
            return this.config;
        } catch (error) {
            Logger.error('[ConfigService] Init error:', error);
            throw error;
        }
    }

    /**
     * Get configuration value(s)
     * @param {string} [key] - Optional key to get specific value
     * @returns {any} Configuration value or entire config object
     */
    get(key) {
        if (key !== undefined) {
            return this.config[key];
        }
        // Return a shallow copy to prevent replacing the entire config object
        // but allow modification of nested objects/arrays for performance
        return { ...this.config };
    }

    /**
     * Set configuration value(s)
     * This is the ONLY method that should modify configuration
     * @param {Object} updates - Configuration updates
     * @param {Object} options - Optional settings
     * @returns {Promise<boolean>} Success status
     */
    async set(updates, options = {}) {
        if (!updates || typeof updates !== 'object') {
            Logger.error('[ConfigService] Invalid updates:', updates);
            return false;
        }

        try {
            // Validate updates
            const validated = this.#validate(updates);

            if (Object.keys(validated).length === 0) {
                Logger.warn('[ConfigService] No valid updates to apply');
                return false;
            }

            // Update memory
            Object.assign(this.config, validated);

            // Set flag to prevent duplicate notification from storage.onChanged
            // Must be set BEFORE storage call to handle immediate events
            this.#setUpdateFlag(validated);

            // Save to storage
            await chrome.storage.local.set(validated);

            // Notify listeners immediately
            this.#notifyListeners(validated);

            Logger.log('[ConfigService] Config updated:', validated);
            return true;
        } catch (error) {
            Logger.error('[ConfigService] Set error:', error);
            return false;
        }
    }

    /**
     * Subscribe to configuration changes
     * @param {Function|string} keyOrListener - Key to watch or listener function
     * @param {Function} [listener] - Listener function if first param is key
     * @returns {Function} Unsubscribe function
     */
    subscribe(keyOrListener, listener) {
        // subscribe(listener) - global listener
        if (typeof keyOrListener === 'function') {
            this.globalListeners.add(keyOrListener);
            return () => {
                this.globalListeners.delete(keyOrListener);
            };
        }

        // subscribe(key, listener) - key-specific listener
        if (typeof keyOrListener === 'string' && typeof listener === 'function') {
            const key = keyOrListener;
            if (!this.listeners.has(key)) {
                this.listeners.set(key, new Set());
            }
            this.listeners.get(key).add(listener);

            return () => {
                const keyListeners = this.listeners.get(key);
                if (keyListeners) {
                    keyListeners.delete(listener);
                    if (keyListeners.size === 0) {
                        this.listeners.delete(key);
                    }
                }
            };
        }

        Logger.error('[ConfigService] Invalid subscribe arguments');
        return () => { };
    }

    /**
     * Reset configuration to defaults
     */
    async reset() {
        try {
            await chrome.storage.local.clear();
            await chrome.storage.local.set(DefaultConfigs);
            this.config = { ...DefaultConfigs };
            this.#notifyListeners(this.config);
            Logger.log('[ConfigService] Config reset to defaults');
            return true;
        } catch (error) {
            Logger.error('[ConfigService] Reset error:', error);
            return false;
        }
    }

    /**
     * Export configuration as JSON string
     */
    export() {
        const exportData = {};

        // Copy all non-function properties
        for (const key in this.config) {
            if (typeof this.config[key] !== 'function') {
                exportData[key] = this.config[key];
            }
        }

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import configuration from JSON string or object
     */
    async import(data) {
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;

            if (!parsed || typeof parsed !== 'object') {
                throw new Error('Invalid import data');
            }

            await this.set(parsed);
            Logger.log('[ConfigService] Config imported successfully');
            return true;
        } catch (error) {
            Logger.error('[ConfigService] Import error:', error);
            return false;
        }
    }

    /**
     * Setup storage change listener
     * Handles changes from other contexts (e.g., options page -> background)
     */
    #setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local') return;

            const updates = {};
            for (const [key, { newValue }] of Object.entries(changes)) {
                // Skip if this change was initiated by us
                if (this.#hasUpdateFlag(key)) {
                    continue;
                }

                // Update memory
                this.config[key] = newValue;
                updates[key] = newValue;
            }

            if (Object.keys(updates).length === 0) {
                return; // All changes were from us, skip notification
            }

            // Notify listeners
            // Note: This will be called for changes from other contexts
            this.#notifyListeners(updates);

            Logger.log('[ConfigService] Storage changed from external source:', updates);
        });
    }

    /**
     * Set update flag to prevent duplicate notifications
     */
    #setUpdateFlag(changes) {
        for (const key of Object.keys(changes)) {
            this.pendingUpdates.add(key);
        }

        // Clear flags after a short delay
        setTimeout(() => {
            for (const key of Object.keys(changes)) {
                this.pendingUpdates.delete(key);
            }
        }, 100);
    }

    /**
     * Check if key has pending update flag
     */
    #hasUpdateFlag(key) {
        return this.pendingUpdates.has(key);
    }

    /**
     * Notify all relevant listeners
     */
    #notifyListeners(changes) {
        // Notify global listeners
        for (const listener of this.globalListeners) {
            try {
                listener(changes, this.config);
            } catch (error) {
                Logger.error('[ConfigService] Global listener error:', error);
            }
        }

        // Notify key-specific listeners
        for (const [key, value] of Object.entries(changes)) {
            const keyListeners = this.listeners.get(key);
            if (keyListeners) {
                for (const listener of keyListeners) {
                    try {
                        listener(value, key, this.config);
                    } catch (error) {
                        Logger.error(`[ConfigService] Listener error for key "${key}":`, error);
                    }
                }
            }
        }
    }

    /**
     * Validate configuration updates
     */
    #validate(updates) {
        const validated = {};

        for (const [key, value] of Object.entries(updates)) {
            // Skip if not in default config (unknown key)
            if (!(key in DefaultConfigs)) {
                Logger.warn(`[ConfigService] Unknown config key: ${key}`);
                continue;
            }

            // Type validation
            if (!this.#isValidType(key, value)) {
                Logger.warn(`[ConfigService] Invalid type for ${key}:`, value);
                continue;
            }

            // Custom validation
            if (!this.#isValidValue(key, value)) {
                Logger.warn(`[ConfigService] Invalid value for ${key}:`, value);
                continue;
            }

            validated[key] = value;
        }

        return validated;
    }

    /**
     * Check if value type matches expected type
     */
    #isValidType(key, value) {
        const expected = DefaultConfigs[key];
        const expectedType = Array.isArray(expected) ? 'array' : typeof expected;
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        return expectedType === actualType;
    }

    /**
     * Custom validation rules for specific keys
     */
    #isValidValue(key, value) {
        switch (key) {
            case 'fileSize':
                return typeof value === 'number' && value >= 0 && value <= 10000;

            case 'rpcList':
                return Array.isArray(value) && value.every(rpc =>
                    rpc && typeof rpc === 'object' && rpc.url && rpc.name
                );

            case 'colorModeId':
                return typeof value === 'number' && value >= 0 && value <= 2;

            case 'webUIOpenStyle':
                return ['tab', 'window', 'popup', 'sidePanel'].includes(value);

            case 'iconOffStyle':
                return ['Grey', 'Dark', 'Dusk'].includes(value);

            default:
                return true;
        }
    }

    /**
     * Get configuration schema (for documentation/validation)
     */
    static getSchema() {
        return {
            integration: { type: 'boolean', description: 'Enable download capture' },
            monitorAria2: { type: 'boolean', description: 'Enable Aria2 monitoring' },
            contextMenus: { type: 'boolean', description: 'Show context menus' },
            askBeforeExport: { type: 'boolean', description: 'Ask before exporting' },
            exportAll: { type: 'boolean', description: 'Enable export all links' },
            checkClick: { type: 'boolean', description: 'Check Alt+Click' },
            allowNotification: { type: 'boolean', description: 'Allow notifications' },
            keepSilent: { type: 'boolean', description: 'Keep silent mode' },
            keepAwake: { type: 'boolean', description: 'Keep system awake' },
            monitorAll: { type: 'boolean', description: 'Monitor all RPC servers' },
            captureMagnet: { type: 'boolean', description: 'Capture magnet links' },
            allowExternalRequest: { type: 'boolean', description: 'Allow external requests' },
            remindCaptureTip: { type: 'boolean', description: 'Show capture reminder' },
            badgeText: { type: 'boolean', description: 'Show badge text' },
            fileSize: { type: 'number', min: 0, max: 10000, description: 'Minimum file size (MB)' },
            colorModeId: { type: 'number', min: 0, max: 2, description: 'Color mode (0=light, 1=dark, 2=system)' },
            webUIOpenStyle: { type: 'string', enum: ['tab', 'window', 'popup', 'sidePanel'], description: 'WebUI open style' },
            iconOffStyle: { type: 'string', enum: ['Grey', 'Dark', 'Dusk'], description: 'Icon off style' },
            rpcList: { type: 'array', description: 'RPC server list' },
            allowedSites: { type: 'array', description: 'Allowed sites whitelist' },
            blockedSites: { type: 'array', description: 'Blocked sites blacklist' },
            allowedExts: { type: 'array', description: 'Allowed file extensions' },
            blockedExts: { type: 'array', description: 'Blocked file extensions' }
        };
    }
}

// Export singleton instance for convenience
export const configService = ConfigService.getInstance();
