import Utils from "./js/utils.js";
import Configs from "./js/config.js";
import Aria2 from "./js/aria2.js";

var CurrentTabUrl = "about:blank";
var MonitorId = -1;
var MonitorRate = 3000; // Aria2 monitor interval 3000ms
const RemoteAria2 = new Aria2();

const isDownloadListened = () => chrome.downloads.onDeterminingFilename.hasListener(captureDownload);

(function main() {
    init();
    registerAllListeners();
})()

async function getCookies(downloadItem) {
    let storeId = downloadItem.incognito == true ? "1" : "0";
    let cookies = await chrome.cookies.getAll({ "url": downloadItem.url, "storeId": storeId });
    let cookieItems = [];
    for (const cookie of cookies) {
        cookieItems.push(cookie.name + "=" + cookie.value);
    }
    return cookieItems;
}

async function send2Aria(rpcItem, downloadItem) {
    let cookieItems = [];
    try {
        cookieItems = await getCookies(downloadItem);
    } catch (error) {
        console.log(error.message);
    }
    let header = [];
    if (cookieItems.length > 0) {
        header.push("Cookie: " + cookieItems.join("; "));
    }
    header.push("User-Agent: " + navigator.userAgent);
    header.push("Connection: keep-alive");

    let options = {
        "header": header,
        "referer": downloadItem.referrer,
        "out": downloadItem.filename
    };
    if (rpcItem.location) {
        options.dir = rpcItem.location;
    }
    if (downloadItem.hasOwnProperty('options')) {
        options = Object.assign(options, downloadItem.options);
    }

    let remote = Utils.parseUrl(rpcItem.url);
    let aria2 = new Aria2(remote);
    let silent = Configs.keepSilent;
    return aria2.addUri(downloadItem.url, options).then(function (response) {
        if (response && response.error) {
            return Promise.reject(response.error);
        }
        let title = chrome.i18n.getMessage("exportSucceedStr");
        let message = chrome.i18n.getMessage("exportSucceedDes", [rpcItem.name]);
        if (!downloadItem.filename)
            downloadItem.filename = Utils.getFileName(downloadItem.url);
        let contextMessage = (options.dir || '') + downloadItem.filename;
        if (Configs.allowNotification)
            Utils.showNotification({ title, message, contextMessage, silent }, "NewTask");
        return Promise.resolve("OK");
    }).catch(function (error) {
        let title = chrome.i18n.getMessage("exportFailedStr");
        let message = chrome.i18n.getMessage("exportFailedDes", [rpcItem.name]);
        let contextMessage = '';
        if (error && error.message) {
            contextMessage = `Error: ${error.message}.`;
        }
        if (Configs.allowNotification)
            Utils.showNotification({ title, message, contextMessage, silent }, "NewTask");

        return Promise.resolve("FAIL");
    });
}
/**
 * Get a rpc item whose pattern(s) matches the giving resource url 
 * 
 * @param {string} url The resource url to be downloaded
 */
function getRpcServer(url) {
    for (let i = 1; i < Configs.rpcList.length; i++) {
        let patterns = Configs.rpcList[i]['pattern'].split(',');
        for (let pattern of patterns) {
            pattern = pattern.trim();
            if (matchRule(url, pattern)) {
                return Configs.rpcList[i];
            }
        }
    }
    return Configs.rpcList[0];
}

function matchRule(str, rule) {
    return new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
}

