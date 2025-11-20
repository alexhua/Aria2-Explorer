/**
 * Logger utility - Centralized logging with log level control
 */

// Log levels
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    NONE: 4
};

class Logger {
    static currentLevel = LogLevel.WARNING; // Default to WARNING

    /**
     * Set the log level
     * @param {number} level - One of LogLevel values
     */
    static setLevel(level) {
        if (level >= LogLevel.DEBUG && level <= LogLevel.NONE) {
            this.currentLevel = level;
        }
    }

    /**
     * Get the current log level
     * @returns {number} Current log level
     */
    static getLevel() {
        return this.currentLevel;
    }

    static debug(...args) {
        if (this.currentLevel <= LogLevel.DEBUG) {
            console.debug('[DEBUG]', ...args);
        }
    }

    static info(...args) {
        if (this.currentLevel <= LogLevel.INFO) {
            console.info('[INFO]', ...args);
        }
    }

    static log(...args) {
        if (this.currentLevel <= LogLevel.INFO) {
            console.log('[LOG]', ...args);
        }
    }

    static warn(...args) {
        if (this.currentLevel <= LogLevel.WARNING) {
            console.warn('[WARNING]', ...args);
        }
    }

    static error(...args) {
        if (this.currentLevel <= LogLevel.ERROR) {
            console.error('[ERROR]', ...args);
        }
    }
}

export default Logger;
