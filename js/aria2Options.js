/**  @see https://aria2.github.io/manual/en/html/aria2c.html#aria2.changeGlobalOption */
const globalExclusiveOptions = ["bt-max-open-files", "download-result",
    "keep-unfinished-download-result", "log", "log-level", "max-concurrent-downloads",
    "max-download-result", "max-overall-download-limit", "max-overall-upload-limit",
    "optimize-concurrent-downloads", "save-cookies", "save-session", "server-stat-of"];

class Aria2Options {

    /**
     * Extract Aria2 global options from ariaNG options
     * 
     * Caution: The Aria2 options is extracted from ariaNG settings by its RPC URL, so an Aria2 server
     *          with same RPC URL but different options will be treated as the same one. 
     * 
     * @param {string} rpcUrl the whole Aria2 RPC url
     * 
     * @return {Object} Aria2 global options
     */
    static async getGlobalOptions(rpcUrl) {
        const localStorage = await chrome.storage.local.get('ariaNgOptions');
        const ariaNgOptions = localStorage.ariaNgOptions;
        let aria2SettingsMap = {};

        if (!ariaNgOptions) return {};
        try {
            /* Build [{rpcHost: rpcOptions}] maps array */
            ariaNgOptions.rpcHost = ariaNgOptions.rpcHost.replace(/localhost|127\.0\.0\.1|\[::1\]/i, "localhost");
            let key = ariaNgOptions.rpcHost + ':' + ariaNgOptions.rpcPort + '/' + ariaNgOptions.rpcInterface;
            aria2SettingsMap[key] = ariaNgOptions.rpcOptions || {};
            for (const rpcServer of ariaNgOptions.extendRpcServers) {
                key = rpcServer.rpcHost + ':' + rpcServer.rpcPort + '/' + rpcServer.rpcInterface;
                aria2SettingsMap[key] = rpcServer.rpcOptions || {};
            }
            /* Build map key */
            let url = new URL(rpcUrl);
            url.host = url.host.replace(/localhost|127\.0\.0\.1|\[::1\]/i, "localhost")
            rpcUrl = url.host + url.pathname;
        } catch (e) {
            return {};
        }
        return aria2SettingsMap[rpcUrl] || {};
    }

    /**
     * Extract Aria2 global only options from ariaNG options
     *  
     * @param {string} rpcUrl the whole Aria2 RPC url
     * 
     * @return {Object} Aria2 global only options
     */
    static async getGlobalOnlyOptions(rpcUrl) {
        let globalOnlyOptions = await Aria2Options.getGlobalOptions(rpcUrl);

        for (const key of Object.keys(globalOnlyOptions)) {
            if (!globalExclusiveOptions.includes(key)) {
                delete globalOnlyOptions[key];
            }
        }
        return globalOnlyOptions;
    }

    /**
     * Extract Aria2 task options from ariaNG options
     *  
     * @param {string} rpcUrl the whole Aria2 RPC url
     * 
     * @return {Object} Aria2 task options
     */
    static async getTaskOptions(rpcUrl) {
        let taskOptions = await Aria2Options.getGlobalOptions(rpcUrl);

        for (const key of Object.keys(taskOptions)) {
            if (globalExclusiveOptions.includes(key)) {
                delete taskOptions[key];
            }
        }
        return taskOptions;
    }

    /**
     * Extract Aria2 URI type task options from ariaNG options
     *  
     * @param {string} rpcUrl the whole Aria2 RPC url
     * 
     * @return {Object} Aria2 task options
     */
    static async getUriTaskOptions(rpcUrl) {
        let taskOptions = await Aria2Options.getGlobalOptions(rpcUrl);

        for (const key of Object.keys(taskOptions)) {
            if (globalExclusiveOptions.includes(key) || /^(bt|metalink)-.+/i.test(key)) {
                delete taskOptions[key];
            }
        }
        return taskOptions;
    }
}

export default Aria2Options;