function shouldCapture(downloadItem) {
    var currentTabUrl = new URL(CurrentTabUrl);
    var url = new URL(downloadItem.referrer || downloadItem.url);

    if (downloadItem.error || downloadItem.state != "in_progress" || !/^(https?|s?ftps?):/i.test(downloadItem.url)) {
        return false;
    }

    for (var i in Configs.allowedSites) {
        if (matchRule(currentTabUrl.hostname, Configs.allowedSites[i]) || matchRule(url.hostname, Configs.allowedSites[i])) {
            return true;
        }
    }
    for (var i in Configs.blockedSites) {
        if (matchRule(currentTabUrl.hostname, Configs.blockedSites[i]) || matchRule(url.hostname, Configs.blockedSites[i])) {
            return false;
        }
    }

    for (var i in Configs.allowedExts) {
        if (downloadItem.filename.endsWith(Configs.allowedExts[i]) || Configs.allowedExts[i] == "*") {
            return true;
        }
    }
    for (var i in Configs.blockedExts) {
        if (downloadItem.filename.endsWith(Configs.blockedExts[i]) || Configs.blockedExts[i] == "*") {
            return false;
        }
    }

    return downloadItem.fileSize >= Configs.fileSize * 1024 * 1024
}

function enableCapture() {
    if (!isDownloadListened()) {
        chrome.downloads.onDeterminingFilename.addListener(captureDownload);
    }
    chrome.action.setIcon({
        path: {
            '32': "images/logo32.png",
            '64': "images/logo64.png",
            '128': "images/logo128.png",
            '256': "images/logo256.png"
        }
    });
    Configs.integration = true;
    chrome.contextMenus.update("captureDownload", { checked: true });
}

function disableCapture() {
    if (isDownloadListened()) {
        chrome.downloads.onDeterminingFilename.removeListener(captureDownload);
    }
    chrome.action.setIcon({
        path: {
            '32': "images/logo32-gray.png",
            '64': "images/logo64-gray.png",
            '128': "images/logo128-gray.png",
            '256': "images/logo256-gray.png"
        }
    });
    Configs.integration = false;
    chrome.contextMenus.update("captureDownload", { checked: false });
}

async function captureDownload(downloadItem, suggest) {
    if (downloadItem.byExtensionId) {
        // TODO: Filename assigned by chrome.downloads.download() was not passed in
        // and will be discarded by Chrome. No solution or workaround right now. The
        // only way is disabling capture before other extension calls chrome.downloads.download().
        suggest();
    }

    //always use finalurl when it is available
    if (downloadItem.finalUrl != "" && downloadItem.finalUrl != "about:blank") {
        downloadItem.url = downloadItem.finalUrl;
    }
    if (Configs.integration && shouldCapture(downloadItem)) {
        chrome.downloads.cancel(downloadItem.id).then(() => {
            if (chrome.runtime.lastError)
                chrome.runtime.lastError = null;
        });
        if (downloadItem.referrer == "about:blank") {
            downloadItem.referrer = "";
        }
        if (Configs.askBeforeDownload) {
            launchUI(downloadItem);
        } else {
            let rpcItem = getRpcServer(downloadItem.url);
            let ret = await send2Aria(rpcItem, downloadItem);
            if (ret == "FAIL") {
                disableCapture();
                chrome.downloads.download({ url: downloadItem.url }).then(enableCapture);
            }
        }
    }
}

async function launchUI(downloadItem) {
    const index = chrome.runtime.getURL('ui/ariang/index.html');
    let webUiUrl = index; // launched from notification, option menu or browser toolbar icon
    if (downloadItem?.hasOwnProperty("filename") && downloadItem.url) { // launched for new task
        webUiUrl = index + "#!/new?url=" + encodeURIComponent(btoa(encodeURI(downloadItem.url)));
        if (downloadItem.referrer && downloadItem.referrer != "" && downloadItem.referrer != "about:blank") {
            webUiUrl = webUiUrl + "&referer=" + encodeURIComponent(btoa(encodeURI(downloadItem.referrer)));
        }
        let header = "User-Agent: " + navigator.userAgent;
        let cookies = await getCookies(downloadItem);
        if (cookies.length > 0) {
            header += "\nCookie: " + cookies.join(";");
        }
        webUiUrl = webUiUrl + "&header=" + encodeURIComponent(btoa(header));
    } else if (downloadItem == "TaskStatus") { // launched from task done notification click
        webUiUrl = webUiUrl + "#!/stopped";
    }
    chrome.tabs.query({ "url": index }).then(function (tabs) {
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
        if (Configs.webUIOpenStyle == "window") {
            openInWindow(webUiUrl);
        } else {
            chrome.tabs.create({
                url: webUiUrl
            });
        }
    });
}

