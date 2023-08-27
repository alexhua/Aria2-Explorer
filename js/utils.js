class Utils {
    /**
    * export rpc list to ariaNG options
    * 
    * @param {array} rpcList - The RPC URL list.
    * @param {object} ariaNgOptions - The ariaNG options object
    * @return {object} The ariaNG options with new RPC list
    */
    static exportRpcToAriaNg(rpcList, ariaNgOptions) {
        if (!rpcList || rpcList.length == 0) return null;
        const defaultAriaNgOptions = {
            language: 'TBD',
            theme: 'light',
            title: '${downspeed}, ${upspeed} - ${title}',
            titleRefreshInterval: 5000,
            browserNotification: false,
            browserNotificationSound: true,
            browserNotificationFrequency: 'unlimited',
            rpcAlias: '',
            rpcHost: 'localhost',
            rpcPort: '6800',
            rpcInterface: 'jsonrpc',
            protocol: 'ws',
            httpMethod: 'POST',
            rpcRequestHeaders: '',
            rpcOptions: {},
            secret: '',
            extendRpcServers: [],
            webSocketReconnectInterval: 5000,
            globalStatRefreshInterval: 1000,
            downloadTaskRefreshInterval: 1000,
            keyboardShortcuts: true,
            swipeGesture: true,
            dragAndDropTasks: true,
            rpcListDisplayOrder: 'recentlyUsed',
            afterCreatingNewTask: 'task-list',
            removeOldTaskAfterRetrying: true,
            confirmTaskRemoval: true,
            includePrefixWhenCopyingFromTaskDetails: false,
            showPiecesInfoInTaskDetailPage: 'le10240',
            afterRetryingTask: 'task-list-default',
            displayOrder: 'default:asc',
            fileListDisplayOrder: 'default:asc',
            peerListDisplayOrder: 'default:asc'
        }

        if (!ariaNgOptions || !Object.keys(ariaNgOptions).length)
            ariaNgOptions = defaultAriaNgOptions;

        ariaNgOptions.extendRpcServers = [];

        let uniqueRpcList = this.compactRpcList(rpcList);
        /* export rpc list to ariaNG options */
        try {
            for (const i in uniqueRpcList) {
                let target = {};
                if (i == 0) {
                    target = ariaNgOptions;
                } else {
                    target.rpcId = Utils.generateUid();
                    target.httpMethod = 'POST';
                }
                let url = new URL(uniqueRpcList[i].url);
                target.rpcAlias = uniqueRpcList[i].name;
                target.protocol = url.protocol.replace(':', '');
                target.rpcHost = url.hostname;
                target.rpcPort = url.port;
                target.rpcInterface = url.pathname.replace('/', '');
                target.secret = btoa(decodeURIComponent(url.password));
                if (i > 0)
                    ariaNgOptions.extendRpcServers.push(target);
            }
        } catch (error) {
            console.warn(`exportRpcToAriaNg: error = ${error}`);
        }

        return ariaNgOptions;
    }

    static compactRpcList(rpcList) {
        let compactRpcList = [];

        if (!rpcList || rpcList.length < 1)
            return compactRpcList;

        /* find the default rpc server */
        let defaultRpcIndex = 0
        for (const i in rpcList) {
            let patterns = rpcList[i]['pattern'].split(',') || [];
            if (patterns.includes('*')) {
                defaultRpcIndex = i;
                break;
            }
        }

        compactRpcList.push(rpcList[defaultRpcIndex]);

        /* Remove rpc item with same url */
        for (const sourceRpc of rpcList) {
            let included = false;
            let sourceUrl = sourceRpc.url.replace("127.0.0.1", "localhost").replace("[::1]", "localhost");
            for (const targetRpc of compactRpcList) {
                let targetUrl = targetRpc.url.replace("127.0.0.1", "localhost").replace("[::1]", "localhost");
                if (sourceUrl.split(`//`)[1] == targetUrl.split(`//`)[1]) {
                    included = true;
                    break;
                }
            }
            if (!included)
                compactRpcList.push(sourceRpc);
        }
        return compactRpcList;
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
     * @param {string} url Full RPC URL with secret key
     * @return {object} An object contains RPC URL and secret key
     */
    static parseUrl(url) {
        let rpcUrl = '', secretKey = '';
        try {
            let urlObject = new URL(url);
            rpcUrl = urlObject.origin + urlObject.pathname;
            secretKey = decodeURIComponent(urlObject.password);
        } catch (error) {
            console.warn('Stored Rpc Url is invalid! URL ="' + url + '"');
        }
        return { rpcUrl, secretKey };
    }

    /**
     * Inflate rpc url with secret key
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
        // Localize by replacing __MSG_***__ meta tags
        let objects = document.getElementsByTagName('html');
        for (const obj of objects) {
            let walker = document.createTreeWalker(obj, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null, false);
            let node;

            while (node = walker.nextNode()) {
                if (node.nodeType === Node.TEXT_NODE) {
                    let matches = node.nodeValue.match(/__MSG_(\w+)__/g);
                    if (matches) {
                        let newValue = node.nodeValue;
                        for (let match of matches) {
                            let messageName = match.slice(6, -2); // remove __MSG_ and __
                            let messageValue = chrome.i18n.getMessage(messageName);
                            newValue = newValue.replace(match, messageValue);
                        }
                        node.nodeValue = newValue;
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    for (const attr of node.attributes) {
                        let matches = attr.value.match(/__MSG_(\w+)__/g);
                        if (matches) {
                            let newValue = attr.value;
                            for (let match of matches) {
                                let messageName = match.slice(6, -2); // remove __MSG_ and __
                                let messageValue = chrome.i18n.getMessage(messageName);
                                newValue = newValue.replace(match, messageValue);
                            }
                            attr.value = newValue;
                        }
                    }
                }
            }
        }
    }

    /**
     * Format a given filepath 
     * @param {string} location the filepath string
     * @param {bool} isDirectory whether the input is a directory, default is true
     * @return {string}
     */
    static formatFilepath(location, isDirectory = true) {
        if (!location) return location;

        const winDelimiter = '\\', unixDelimiter = '/';
        let eol = '';

        if (location.startsWith(unixDelimiter)) { // unix-liked platform
            eol = unixDelimiter;
            location = location.replaceAll(winDelimiter, unixDelimiter).replaceAll('//', '/');
        } else {                                // windows platform
            eol = winDelimiter;
            location = location.replaceAll(unixDelimiter, winDelimiter).replaceAll('\\\\', '\\');
            location = location[0].toUpperCase() + location.slice(1);
        }
        if (isDirectory && !location.endsWith(eol))
            location = location + eol;

        return location
    }

    static validateFilePath(filePath) {
        let regexp = ''
        if (filePath.startsWith('/')) {
            regexp = /^\/([-\u4e00-\u9fa5\w\s.()~!@#$%^&()\[\]{}+=]+\/?)*$/;
        }
        else {
            regexp = /^([a-zA-Z]:\\)([-\u4e00-\u9fa5\w\s.()~!@#$%^&()\[\]{}+=]+\\?)*$/;
        }
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

    /**
     *  Show a Chrome notification
     * 
     * @param {object} content Refer to Chrome NotificationOptions
     * @param {string} id Notification Identifier
     */
    static showNotification(content, id = "NID_DEFAULT") {
        let option = {
            type: "basic",
            title: "Title",
            message: "Sample",
            iconUrl: "images/logo64.png",
            requireInteraction: false
        };
        Object.assign(option, content);
        chrome.notifications.create(id, option);
    }

    static getWebStoreUrl() {
        let id = chrome.runtime.id;
        if (/Edg/.test(navigator.userAgent))
            return "https://microsoftedge.microsoft.com/addons/detail/" + id;
        else
            return "https://chrome.google.com/webstore/detail/" + id;
    }

    /**
     * Get file name from a url
     * @param {string} url 
     * @return {string} filename
     */
    static getFileName(url) {
        try {
            url = new URL(url);
        } catch (error) {
            return '';
        }
        if (url.pathname.length < 2) return '';
        let paths = url.pathname.split('/');
        return paths[paths.length - 1]
    }

    /**
     * Check whether a host of url is localhost
     * @param {string} url 
     * @return {bool} result
     */
    static isLocalhost(url) {
        try {
            var u = new URL(url);
        } catch (error) {
            return false;
        }
        return u.hostname == "[::1]" || u.hostname == "127.0.0.1" || u.hostname.toLowerCase() == "localhost"
    }

    /**
     * Return the OS platform name
     * @return {string} OS platform name
     */
    static getPlatform() {
        return navigator.userAgentData.platform;
    }
}

export default Utils;
