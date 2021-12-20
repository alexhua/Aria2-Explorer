const defaultRPC = '[{"name":"ARIA2 RPC","url":"http://localhost:6800/jsonrpc", "pattern": ""}]';
var CurrentTabUrl = "about:blank";
var MonitorId = -1;
var MonitorRate = 3000; // Aria2 monitor interval 3000ms
const fetchRpcList = () => JSON.parse(localStorage.getItem("rpc_list") || defaultRPC)
const isDownloadListened = () => chrome.downloads.onDeterminingFilename.hasListener(captureDownload)
const doHttpRequest = function(request) {
    Promise.prototype.done = Promise.prototype.then;
    Promise.prototype.fail = Promise.prototype.catch;
    return new Promise(function(resolve, reject) {
        var http = new XMLHttpRequest();
        var contentType = request.contentType || "application/x-www-form-urlencoded; charset=UTF-8";
        http.timeout = request.timeout || 3000;
        http.onreadystatechange = function() {
            if (http.readyState == 4) {
                if ((http.status == 200 && http.status < 300) || http.status == 304) {
                    resolve(JSON.parse(http.responseText));
                } else {
                    reject(JSON.parse(http.responseText == '' ? '{}' : http.responseText));
                }
            }
        }
        http.open(request.method, request.url, true);
        http.setRequestHeader("Content-type", contentType);
        for (h in request.headers) {
            if (request.headers[h]) {
                http.setRequestHeader(h, request.headers[h]);
            }
        }
        if (request.method == "POST") {
            http.send(request.data);
        } else {
            http.send();
        }
    }
    );
};

