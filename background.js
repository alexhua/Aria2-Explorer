import Utils from "./js/utils.js";
import Configs from "./js/config.js";
import Aria2 from "./js/aria2.js";
import Aria2Options from "./js/aria2Options.js";

var CurrentTabUrl = "about:blank";
var MonitorId = -1;
var MonitorRate = 3000; // Aria2 monitor interval 3000ms
var RemoteAria2List = [];

const NID_DEFAULT = "NID_DEFAULT";
const NID_TASK_NEW = "NID_TASK_NEW";
const NID_TASK_STOPPED = "NID_TASK_STOPPED";

const isDownloadListened = () => chrome.downloads.onDeterminingFilename.hasListener(captureDownload);

(function main() {
    init();
    registerAllListeners();
})()

async function getCookies(downloadItem) {
    let storeId = downloadItem.incognito == true ? "1" : "0";
    let url = downloadItem.multiTask ? downloadItem.referrer : downloadItem.url;
    let cookies = await chrome.cookies.getAll({ url, storeId });
    let cookieItems = [];
    for (const cookie of cookies) {
        cookieItems.push(cookie.name + "=" + cookie.value);
    }
    return cookieItems;
}

async function send2Aria(rpcItem, downloadItem) {
    let cookieItems = [];
    try {
        if (Utils.isLocalhost(rpcItem.rpcUrl) || /^https|wss/.test(rpcItem.rpcUrl)) {
            cookieItems = await getCookies(downloadItem);
        }
    } catch (error) {
        console.warn(error.message);
    }
    let headers = [];
    if (cookieItems.length > 0) {
        headers.push("Cookie: " + cookieItems.join("; "));
    }
    headers.push("User-Agent: " + navigator.userAgent);

    let options = await Aria2Options.getUriTaskOptions(rpcItem.url);
    if (!!options.header) {
        options.header = options.header.split('\n').filter(item => !/^(cookie|user-agent|connection)/i.test(item));
        headers = headers.concat(options.header);
    }
    options.header = headers;
    if (downloadItem.referrer) options.referer = downloadItem.referrer;
    if (downloadItem.filename) options.out = downloadItem.filename;
    if (rpcItem.location) options.dir = rpcItem.location;
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
        Aria2Options.getGlobalOptions(rpcItem.url).then(function (globalOptions) {
            if (Object.keys(globalOptions).length > 0)
                aria2.setGlobalOptions(globalOptions);
        });
        let title = chrome.i18n.getMessage("exportSucceedStr");
        let message = chrome.i18n.getMessage("exportSucceedDes", [rpcItem.name]);
        if (!downloadItem.filename)
            downloadItem.filename = Utils.getFileName(downloadItem.url);
        let contextMessage = (Utils.formatFilepath(options.dir) || '') + downloadItem.filename;
        if (Configs.allowNotification)
            Utils.showNotification({ title, message, contextMessage, silent }, NID_DEFAULT);
        return Promise.resolve("OK");
    }).catch(function (error) {
        let title = chrome.i18n.getMessage("exportFailedStr");
        let message = chrome.i18n.getMessage("exportFailedDes", [rpcItem.name]) + ' ❌';
        let contextMessage = '';
        if (error && error.message) {
            if (error.message.toLowerCase().includes('unauthorized'))
                contextMessage = "Secret key is incorrect"
            else if (error.message.toLowerCase().includes("failed to fetch"))
                contextMessage = "Aria2 server is unreachable";
            else
                contextMessage = error.message;
        }
        if (Configs.allowNotification)
            Utils.showNotification({ title, message, contextMessage, silent }, NID_TASK_NEW);

        return Promise.resolve("FAILED");
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
    chrome.contextMenus.update("MENU_CAPTURE_DOWNLOAD", { checked: true });
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
    chrome.contextMenus.update("MENU_CAPTURE_DOWNLOAD", { checked: false });
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
            if (ret == "FAILED" && Utils.isLocalhost(rpcItem.rpcUrl)) {
                disableCapture();
                chrome.downloads.download({ url: downloadItem.url }).then(enableCapture);
            }
        }
    }
}