async function openInWindow(url) {
    let screen = await chrome.system.display.getInfo()
    const w = Math.floor(screen[0].workArea.width * 0.75);
    const h = Math.floor(screen[0].workArea.height * 0.75)
    const l = Math.floor(screen[0].workArea.width * 0.12);
    const t = Math.floor(screen[0].workArea.height * 0.12);

    chrome.windows.create({
        url: url,
        width: w,
        height: h,
        left: l,
        top: t,
        type: 'popup',
        focused: false
    }).then(function (window) {
        chrome.windows.update(window.id, {
            focused: true
        });
    });
}

function createOptionMenu() {
    let title = chrome.i18n.getMessage("downloadCaptureStr");
    chrome.contextMenus.create({
        "type": "checkbox",
        "checked": Configs.integration,
        "id": "captureDownload",
        "title": '📥 ' + title,
        "contexts": ["action"]
    });
    title = chrome.i18n.getMessage("monitorAria2Str");
    chrome.contextMenus.create({
        "type": "checkbox",
        "checked": Configs.monitorAria2,
        "id": "monitorAria2",
        "title": '🩺 ' + title,
        "contexts": ["action"]
    });
    chrome.contextMenus.create({
        "type": "separator",
        "id": "separator",
        "contexts": ["action"]
    });
    title = chrome.i18n.getMessage("openWebUIStr");
    chrome.contextMenus.create({
        "type": "normal",
        "id": "openWebUI",
        "title": '🪟 ' + title,
        "contexts": ["action"]
    });
    title = chrome.i18n.getMessage("addToWhiteListStr");
    chrome.contextMenus.create({
        "type": "normal",
        "id": "updateWhiteSite",
        "title": '✅ ' + title,
        "contexts": ["action"]
    });
    title = chrome.i18n.getMessage("addToBlackListStr");
    chrome.contextMenus.create({
        "type": "normal",
        "id": "updateBlackSite",
        "title": '🚫 ' + title,
        "contexts": ["action"]
    });
}

function createContextMenu() {
    var strExport = chrome.i18n.getMessage("contextmenuTitle");
    if (Configs.contextMenus) {
        if (Configs.askBeforeExport) {
            chrome.contextMenus.create({
                id: "0",
                title: strExport + "AriaNG",
                contexts: ['link', 'selection']
            });
        } else {
            for (var i in Configs.rpcList) {
                chrome.contextMenus.create({
                    id: i,
                    title: '📥 ' + strExport + Configs.rpcList[i]['name'],
                    contexts: ['link', 'selection']
                });
            }
        }
    }
}

function onMenuClick(info, tab) {
    const url = decodeURIComponent(info.linkUrl || info.selectionText);
    const referrer = info.frameUrl || info.pageUrl;
    const filename = '';
    // mock a DownloadItem
    let downloadItem = { url, referrer, filename };

    if (info.menuItemId == "openWebUI") {
        launchUI();
    } else if (info.menuItemId == "captureDownload") {
        chrome.storage.local.set({ integration: info.checked })
    } else if (info.menuItemId == "monitorAria2") {
        chrome.storage.local.set({ monitorAria2: info.checked })
    } else if (info.menuItemId == "updateBlackSite") {
        updateBlockedSites(tab);
        updateOptionMenu(tab);
    } else if (info.menuItemId == "updateWhiteSite") {
        updateAllowedSites(tab);
        updateOptionMenu(tab);
    } else {
        if (Configs.askBeforeExport) {
            launchUI(downloadItem);
        } else {
            let rpcItem = Configs.rpcList[info.menuItemId];
            send2Aria(rpcItem, downloadItem);
        }
    }
}

