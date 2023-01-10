class Utils {
    /**
    * export rpc list to ariaNG options
    * @param {array} rpcList - The rpc list.
    * @param {object} ariaNgOptions - The ariaNG Options Object
    * @return {object} The ariaNG Options with new RPC list
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
    static  getReadableSpeed(speed) {
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
}

export default Utils;