async function launchUI(info) {
    const index = chrome.runtime.getURL('ui/ariang/index.html');
    let webUiUrl = index; // launched from notification, option menu or browser toolbar icon

    /* assemble the final web ui url */
    if (info?.hasOwnProperty("filename") && info.url) { // launched for new task
        const downloadItem = info;
        webUiUrl = index + "#!/new?url=" + encodeURIComponent(btoa(encodeURI(downloadItem.url)));
        if (downloadItem.referrer && downloadItem.referrer != "" && downloadItem.referrer != "about:blank") {
            webUiUrl = webUiUrl + "&referer=" + encodeURIComponent(downloadItem.referrer);
        }
        let header = "User-Agent: " + navigator.userAgent;
        let cookies = await getCookies(downloadItem);
        if (cookies.length > 0) {
            header += "\nCookie: " + cookies.join(";");
        }
        webUiUrl = webUiUrl + "&header=" + encodeURIComponent(header);
        if (downloadItem.filename) {
            webUiUrl = webUiUrl + "&filename=" + encodeURIComponent(downloadItem.filename);
        }
    } else if (typeof info === "string" && info.startsWith(NID_TASK_STOPPED)) { // launched from task done notification click
        const gid = info.slice(NID_TASK_STOPPED.length) || '';
        webUiUrl += gid ? "#!/task/detail/" + gid : "#!/stopped";
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

function createRpcOptionsMenu() {
    let rpcOptionsList = [];
    for (const i in Configs.rpcList) {
        if (!Configs.rpcList[i].pattern || Configs.rpcList[i].pattern == '*') {
            rpcOptionsList.push({ id: i, name: Configs.rpcList[i].name })
        }
    }

    if (rpcOptionsList.length < 1) return;

    let needParentMenu = true;
    for (const menuItem of rpcOptionsList) {
        if (needParentMenu) {
            let title = '🔘 ' + chrome.i18n.getMessage("selectDefaultRpcStr");
            chrome.contextMenus.create({
                "type": "normal",
                "id": "MENU_RPC_LIST",
                "title": title,
                "contexts": ["action"]
            });
            needParentMenu = false;
        }
        let checked = Configs.rpcList[menuItem.id].pattern == '*'
        chrome.contextMenus.create({
            "type": "radio",
            "checked": checked,
            "id": "MENU_RPC_LIST-" + menuItem.id,
            "parentId": "MENU_RPC_LIST",
            "title": menuItem.name,
            "contexts": ["action"]
        });
    }
}

function createOptionMenu() {
    let title = chrome.i18n.getMessage("downloadCaptureStr");
    chrome.contextMenus.create({
        "type": "checkbox",
        "checked": Configs.integration,
        "id": "MENU_CAPTURE_DOWNLOAD",
        "title": '📥 ' + title,
        "contexts": ["action"]
    });
    title = chrome.i18n.getMessage("monitorAria2Str");
    chrome.contextMenus.create({
        "type": "checkbox",
        "checked": Configs.monitorAria2,
        "id": "MENU_MONITOR_ARIA2",
        "title": '🩺 ' + title,
        "contexts": ["action"]
    });
    chrome.contextMenus.create({
        "type": "separator",
        "id": "separator",
        "contexts": ["action"]
    });
    if (Utils.getPlatform() == `Windows` && RemoteAria2List[0]?.isLocalhost) {
        title = chrome.i18n.getMessage("startAria2Str");
        chrome.contextMenus.create({
            "type": "normal",
            "id": "MENU_START_ARIA2",
            "title": '⚡️ ' + title,
            "contexts": ["action"]
        });
    } else {
        title = chrome.i18n.getMessage("openWebUIStr");
        chrome.contextMenus.create({
            "type": "normal",
            "id": "MENU_OPEN_WEB_UI",
            "title": '🪟 ' + title,
            "contexts": ["action"]
        });
    }
    title = chrome.i18n.getMessage("websiteFilterStr");
    chrome.contextMenus.create({
        "type": "normal",
        "id": "MENU_WEBSITE_FILTER",
        "title": '🔛 ' + title,
        "contexts": ["action"]
    });
    title = chrome.i18n.getMessage("addToWhiteListStr");
    chrome.contextMenus.create({
        "type": "normal",
        "id": "MENU_UPDATE_ALLOW_SITE",
        "parentId": "MENU_WEBSITE_FILTER",
        "title": '✅ ' + title,
        "contexts": ["action"]
    });
    title = chrome.i18n.getMessage("addToBlackListStr");
    chrome.contextMenus.create({
        "type": "normal",
        "id": "MENU_UPDATE_BLOCK_SITE",
        "parentId": "MENU_WEBSITE_FILTER",
        "title": '🚫 ' + title,
        "contexts": ["action"]
    });
    createRpcOptionsMenu();
}

function createContextMenu() {
    var strExport = chrome.i18n.getMessage("contextmenuTitle");
    let strExportAllDes = chrome.i18n.getMessage("exportAllDes");
    if (Configs.exportAll) {
        chrome.contextMenus.create({
            id: "MENU_EXPORT_ALL",
            title: strExportAllDes,
            contexts: ['page']
        });
    }
    if (Configs.contextMenus) {
        if (Configs.askBeforeExport) {
            chrome.contextMenus.create({
                id: "MENU_EXPORT_TO",
                title: strExport + "AriaNG",
                contexts: ['link', 'selection']
            });
        } else {
            let title = '';
            for (const i in Configs.rpcList) {
                if (Configs.rpcList.length < 2) {
                    title = strExport + Configs.rpcList[i]['name'] + ' 📥';
                } else {
                    title = '📥 ' + strExport + Configs.rpcList[i]['name'];
                }

                chrome.contextMenus.create({
                    id: "MENU_EXPORT_TO-" + i,
                    title: title,
                    contexts: ['link', 'selection']
                });
            }
        }
    }
}

function onMenuClick(info, tab) {
    const url = decodeURI(info.linkUrl || info.selectionText);
    const referrer = info.frameUrl || info.pageUrl;
    const filename = '';
    // mock a DownloadItem
    let downloadItem = { url, referrer, filename };

    if (info.menuItemId == "MENU_OPEN_WEB_UI") {
        launchUI();
    } else if (info.menuItemId == "MENU_START_ARIA2") {
        chrome.tabs.create({ url: "aria2://start/" });
    } else if (info.menuItemId == "MENU_CAPTURE_DOWNLOAD") {
        chrome.storage.local.set({ integration: info.checked });
    } else if (info.menuItemId == "MENU_MONITOR_ARIA2") {
        chrome.storage.local.set({ monitorAria2: info.checked });
    } else if (info.menuItemId == "MENU_UPDATE_BLOCK_SITE") {
        updateBlockedSites(tab);
        updateOptionMenu(tab);
    } else if (info.menuItemId == "MENU_UPDATE_ALLOW_SITE") {
        updateAllowedSites(tab);
        updateOptionMenu(tab);
    } else if (info.menuItemId.startsWith("MENU_RPC_LIST")) {
        let id = info.menuItemId.split('-')[1];
        getRpcServer('*').pattern = '';
        Configs.rpcList[id].pattern = '*';
        chrome.storage.local.set(Configs);
    } else if (info.menuItemId.startsWith("MENU_EXPORT_TO")) {
        if (Configs.askBeforeExport) {
            launchUI(downloadItem);
        } else {
            let id = info.menuItemId.split('-')[1];
            send2Aria(Configs.rpcList[id], downloadItem);
        }
    } else if (info.menuItemId == "MENU_EXPORT_ALL" && !tab.url.startsWith("chrome")) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: false },
            func: exportAllLinks,
        });
    }
}

