class Utils {
    /**
    * export rpc list to ariaNG options
    * 
    * @param {array} rpcList - The RPC URL list.
    * @param {object} ariaNgOptions - The ariaNG options object
    * @return {object} The ariaNG options with new RPC list
    */
    static exportRpc2AriaNg(rpcList, ariaNgOptions) {
        if (!rpcList || rpcList.length == 0) return null;
        const defaultAriaNgOptions = {
            language: 'en',
            theme: 'light',
            title: '${downspeed}, ${upspeed} - ${title}',
            titleRefreshInterval: 5000,
            browserNotification: true,
            rpcAlias: '',
            rpcHost: 'localhost',
            rpcPort: '6800',
            rpcInterface: 'jsonrpc',
            protocol: 'ws',
            httpMethod: 'POST',
            secret: '',
            rpcRequestHeaders: "",
            extendRpcServers: [],
            globalStatRefreshInterval: 1000,
            downloadTaskRefreshInterval: 1000,
            swipeGesture: true,
            dragAndDropTasks: true,
            rpcListDisplayOrder: 'recentlyUsed',
            afterCreatingNewTask: 'task-list',
            removeOldTaskAfterRetrying: true,
            confirmTaskRemoval: true,
            includePrefixWhenCopyingFromTaskDetails: false,
            afterRetryingTask: 'task-list-downloading',
            displayOrder: 'default:asc',
            fileListDisplayOrder: 'default:asc',
            peerListDisplayOrder: 'default:asc'
        }

        if (!ariaNgOptions) ariaNgOptions = defaultAriaNgOptions;
        ariaNgOptions.extendRpcServers = [];

        /* find the default rpc server */
        let defaultRpcIndex = 0
        for (const i in rpcList) {
            let patterns = rpcList[i]['pattern'].split(',') || [];
            if (patterns.includes('*')) {
                defaultRpcIndex = i;
                break;
            }
        }
        /* export rpc list to ariaNG options */
        try {
            for (const i in rpcList) {
                let target = {};
                if (i == defaultRpcIndex) {
                    target = ariaNgOptions;
                } else {
                    target.rpcId = Utils.generateUid();
                    target.httpMethod = 'POST';
                }
                let url = new URL(rpcList[i].url);
                target.rpcAlias = rpcList[i].name;
                target.protocol = url.protocol.replace(':', '');
                target.rpcHost = url.hostname;
                target.rpcPort = url.port;
                target.rpcInterface = url.pathname.replace('/', '');
                target.secret = btoa(decodeURIComponent(url.password));
                if (i != defaultRpcIndex)
                    ariaNgOptions.extendRpcServers.push(target);
            }
        } catch (error) {
            console.warn(`exportRpc2AriaNg: error = ${error}`);
        }

        return ariaNgOptions;
    }
    static generateUid() {
        let sourceId = "Aria2e" + '_' + Math.round(new Date().getTime() / 1000) + '_' + Math.random();
        let hashedId = btoa(sourceId);
        return hashedId;
    }
    /**
     *  Get a human readable speed string
     * 
     * @param {string} speed A byte/s format speed string
     * @return {string} A readable speed string  
     */
    static getReadableSpeed(speed) {
        let unit = "";
        speed = parseInt(speed);
        if (speed >= 1024 * 1024) {
            speed /= 1024 * 1024;
            unit = " MB/s";
        } else if (speed >= 1024) {
            speed /= 1024;
            unit = " KB/s";
        } else if (speed >= 0) {
            unit = " B/s";
            return speed + unit;
        }
        return speed.toFixed(2) + unit;
    }
    /**
     * extract secret key from rpc url
     * 
     * @param {string} rpcUrl Full RPC URL with secret key
     * @return {array} An array contains RPC URL and secret key
     */
    static parseUrl(rpcUrl) {
        let url = null;
        let urlPath = null;
        let secretKey = null;
        try {
            url = new URL(rpcUrl);
            urlPath = url.origin + url.pathname;
            secretKey = decodeURIComponent(url.password);
        } catch (error) {
            console.warn('Stored Rpc Url is invalid! RpcUrl ="' + rpcUrl + '"');
            return ["", ""];
        }
        return [urlPath, secretKey];
    }
    /**
     * Fill RPC URL with secret key
     * 
     * @param {string} secretKey
     * @param {string} rpcUrl
     * @return {string} RPC URL with secret key
     */
    static combineUrl(secretKey, rpcUrl) {
        let url = null;
        try {
            url = new URL(rpcUrl);
            if (secretKey) {
                url.username = "token";
                url.password = encodeURIComponent(secretKey);
            }
        } catch (error) {
            console.warn('Input a invalid RPC URL! URL ="' + rpcUrl + '"');
            return '';
        }
        return url.toString();
    }

    static localizeHtmlPage() {
        //Localize by replacing __MSG_***__ meta tags
        let objects = document.getElementsByTagName('html');
        for (const obj of objects) {
            let valStrH = obj.innerHTML.toString();
            let valNewH = valStrH.replace(/__MSG_(\w+)__/g, function (match, v1) {
                return v1 ? chrome.i18n.getMessage(v1) : "";
            });

            if (valNewH != valStrH) {
                obj.innerHTML = valNewH;
            }
        }
    }

    static validateFilePath(filePath) {
        let regexp = ''
        if (navigator.userAgentData.platform == "Windows")
            regexp = /^([a-zA-Z]:\\)([-\u4e00-\u9fa5\w\s.()~!@#$%^&()\[\]{}+=]+\\?)*$/;
        else
            regexp = /^\/([-\u4e00-\u9fa5\w\s.()~!@#$%^&()\[\]{}+=]+\/?)*$/;
        return regexp.test(filePath);
    }

    static validateRpcUrl(rpcUrl) {
        try {
            var url = new URL(rpcUrl);
        } catch (error) {
            return false;
        }
        if (url.pathname.length < 2) return false;
        if (!/^(http|ws)s?:$/.test(url.protocol)) return false;

        return true;
    }
}

export default Utils;