function updateOptionMenu(tab) {
    let blockedSitesSet = new Set(Configs.blockedSites);
    let allowedSitesSet = new Set(Configs.allowedSites);
    if (tab == null || !tab.active) {
        if (!tab) {
            console.log("Could not get active tab, update option menu failed.")
        };
        return;
    }
    let url = new URL(tab.url || "about:blank");
    let title = '✅ ';
    if (allowedSitesSet.has(url.hostname)) {
        title += chrome.i18n.getMessage("removeFromWhiteListStr");
    } else {
        title += chrome.i18n.getMessage("addToWhiteListStr");
    }
    chrome.contextMenus.update("updateWhiteSite", { title });
    title = '🚫 '
    if (blockedSitesSet.has(url.hostname)) {
        title += chrome.i18n.getMessage("removeFromBlackListStr");
    } else {
        title += chrome.i18n.getMessage("addToBlackListStr");
    }
    chrome.contextMenus.update("updateBlackSite", { title });
}

function updateAllowedSites(tab) {
    if (tab == null || tab.url == null) {
        console.warn("Could not get active tab url, update option menu failed.");
    }
    if (!tab.active || tab.url.startsWith("chrome"))
        return;
    var allowedSitesSet = new Set(Configs.allowedSites);
    var url = new URL(tab.url);
    if (allowedSitesSet.has(url.hostname)) {
        allowedSitesSet.delete(url.hostname);
    } else {
        allowedSitesSet.add(url.hostname);
    }
    Configs.allowedSites = Array.from(allowedSitesSet);
    chrome.storage.local.set({ allowedSites: Configs.allowedSites });
}

function updateBlockedSites(tab) {
    if (tab == null || tab.url == null) {
        console.warn("Could not get active tab url, update option menu failed.");
    }
    if (!tab.active || tab.url.startsWith("chrome"))
        return;
    var blockedSitesSet = new Set(Configs.blockedSites);
    var url = new URL(tab.url);
    if (blockedSitesSet.has(url.hostname)) {
        blockedSitesSet.delete(url.hostname);
    } else {
        blockedSitesSet.add(url.hostname);
    }
    Configs.blockedSites = Array.from(blockedSitesSet);
    chrome.storage.local.set({ blockedSites: Configs.blockedSites });
}

function enableMonitor() {
    if (MonitorId !== -1) {
        console.log("Warn: Monitor has already started.");
        return;
    }
    monitorAria2();
    MonitorId = setInterval(monitorAria2, MonitorRate);
    Configs.monitorAria2 = true;
    chrome.contextMenus.update("monitorAria2", { checked: true });
}

function disableMonitor() {
    clearInterval(MonitorId);
    MonitorId = -1;
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setTitle({ title: "" });
    Configs.monitorAria2 = false;
    chrome.contextMenus.update("monitorAria2", { checked: false });
    if (Configs.integration && !isDownloadListened()) {
        chrome.downloads.onDeterminingFilename.addListener(captureDownload);
    }
    chrome.power.releaseKeepAwake();
}