function updateOptionMenu(tab) {
    let blockedSitesSet = new Set(Configs.blockedSites);
    let allowedSitesSet = new Set(Configs.allowedSites);
    if (tab == null || !tab.active) {
        if (!tab) {
            console.warn("Could not get active tab, update option menu failed.")
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
    chrome.contextMenus.update("MENU_UPDATE_ALLOW_SITE", { title });
    title = '🚫 '
    if (blockedSitesSet.has(url.hostname)) {
        title += chrome.i18n.getMessage("removeFromBlackListStr");
    } else {
        title += chrome.i18n.getMessage("addToBlackListStr");
    }
    chrome.contextMenus.update("MENU_UPDATE_BLOCK_SITE", { title });
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
        console.warn("Warn: Monitor has already started.");
        return;
    }
    monitorAria2();
    MonitorId = setInterval(monitorAria2, MonitorRate);
    Configs.monitorAria2 = true;
    chrome.contextMenus.update("MENU_MONITOR_ARIA2", { checked: true });
}

function disableMonitor() {
    clearInterval(MonitorId);
    MonitorId = -1;
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setTitle({ title: "" });
    Configs.monitorAria2 = false;
    chrome.contextMenus.update("MENU_MONITOR_ARIA2", { checked: false });
    if (Configs.integration && !isDownloadListened()) {
        chrome.downloads.onDeterminingFilename.addListener(captureDownload);
    }
    chrome.power.releaseKeepAwake();
}

async function monitorAria2() {
    let connected = 0, disconnected = 0, localConnected = 0, errorMessage = '';
    let active = 0, stopped = 0, waiting = 0, uploadSpeed = 0, downloadSpeed = 0;

    for (const i in RemoteAria2List) {
        const remoteAria2 = RemoteAria2List[i];
        try {
            let response = await remoteAria2.getGlobalStat();
            if (response && response.error) {
                throw response.error;
            }
            connected++;
            remoteAria2.isLocalhost && localConnected++;
            active += Number(response.result.numActive);
            stopped += Number(response.result.numStopped);
            waiting += Number(response.result.numWaiting);
            uploadSpeed += Number(response.result.uploadSpeed);
            downloadSpeed += Number(response.result.downloadSpeed);
            if (Configs.integration && i == 0 && !isDownloadListened()) {
                chrome.downloads.onDeterminingFilename.addListener(captureDownload);
            }
            if (Configs.allowNotification) remoteAria2.openSocket();
        } catch (error) {
            disconnected++;
            if (i == 0) {
                if (error.message?.toLowerCase().includes('unauthorized'))
                    errorMessage = "Secret key is incorrect"
                else
                    errorMessage = "Aria2 server is unreachable";

                if (Configs.integration && isDownloadListened()) {
                    chrome.downloads.onDeterminingFilename.removeListener(captureDownload);
                }
            }
        } finally {
            if (!Configs.allowNotification) remoteAria2.closeSocket();
            if (!Configs.monitorAll) break;
        }
    }

    if (active > 0) {
        if (MonitorRate == 3000) {
            MonitorRate = 1000;
            disableMonitor();
            enableMonitor();
        }
        if (Configs.keepAwake && localConnected > 0)
            chrome.power.requestKeepAwake("system");
        else
            chrome.power.releaseKeepAwake();
    } else if (active == 0) {
        if (MonitorRate == 1000) {
            MonitorRate = 3000;
            disableMonitor();
            enableMonitor();
        }
        chrome.power.releaseKeepAwake();
    }

    let color = '', text = '', title = '';
    let connectedStr = chrome.i18n.getMessage("connected");
    let disconnectedStr = chrome.i18n.getMessage("disconnected");
    if (Configs.monitorAll) title = `${connectedStr}: ${connected} ${disconnectedStr}: ${disconnected}\n`
    if (connected > 0) {
        color = (Configs.monitorAll && connected < RemoteAria2List.length) ? '#0077cc' : 'green';
        text = active.toString();
        uploadSpeed = Utils.getReadableSpeed(uploadSpeed);
        downloadSpeed = Utils.getReadableSpeed(downloadSpeed);
        let uploadStr = chrome.i18n.getMessage("upload");
        let downloadStr = chrome.i18n.getMessage("download");
        let waitStr = chrome.i18n.getMessage("wait");
        let finishStr = chrome.i18n.getMessage("finish");
        title += `${downloadStr}: ${active}  ${waitStr}: ${waiting}  ${finishStr}: ${stopped}\n${uploadStr}: ${uploadSpeed}  ${downloadStr}: ${downloadSpeed}`;
    } else {
        if (localConnected == 0) chrome.power.releaseKeepAwake();
        color = "#A83030" // red;
        text = 'E';
        if (Configs.monitorAll)
            title += 'No Aria2 server is reachable.';
        else
            title += `Failed to connect with ${RemoteAria2List[0].name}. ${errorMessage}.`;
    }

    if (Configs.monitorAria2) {
        chrome.action.setBadgeBackgroundColor({ color });
        chrome.action.setBadgeText({ text });
        chrome.action.setTitle({ title });
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
        if (id.startsWith(NID_TASK_NEW) || id.startsWith(NID_TASK_STOPPED))
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
            false && Utils.showNotification({ title, message, contextMessage, silent, requireInteraction });
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
     * @property {Boolean} multiTask Indicate whether includes multiple urls
     */
    chrome.runtime.onMessageExternal.addListener(
        function (downloadItem) {
            if (Configs.allowExternalRequest) {
                download(downloadItem);
            }
        }
    );

    /* receive download request from magnet page or export all */
    chrome.runtime.onMessage.addListener(
        function (message) {
            let downloadItem = {};
            switch (message.type) {
                case "DOWNLOAD":
                case "EXPORT_ALL":
                    downloadItem = message.data || {};
                    download(downloadItem);
                    break;
            }
        }
    );

    /* Listen to the setting changes from options menu and page to control the extension behaviors */
    chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== "local") return;
        let needReInit = changes.rpcList || changes.contextMenus || changes.askBeforeExport || changes.exportAll || changes.allowNotification
            || changes.integration || changes.monitorAria2 || changes.monitorAll || changes.captureMagnet || changes.webUIOpenStyle;
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
        initRemoteAria2();
        chrome.contextMenus.removeAll();
        createOptionMenu();
        createContextMenu();
        updateOptionMenu({ url: CurrentTabUrl, active: true });
        Configs.integration ? enableCapture() : disableCapture();
        Configs.monitorAria2 ? enableMonitor() : disableMonitor();
        url = Configs.captureMagnet ? "https://github.com/alexhua/Aria2-Explore/issues/98" : '';
        chrome.runtime.setUninstallURL(url);
    });
}