//弹出chrome通知
function showNotification(id, opt) {
    var allowNotification = localStorage.getItem("allowNotification");
    if (allowNotification == "false") return;
    var notification = chrome.notifications.create(id, opt, function(notifyId) {
        return notifyId
    });
}
//解析RPC地址
function parse_url(url) {
    var auth_str = decodeURIComponent(request_auth(url));
    var auth = null;
    if (auth_str) {
        if (auth_str.indexOf('token:') == 0) {
            auth = auth_str;
        } else {
            auth = "Basic " + btoa(auth_str);
        }
    }
    var url_path = remove_auth(url);
    function request_auth(url) {
        return url.match(/^(?:(?![^:@]+:[^:@\/]*@)[^:\/?#.]+:)?(?:\/\/)?(?:([^:@]*(?::[^:@]*)?)?@)?/)[1];
    }
    function remove_auth(url) {
        return url.replace(/^((?![^:@]+:[^:@\/]*@)[^:\/?#.]+:)?(\/\/)?(?:(?:[^:@]*(?::[^:@]*)?)?@)?(.*)/, '$1$2$3');
    }
    return [url_path, auth];
}

function getCookies(downloadItem) {
    return new Promise(resolve =>{
        var storeId = downloadItem.incognito == true ? "1" : "0";
        chrome.cookies.getAll({ "url": downloadItem.url, "storeId": storeId }, function (cookies) {
            var format_cookies = [];
            for (var i in cookies) {
                var cookie = cookies[i];
                format_cookies.push(cookie.name + "=" + cookie.value);
            }
            resolve(format_cookies);
        })
    })
}

async function send2Aria(rpc, downloadItem) {
    let format_cookies = await getCookies(downloadItem);
    var header = [];
    if (format_cookies.length > 0) {
        header.push("Cookie: " + format_cookies.join("; "));
    }
    header.push("User-Agent: " + navigator.userAgent);
    header.push("Connection: keep-alive");

    var options = {
        "header": header,
        "referer": downloadItem.referrer,
        "out": downloadItem.filename
    };
    if (rpc.location) {
        options.dir = rpc.location;
    }
    if (downloadItem.hasOwnProperty('options')) {
        options = Object.assign(options, downloadItem.options);
    }

    var rpc_data = {
        "jsonrpc": "2.0",
        "method": "aria2.addUri",
        "id": new Date().getTime(),
        "params": [[downloadItem.url], options]
    };
    var result = parse_url(rpc.url);
    var auth = result[1];
    if (auth && auth.indexOf('token:') == 0) {
        rpc_data.params.unshift(auth);
    }

    var request = {
        url: result[0],
        dataType: 'json',
        method: 'POST',
        data: JSON.stringify(rpc_data),
        headers: {
            'Authorization': auth
        }
    };
    return doHttpRequest(request).done(function (response) {
        var title = chrome.i18n.getMessage("exportSucceedStr");
        var des = chrome.i18n.getMessage("exportSucceedDes");
        var opt = {
            type: "basic",
            title: title,
            message: des,
            iconUrl: "images/logo64.png",
            isClickable: true
        }
        var id = new Date().getTime().toString();
        showNotification(id, opt);
        return Promise.resolve("OK");
    }).fail(function (response) {
        var title = chrome.i18n.getMessage("exportFailedStr");
        var des = chrome.i18n.getMessage("exportFailedDes");
        if (response && response.error && response.error.message) {
            des += ` Error: ${response.error.message}.`;
        }
        var opt = {
            type: "basic",
            title: title,
            message: des,
            iconUrl: "images/logo64.png",
            requireInteraction: false
        }
        var id = new Date().getTime().toString();
        showNotification(id, opt);
        return Promise.resolve("FAIL");
    });
}

function getRpcServer(url) {
    const rpcList = fetchRpcList();
    for (var i = 1; i < rpcList.length; i++) {
      var patterns = rpcList[i]['pattern'].split(',');
      for (var j in patterns) {
        var pattern = patterns[j].trim();
        if (matchRule(url, pattern)) {
          return rpcList[i];
        }
      }
    }
    return rpcList[0];
}

function matchRule(str, rule) {
    return new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
}

function isCapture(downloadItem) {
    var fileSize = localStorage.getItem("fileSize");
    var whiteSiteList = JSON.parse(localStorage.getItem("white_site"));
    var blackSiteList = JSON.parse(localStorage.getItem("black_site"));
    var whiteExtList = JSON.parse(localStorage.getItem("white_ext"));
    var blackExtList = JSON.parse(localStorage.getItem("black_ext"));
    var currentTabUrl = new URL(CurrentTabUrl);
    var url = new URL(downloadItem.referrer || downloadItem.url);

    if (downloadItem.error || downloadItem.state != "in_progress" || !/^(https?|s?ftps?):/i.test(downloadItem.url)) {
        return false;
    }

    for (var i in whiteSiteList) {
        if (matchRule(currentTabUrl.hostname, whiteSiteList[i]) || matchRule(url.hostname, whiteSiteList[i])) {
            return true;
        }
    }
    for (var i in blackSiteList) {
        if (matchRule(currentTabUrl.hostname, blackSiteList[i]) || matchRule(url.hostname, blackSiteList[i])) {
            return false;
        }
    }

    for (var i in whiteExtList) {
        if (downloadItem.filename.endsWith(whiteExtList[i]) || whiteExtList[i] == "*") {
            return true;
        }
    }
    for (var i in blackExtList) {
        if (downloadItem.filename.endsWith(blackExtList[i]) || blackExtList[i] == "*") {
            return false;
        }
    }

    if (downloadItem.fileSize >= fileSize * 1024 * 1024) {
        return true;
    } else {
        return false;
    }
}

function enableCapture() {
    if (!isDownloadListened()) {
        chrome.downloads.onDeterminingFilename.addListener(captureDownload);
    }
    chrome.browserAction.setIcon({
        path: {
            '32': "images/logo32.png",
            '64': "images/logo64.png",
            '128': "images/logo128.png",
            '256': "images/logo256.png"
        }
    });
    localStorage.setItem("integration", true);
    chrome.contextMenus.update("captureDownload", { checked: true });
}

function disableCapture() {
    if (isDownloadListened()) {
        chrome.downloads.onDeterminingFilename.removeListener(captureDownload);
    }
    chrome.browserAction.setIcon({
        path: {
            '32': "images/logo32-gray.png",
            '64': "images/logo64-gray.png",
            '128': "images/logo128-gray.png",
            '256': "images/logo256-gray.png"
        }
    });
    localStorage.setItem("integration", false);
    chrome.contextMenus.update("captureDownload", { checked: false });
}

 async function captureDownload(downloadItem, suggestion) {
    var askBeforeDownload = localStorage.getItem("askBeforeDownload");
    var integration = localStorage.getItem("integration");
    if (downloadItem.byExtensionId == "gbdinbbamaniaidalikeiclecfbpgphh") {
        //workaround for filename ignorant assigned by extension "音视频下载"
        return true;
    }
    suggestion();
    //always use finalurl when it is available
    if (downloadItem.finalUrl != "" && downloadItem.finalUrl != "about:blank") {
        downloadItem.url = downloadItem.finalUrl;
    }
    if (integration == "true" && isCapture(downloadItem)) {
        chrome.downloads.cancel(downloadItem.id);
        if (downloadItem.referrer == "about:blank") {
            downloadItem.referrer = "";
        }
        if (askBeforeDownload == "true") {
            launchUI(downloadItem);
        } else {
            let rpc = getRpcServer(downloadItem.url);
            let ret = await send2Aria(rpc, downloadItem);
            if (ret == "FAIL") {
                disableCapture();
                chrome.downloads.download({ url: downloadItem.url });
                setTimeout(enableCapture, 3000);
            }
        }
    }
}

chrome.browserAction.onClicked.addListener(launchUI);

async function launchUI(downloadItem) {
    const index = chrome.extension.getURL('ui/ariang/index.html');
    var webUiUrl = index; //launched from notification,option menu or extension icon
    if (downloadItem?.hasOwnProperty("finalUrl")) { // launched with new task url
        webUiUrl = index + "#!/new?url=" + encodeURIComponent(btoa(downloadItem.url));
        if (downloadItem.referrer && downloadItem.referrer != "" && downloadItem.referrer != "about:blank") {
            webUiUrl = webUiUrl + "&referer=" + encodeURIComponent(btoa(downloadItem.referrer));
        }
        let header = "User-Agent: " + navigator.userAgent;
        let cookies = await getCookies(downloadItem);
        if (cookies.length > 0) {
            header += "\nCookie: " + cookies.join(";");
        }
        webUiUrl = webUiUrl + "&header=" + encodeURIComponent(btoa(header));
    }
    chrome.tabs.query({ "url": index }, function (tabs) {
        if (tabs?.length > 0) {
            chrome.windows.update(tabs[0].windowId, {
                focused: true
            });
            chrome.tabs.update(tabs[0].id, {
                active: true,
                url: webUiUrl
            });
            return;
        }
        var webUIOpenStyle = localStorage.getItem("webUIOpenStyle") || "newtab";
        if (webUIOpenStyle == "newwindow") {
            openInWindow(webUiUrl);
        } else {
            chrome.tabs.create({
                url: webUiUrl
            });
        }
    });
}

function openInWindow(url) {
    const w = Math.floor(screen.availWidth * 0.75);
    const h = Math.floor(screen.availHeight * 0.75)
    const l = Math.floor(screen.availWidth * 0.12);
    const t = Math.floor(screen.availHeight * 0.12);

    chrome.windows.create({
        url: url,
        width: w,
        height: h,
        left: l,
        top: t,
        type: 'popup',
        focused: false
    }, function (window) {
        chrome.windows.update(window.id, {
            focused: true
        });
    });
}

function createOptionMenu() {
    var strDownloadCapture = chrome.i18n.getMessage("downloadCaptureStr");
    var isCaptureDownload =localStorage.getItem("integration") == "true";
    chrome.contextMenus.create({
        "type": "checkbox",
        "checked":isCaptureDownload,
        "id": "captureDownload",
        "title": strDownloadCapture,
        "contexts": ["browser_action"]
    });
    var strMonitorAria2 = chrome.i18n.getMessage("monitorAria2Str");
    var isMonitorAria2 =localStorage.getItem("monitorAria2") == "true";
    chrome.contextMenus.create({
        "type": "checkbox",
        "checked": isMonitorAria2,
        "id": "monitorAria2",
        "title": strMonitorAria2,
        "contexts": ["browser_action"]
    });
    chrome.contextMenus.create({
        "type": "separator",
        "id": "separator",
        "contexts": ["browser_action"]
    });
    var strOpenWebUI = chrome.i18n.getMessage("openWebUIStr");
    chrome.contextMenus.create({
        "type": "normal",
        "id": "openWebUI",
        "title": strOpenWebUI,
        "contexts": ["browser_action"]
    });
    var strAddtoWhiteList = chrome.i18n.getMessage("addToWhiteListStr");
    chrome.contextMenus.create({
        "type": "normal",
        "id": "updateWhiteSite",
        "title": strAddtoWhiteList,
        "contexts": ["browser_action"]
    });
    var strAddtoBlackList = chrome.i18n.getMessage("addToBlackListStr");
    chrome.contextMenus.create({
        "type": "normal",
        "id": "updateBlackSite",
        "title": strAddtoBlackList,
        "contexts": ["browser_action"]
    });
}

function createContextMenu() {
    var contextMenus = localStorage.getItem("contextMenus");
    var strExport = chrome.i18n.getMessage("contextmenuTitle");
    if (contextMenus == "true" || contextMenus == null) {
        const rpcList = fetchRpcList();
        for (var i in rpcList) {
            chrome.contextMenus.create({
                id: i,
                title: strExport + rpcList[i]['name'],
                contexts: ['link', 'selection']
            });
        }
        localStorage.setItem("contextMenus", true);
    }
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == "loading") {
        CurrentTabUrl = tab?.url || "about:blank";
        updateOptionMenu(tab);
    }
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {        
        CurrentTabUrl = tab?.url || "about:blank";
        updateOptionMenu(tab);
    });

});

chrome.windows.onFocusChanged.addListener(function(windowId) {
    chrome.tabs.query({ windowId: windowId, active: true }, function(tabs) {
        if (tabs?.length > 0) {
            CurrentTabUrl = tabs[0].url || "about:blank";
            updateOptionMenu(tabs[0]);
        }
    });
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
    var uri = decodeURIComponent(info.linkUrl || info.selectionText);
    var referrer = info.frameUrl || info.pageUrl;
    // mock a DownloadItem
    var downloadItem = {
        url: uri,
        referrer: referrer,
        filename: ""
    };

    if (info.menuItemId == "openWebUI") {
        launchUI();
    } else if (info.menuItemId == "captureDownload") {
        if (info.checked) {
            enableCapture();
        } else {
            disableCapture();
        }
    } else if (info.menuItemId == "monitorAria2") {
        if (info.checked) {
            enableMonitor();
        } else {
            disableMonitor();
        }
    } else if (info.menuItemId == "updateBlackSite") {
        updateBlackSite(tab);
        updateOptionMenu(tab);
    } else if (info.menuItemId == "updateWhiteSite") {
        updateWhiteSite(tab);
        updateOptionMenu(tab);
    } else {
        let rpc = fetchRpcList()[info.menuItemId];
        send2Aria(rpc, downloadItem);
    }
});

function updateOptionMenu(tab) {
    var black_site = JSON.parse(localStorage.getItem("black_site"));
    var black_site_set = new Set(black_site);
    var white_site = JSON.parse(localStorage.getItem("white_site"));
    var white_site_set = new Set(white_site);
    if (tab == null || !tab.active) {
        if (!tab) {
            console.log("Could not get active tab, update option menu failed.")
        };
        return;
    }
    var url = new URL(tab.url || "about:blank");
    if (black_site_set.has(url.hostname)) {
        var updateBlackSiteStr = chrome.i18n.getMessage("removeFromBlackListStr");
        chrome.contextMenus.update("updateBlackSite", {
            "title": updateBlackSiteStr
        });
    } else {
        var updateBlackSiteStr = chrome.i18n.getMessage("addToBlackListStr");
        chrome.contextMenus.update("updateBlackSite", {
            "title": updateBlackSiteStr
        });
    }
    if (white_site_set.has(url.hostname)) {
        var updateWhiteSiteStr = chrome.i18n.getMessage("removeFromWhiteListStr");
        chrome.contextMenus.update("updateWhiteSite", {
            "title": updateWhiteSiteStr
        });
    } else {
        var updateWhiteSiteStr = chrome.i18n.getMessage("addToWhiteListStr");
        chrome.contextMenus.update("updateWhiteSite", {
            "title": updateWhiteSiteStr
        });
    }
}

function updateWhiteSite(tab) {
    if (tab == null || tab.url == null) {
        console.warn("Could not get active tab url, update option menu failed.");
    }
    if (!tab.active || tab.url.startsWith("chrome"))
        return;
    var white_site = JSON.parse(localStorage.getItem("white_site"));
    var white_site_set = new Set(white_site);
    var url = new URL(tab.url);
    if (white_site_set.has(url.hostname)) {
        white_site_set.delete(url.hostname);
    } else {
        white_site_set.add(url.hostname);
    }
    localStorage.setItem("white_site", JSON.stringify(Array.from(white_site_set)));
}
function updateBlackSite(tab) {
    if (tab == null || tab.url == null) {
        console.warn("Could not get active tab url, update option menu failed.");
    }
    if (!tab.active || tab.url.startsWith("chrome"))
        return;
    var black_site = JSON.parse(localStorage.getItem("black_site"));
    var black_site_set = new Set(black_site);
    var url = new URL(tab.url);
    if (black_site_set.has(url.hostname)) {
        black_site_set.delete(url.hostname);
    } else {
        black_site_set.add(url.hostname);
    }
    localStorage.setItem("black_site", JSON.stringify(Array.from(black_site_set)));

}
chrome.notifications.onClicked.addListener(function(id) {
    launchUI();
    chrome.notifications.clear(id, function() {});
});

chrome.commands.onCommand.addListener(function(command) {
    if (command === "toggle-capture") {
        var integration = localStorage.getItem("integration");
        if (integration == "false" || integration == null) {
            enableCapture();
        } else if (integration == "true") {
            disableCapture();
        }
    }
});

chrome.runtime.onInstalled.addListener(function (details) {
    let optionsUrl = chrome.runtime.getURL("options.html");
    if (details.reason == "install") {
        chrome.tabs.create({
            url: optionsUrl
        });
    }
});

/**Listen to the local storage changes from options page **/
window.addEventListener('storage', function(se) {
    //console.log(se);
    if (se.key == null && se.storageArea.length == 0) {
        chrome.contextMenus.removeAll();
        createOptionMenu();
        disableCapture();
        disableMonitor();
        return
    }

    if (se.key == "contextMenus" || se.key == "rpc_list") {
        chrome.contextMenus.removeAll();
        createOptionMenu();
        createContextMenu();
    }

    if (se.key == "rpc_list") {
        exportRpc2AriaNg(getRpcServer("*"));
    }

    if (se.key == "integration") {
        if (se.newValue == "true") {
            enableCapture();
        } else if (se.newValue == "false") {
            disableCapture();
        }
    }

    if (se.key == "monitorAria2") {
        if (se.newValue == "true") {
            enableMonitor();
        } else if (se.newValue == "false") {
            disableMonitor();
        }
    }    
});

// receive request from other extension
/**
 * @typedef downloadItem
 * @type {Object}
 * @property {String} url
 * @property {String} filename
 * @property {String} referrer
 * @property {Object} options
 */
chrome.runtime.onMessageExternal.addListener (
    function (downloadItem) {
        var allowExternalRequest = localStorage.getItem("allowExternalRequest");
        if (allowExternalRequest == "true"){
            var rpc = getRpcServer(downloadItem.url);
            send2Aria(rpc, downloadItem);
        }
    }
);

chrome.runtime.onMessage.addListener(
    function (downloadItem) {
        var rpc = getRpcServer(downloadItem.url);
        send2Aria(rpc, downloadItem);
    }
);

function enableMonitor(){
    if (MonitorId !== -1) {
        console.log("Warn: Monitor has already started.");
        return;
    }
    monitorAria2();
    MonitorId = setInterval(monitorAria2, MonitorRate);
    localStorage.setItem("monitorAria2", true);
    chrome.contextMenus.update("monitorAria2", { checked: true });
}

function disableMonitor(){
    clearInterval(MonitorId);
    MonitorId = -1;
    chrome.browserAction.setBadgeText({ text: "" });
    chrome.browserAction.setTitle({ title: "" });
    localStorage.setItem("monitorAria2", false);
    chrome.contextMenus.update("monitorAria2", { checked: false });
    if (localStorage.integration == "true" && !isDownloadListened()) {
        chrome.downloads.onDeterminingFilename.addListener(captureDownload);
    }
}

function monitorAria2() {
    var rpc_data = {
        "jsonrpc": "2.0",
        "method": "aria2.getGlobalStat",
        "id": new Date().getTime(),
        "params": []
    };
    var rpc = getRpcServer("*");
    var result = parse_url(rpc.url);
    var auth = result[1];
    if (auth && auth.indexOf('token:') == 0) {
        rpc_data.params.unshift(auth);
    }

    var request = {
        url: result[0],
        dataType: 'json',
        method: 'POST',
        data: JSON.stringify(rpc_data),
        headers: {
            'Authorization': auth
        }
    };
    doHttpRequest(request).done(function (response) {
        var numActive = response.result.numActive;
        var numStopped = response.result.numStopped;
        var numWaiting = response.result.numWaiting;
        var uploadSpeed = getReadableSpeed(response.result.uploadSpeed);
        var downloadSpeed = getReadableSpeed(response.result.downloadSpeed);
        /* Tune the monitor rate dynamically */
        if (numActive > 0 && MonitorRate == 3000) {
            MonitorRate = 1000;
            disableMonitor();
            enableMonitor();
        } else if (numActive == 0 && MonitorRate == 1000) {
            MonitorRate = 3000;
            disableMonitor();
            enableMonitor();
        }
        chrome.browserAction.setBadgeBackgroundColor({ color: "green" });
        chrome.browserAction.setBadgeText({ text: numActive });
        let uploadStr = chrome.i18n.getMessage("upload");
        let downloadStr = chrome.i18n.getMessage("download");
        let waitStr = chrome.i18n.getMessage("wait");
        let finishStr = chrome.i18n.getMessage("finish");
        chrome.browserAction.setTitle({ title: `${downloadStr}: ${numActive}  ${waitStr}: ${numWaiting}  ${finishStr}: ${numStopped}\n${uploadStr}: ${uploadSpeed}  ${downloadStr}: ${downloadSpeed}` });
        if (localStorage.integration == "true" && !isDownloadListened()) {
            chrome.downloads.onDeterminingFilename.addListener(captureDownload);
        }
    }).fail(function (response) {
        if (localStorage.monitorAria2 == "false") return;
        let title = "Failed to connect with Aria2.";
        if (response && response.error && response.error.message) {
            title += ` Reason: ${response.error.message}.`;
        }
        chrome.browserAction.setBadgeBackgroundColor({ color: "red" });
        chrome.browserAction.setBadgeText({ text: "E" });
        chrome.browserAction.setTitle({ title: title });
        console.log(response);
        if (localStorage.integration == "true" && localStorage.monitorAria2 == "true" && isDownloadListened()) {
            chrome.downloads.onDeterminingFilename.removeListener(captureDownload);
        }
    });
}

function getReadableSpeed(speed) {
    let unit ="";
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

function exportRpc2AriaNg(rpc) {
    var ariaNgOptions = null;
    let wsEnabled = false;
    var defaultAriaNGOptions = {
        language: window.navigator.language || 'en',
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

    if (!localStorage["AriaNg.Options"]) {
        ariaNgOptions = defaultAriaNGOptions;
    } else {
        ariaNgOptions = JSON.parse(localStorage["AriaNg.Options"]);
    }
    wsEnabled = ariaNgOptions.protocol?.startsWith("ws") || false;
    
    try {
        let url = new URL(rpc.url);
        ariaNgOptions.rpcAlias = rpc.name;
        ariaNgOptions.protocol = url.protocol.replace(':', '');
        ariaNgOptions.rpcHost = url.hostname;
        ariaNgOptions.rpcPort = url.port;
        ariaNgOptions.rpcInterface = url.pathname.replace('/', '');
        ariaNgOptions.secret = btoa(decodeURIComponent(url.password));
    } catch (error) {
        console.warn('exportRpc2AriaNg: Rpc Url is invalid! RpcUrl ="' + rpc.url + '"');
        return
    }
    
    if (wsEnabled) {
        ariaNgOptions.protocol = ariaNgOptions.protocol.replace("http", "ws");
    }
    localStorage["AriaNg.Options"] = JSON.stringify(ariaNgOptions);
}

/******** init popup url icon, capture and aria2 monitor ********/
var webUIOpenStyle = localStorage.getItem("webUIOpenStyle");
if (webUIOpenStyle == "popup") {
    var index = chrome.extension.getURL('ui/ariang/popup.html');
    chrome.browserAction.setPopup({
        popup: index
    });
}
chrome.contextMenus.removeAll();
createOptionMenu();
createContextMenu();
var integration = localStorage.getItem("integration");
if (integration == "true") {
    enableCapture();
} else if (integration == "false" || integration == null) {
    disableCapture();
}
var integration = localStorage.getItem("monitorAria2");
if (integration == "true") {
    enableMonitor();
} else if (integration == "false" || integration == null) {
    disableMonitor();
}

//软件版本更新提示
var manifest = chrome.runtime.getManifest();
var previousVersion = localStorage.getItem("version");
if (previousVersion == "" || previousVersion != manifest.version) {
    var opt = {
        type: "basic",
        title: "更新",
        message: "\n支持在弹出窗口中打开AriaNG。",
        iconUrl: "images/logo64.png",
        requireInteraction: true
    };
    var id = new Date().getTime().toString();
    //showNotification(id, opt);
    localStorage.setItem("version", manifest.version);
}