function monitorAria2() {
    RemoteAria2.getGlobalStat().then(function (response) {
        if (response && response.error)
            return Promise.reject(response.error);
        let numActive = response.result.numActive;
        let numStopped = response.result.numStopped;
        let numWaiting = response.result.numWaiting;
        let uploadSpeed = Utils.getReadableSpeed(response.result.uploadSpeed);
        let downloadSpeed = Utils.getReadableSpeed(response.result.downloadSpeed);
        /* Tune the monitor rate dynamically */
        if (numActive > 0) {
            if (MonitorRate == 3000) {
                MonitorRate = 1000;
                disableMonitor();
                enableMonitor();
            }
            if (Configs.keepAwake)
                chrome.power.requestKeepAwake("system");
            else
                chrome.power.releaseKeepAwake();
        } else if (numActive == 0) {
            if (MonitorRate == 1000) {
                MonitorRate = 3000;
                disableMonitor();
                enableMonitor();
            }
            chrome.power.releaseKeepAwake();
        }
        chrome.action.setBadgeBackgroundColor({ color: "green" });
        chrome.action.setBadgeText({ text: numActive });
        let uploadStr = chrome.i18n.getMessage("upload");
        let downloadStr = chrome.i18n.getMessage("download");
        let waitStr = chrome.i18n.getMessage("wait");
        let finishStr = chrome.i18n.getMessage("finish");
        chrome.action.setTitle({ title: `${downloadStr}: ${numActive}  ${waitStr}: ${numWaiting}  ${finishStr}: ${numStopped}\n${uploadStr}: ${uploadSpeed}  ${downloadStr}: ${downloadSpeed}` });
        if (Configs.integration && !isDownloadListened()) {
            chrome.downloads.onDeterminingFilename.addListener(captureDownload);
        }
    }).catch(function (error) {
        if (!Configs.monitorAria2) return;
        let title = "Failed to connect with Aria2.";
        if (error && error.message) {
            title += ` ${error.message}.`;
        }
        chrome.action.setBadgeBackgroundColor({ color: "red" });
        chrome.action.setBadgeText({ text: "E" });
        chrome.action.setTitle({ title: title });
        if (Configs.integration && Configs.monitorAria2 && isDownloadListened()) {
            chrome.downloads.onDeterminingFilename.removeListener(captureDownload);
        }
        if (Configs.allowNotification) {
            setTimeout(RemoteAria2.openSocket.bind(RemoteAria2), 3000);
        }
    });
}

function enableTaskNotification() {
    RemoteAria2.openSocket().addEventListener("message", notifyTaskStatus);
    RemoteAria2.socket.addEventListener("open", () => {
        console.log(RemoteAria2.name, "is connected via websocket.");
        console.log("Remote URL =", RemoteAria2.rpcUrl);
        console.log(RemoteAria2.name, "task notification is enabled.");
    });
}

function disableTaskNotification() {
    if (RemoteAria2.socket) {
        RemoteAria2.socket.removeEventListener("message", notifyTaskStatus);
        RemoteAria2.socket.addEventListener("close", () => {
            console.log(RemoteAria2.name, "websocket is closed.");
            console.log("Remote URL =", RemoteAria2.rpcUrl);
        });
        RemoteAria2.closeSocket();
    }
    console.log(RemoteAria2.name, "task notification is disabled.")
}

async function notifyTaskStatus(event) {
    let data = JSON.parse(event.data)

    if (!data.method || !data.params.length)
        return;
    let gid = data.params[0]["gid"];
    let title = chrome.i18n.getMessage("taskNotification");
    let message = '';
    let id = "TaskStatus";
    switch (data.method) {
        // case "aria2.onDownloadStart":
        //     message = "downloadStart"
        //     break;
        case "aria2.onDownloadComplete":
        case "aria2.onBtDownloadComplete":
            message = "downloadComplete"
            break;
        case "aria2.onDownloadError":
            message = "downloadError"
            break;
    }
    if (message) {
        let sign = message == "downloadComplete" ? '✅' : '❌';
        message = chrome.i18n.getMessage(message, RemoteAria2.name) + sign;
        const response = await RemoteAria2.getFiles(gid);
        let silent = Configs.keepSilent;
        let contextMessage = response.result[0]["path"];
        if (!contextMessage)
            contextMessage = Utils.getFileName(response.result[0].uris[0].uri);
        Utils.showNotification({ title, message, contextMessage, silent }, id);
    }
}