function initRemoteAria2() {
    let uniqueRpcList = Utils.compactRpcList(Configs.rpcList);
    for (const i in uniqueRpcList) {
        RemoteAria2List = RemoteAria2List.slice(0, uniqueRpcList.length);
        let rpcItem = uniqueRpcList[i];
        let remote = Utils.parseUrl(rpcItem.url);
        if (RemoteAria2List[i]) {
            RemoteAria2List[i].setRemote(rpcItem.name, remote.rpcUrl, remote.secretKey);
        } else {
            RemoteAria2List[i] = new Aria2({ name: rpcItem.name, rpcUrl: remote.rpcUrl, secretKey: remote.secretKey });
        }
        if (Configs.monitorAria2 && Configs.allowNotification && (i == 0 || Configs.monitorAll)) {
            RemoteAria2List[i].regMessageHandler(notifyTaskStatus);
        } else {
            RemoteAria2List[i].clearMessageHandler(notifyTaskStatus);
        }
    }
}

async function notifyTaskStatus(data) {
    if (!data.method || !data.params.length)
        return;
    let aria2 = data.source;
    let gid = data.params[0]["gid"] || '';
    let title = chrome.i18n.getMessage("taskNotification");
    let message = '';
    let id = NID_TASK_STOPPED + gid;
    switch (data.method) {
        // case "aria2.onDownloadStart":
        //     message = "downloadStart"
        //     break;
        case "aria2.onDownloadComplete":
        case "aria2.onBtDownloadComplete":
            message = "downloadComplete";
            break;
        case "aria2.onDownloadError":
            message = "downloadError";
            break;
    }
    if (message) {
        let sign = message == "downloadComplete" ? ' ✅' : ' ❌';
        message = chrome.i18n.getMessage(message, aria2.name) + sign;
        const response = await aria2.getFiles(gid);
        let silent = Configs.keepSilent;
        let contextMessage = Utils.formatFilepath(response.result[0]["path"], false);
        if (!contextMessage)
            contextMessage = Utils.getFileName(response.result[0].uris[0].uri);
        Utils.showNotification({ title, message, contextMessage, silent }, id);
    }
}

function download(downloadItem) {
    if (downloadItem.url) {
        if (Configs.askBeforeDownload || downloadItem.multiTask) {
            launchUI(downloadItem);
        } else {
            let rpcItem = getRpcServer(downloadItem.url);
            send2Aria(rpcItem, downloadItem);
        }
    } else {
        console.warn("Invalid download item, download request is rejected!");
    }
}

/**
 * Web page injector which will send all valid urls to background js
 */
function exportAllLinks() {
    let links = document.getElementsByTagName('a');
    let urls = [];
    for (const i in links) {
        try {
            if (!links[i].href) continue;
            let url = new URL(links[i].href);
            let ext = url.pathname.match(/\/[^\s/$.?#]+\.([^\s/$.?#]+)$/);
            if (url.protocol == "magnet:" || (ext && !/htm|asp|jsp|php|xml|js/i.test(ext[1]))) {
                if (!urls.includes(links[i].href))
                    urls.push(links[i].href);
            }
            false && console.log(links[i].href);
        } catch (e) {
            console.warn("DownloadAllLinks: Invalid URL found, URL=", links[i].href);
        }
    }
    if (urls.length > 0) {
        let downloadItem = { filename: '', url: urls.join('\n'), referrer: window.location.href, multiTask: true };
        chrome.runtime.sendMessage({ type: "EXPORT_ALL", data: downloadItem });
    } else {
        let des = chrome.i18n.getMessage("exportAllFailedDes");
        alert("\n [Aria2-Explorer]: " + des);
    }
}