function registerAllListeners() {
    chrome.action.onClicked.addListener(launchUI);
    chrome.contextMenus.onClicked.addListener(onMenuClick);
    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        if (changeInfo.status == "loading" && tab?.active) {
            CurrentTabUrl = tab?.url || "about:blank";
            updateOptionMenu(tab);
        }
    });

    chrome.tabs.onActivated.addListener(function (activeInfo) {
        chrome.tabs.get(activeInfo.tabId).then(function (tab) {
            CurrentTabUrl = tab?.url || "about:blank";
            updateOptionMenu(tab);
        });

    });

    chrome.windows.onFocusChanged.addListener(function (windowId) {
        chrome.tabs.query({ windowId: windowId, active: true }).then(function (tabs) {
            if (tabs?.length > 0) {
                CurrentTabUrl = tabs[0].url || "about:blank";
                updateOptionMenu(tabs[0]);
            }
        });
    });

    chrome.notifications.onClicked.addListener(function (id) {
        if (id != "default")
            launchUI(id);
        chrome.notifications.clear(id);
    });

    chrome.commands.onCommand.addListener(function (command) {
        if (command === "toggle-capture") {
            Configs.integration = !Configs.integration;
            chrome.storage.local.set({ integration: Configs.integration })
        }
    });

    chrome.runtime.onInstalled.addListener(function (details) {
        let optionsUrl = chrome.runtime.getURL("options.html");
        let manifest = chrome.runtime.getManifest();
        if (details.reason == "install") {
            chrome.tabs.create({
                url: optionsUrl
            });
        } else if (details.reason == "update") {
            chrome.storage.local.get("rpcList").then(configs => {
                if (!configs.rpcList) {
                    /* Old local storage should be upgraded to Chrome storage */
                    chrome.tabs.create({
                        url: optionsUrl + "?action=upgrade-storage"
                    });
                }
            })
            /* new version update notification */
            let title = `Version ${manifest.version} 🚀`;
            let message = `${manifest.name} has been updated.`;
            let contextMessage = `Welcome more advices and supports. 🎉`;
            let requireInteraction = true;
            let silent = true; // Configs.keepSilent;
            Utils.showNotification({ title, message, contextMessage, silent, requireInteraction });
        }
    });

    /* receive request from other extensions */
    /**
     * @typedef downloadItem
     * @type {Object}
     * @property {String} url
     * @property {String} filename
     * @property {String} referrer
     * @property {Object} options
     */
    chrome.runtime.onMessageExternal.addListener(
        function (downloadItem) {
            if (Configs.allowExternalRequest) {
                let rpcItem = getRpcServer(downloadItem.url);
                send2Aria(rpcItem, downloadItem);
            }
        }
    );
    /* receive download request from magnet page */
    chrome.runtime.onMessage.addListener(
        function (downloadItem) {
            if (!downloadItem || !downloadItem.url)
                console.warn("Invalid download item, download request is rejected!");
            let rpcItem = getRpcServer(downloadItem.url);
            send2Aria(rpcItem, downloadItem);
        }
    );
    /* Listen to the setting changes from options menu and page to control the extension behaviors */
    chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== "local") return;
        let needReInit = changes.rpcList || changes.contextMenus || changes.askBeforeExport || changes.allowNotification
            || changes.integration || changes.monitorAria2 || changes.captureMagnet || changes.webUIOpenStyle;
        if (needReInit) {
            init();
        } else {
            for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
                Configs[key] = newValue;
            }
        }
    });
}

/* init popup url, context menu, download capture and aria2 monitor */
function init() {
    chrome.storage.local.get().then((configs) => {
        Object.assign(Configs, configs);
        let url = Configs.webUIOpenStyle == "popup" ? chrome.runtime.getURL('ui/ariang/popup.html') : '';
        chrome.action.setPopup({
            popup: url
        });
        let rpcItem = getRpcServer('*');
        let remote = Utils.parseUrl(rpcItem.url);
        RemoteAria2.setRemote(rpcItem.name, remote.rpcUrl, remote.secretKey);
        chrome.contextMenus.removeAll();
        createOptionMenu();
        createContextMenu();
        updateOptionMenu({ url: CurrentTabUrl, active: true });
        Configs.integration ? enableCapture() : disableCapture();
        Configs.monitorAria2 ? enableMonitor() : disableMonitor();
        (Configs.monitorAria2 && Configs.allowNotification) ? enableTaskNotification() : disableTaskNotification();
        url = Configs.captureMagnet ? "https://github.com/alexhua/Aria2-Explore/issues/98" : '';
        chrome.runtime.setUninstallURL(url);
    });
}
