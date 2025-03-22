import Utils from "./js/utils.js";
import Configs from "./js/config.js";
import Aria2 from "./js/aria2.js";
import Aria2Options from "./js/aria2Options.js";
import { IconManager } from "./js/IconUtils/IconManager.js";
import { AnimationController } from './js/IconUtils/AnimationController.js';

const NID_DEFAULT = "NID_DEFAULT";
const NID_TASK_NEW = "NID_TASK_NEW";
const NID_TASK_STOPPED = "NID_TASK_STOPPED";
const NID_CAPTURED_OTHERS = "NID_CAPTURED_OTHERS";

const INTERVAL_SHORT = 1000;
const INTERVAL_LONG = 3000;

var CurrentWindowId = 0;
var CurrentTabUrl = "about:blank";
var MonitorId = null;
var MonitorInterval = INTERVAL_LONG; // Aria2 monitor interval 3000ms
var RemoteAria2List = [];
var IconAnimController = new AnimationController();

const isDownloadListened = () => chrome.downloads.onDeterminingFilename.hasListener(captureDownload);

/**
 * @typedef RpcItem
 * @type {Object}
 * @property {string} name - The name of the Aria2 RPC Server.
 * @property {string} url - The RPC URL with the secret key.
 * @property {string} location - The path to save download file.
 * @property {string} pattern - The URL pattern for auto-matching.
 */

/**
 * @typedef DownloadItem
 * @type {Object}
 * @property {string} url - Single url or multiple urls which are conjunct with '\n'.
 * @property {string} filename
 * @property {string} dir - Download directory
 * @property {string} referrer
 * @property {Object} options - Aria2 RPC options
 * @property {boolean} multiTask - Indicate whether includes multiple urls.
 * @property {string} type - "DOWNLOAD_VIA_BROWSER" will invoke a chrome download.
 */


(function main() {
    init();
    registerAllListeners();
})()

/**
 * Invoke a download task 
 * 
 * @param {DownloadItem} downloadItem 
 * @param {RpcItem} rpcItem
 * @returns {boolean} the result of creating download task
 */
async function download(downloadItem, rpcItem) {
    if (!downloadItem || !downloadItem.url) {
        console.warn("Download: Invalid download item, download request is dismissed!");
        return false;
    }

    let result = true;

    if (!("multiTask" in downloadItem)) {
        downloadItem.multiTask = downloadItem.url.includes('\n');
    }

    if (downloadItem.type == "DOWNLOAD_VIA_BROWSER") {
        try {
            if (downloadItem.multiTask) {
                let urls = downloadItem.url.split('\n');
                for (const url of urls) {
                    await chrome.downloads.download({ url });
                }
            } else {
                await chrome.downloads.download({ url: downloadItem.url, filename: downloadItem.filename });
            }
        } catch {
            result = false;
        }
    } else {
        if (!rpcItem || !rpcItem.url) {
            rpcItem = getRpcServer(downloadItem.url + downloadItem.filename);
        }
        downloadItem.dir = rpcItem.location;
        if (!downloadItem.filename) downloadItem.filename = '';
        if (Configs.askBeforeDownload || downloadItem.multiTask) {
            try {
                await launchUI(downloadItem);
            } catch (error) {
                result = false;
                console.warn("Download: Launch UI failed.");
            }
        } else {
            result = await send2Aria(downloadItem, rpcItem);
        }
    }
    return result;
}

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

async function send2Aria(downloadItem, rpcItem) {
    let cookieItems = [];
    try {
        if (rpcItem.ignoreInsecure || Utils.isLocalhost(rpcItem.url) || /^(https|wss)/i.test(rpcItem.url)) {
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
    if (downloadItem.dir) options.dir = downloadItem.dir;
    if (downloadItem.hasOwnProperty('options')) {
        options = Object.assign(options, downloadItem.options);
    }

    let remote = Utils.parseUrl(rpcItem.url);
    remote.name = rpcItem.name;
    let aria2 = new Aria2(remote);
    return aria2.addUri(downloadItem.url, options).then(function (response) {
        if (response && response.error) {
            return Promise.reject(response.error);
        }
        Aria2Options.getGlobalOptions(rpcItem.url).then(function (globalOptions) {
            if (Object.keys(globalOptions).length > 0)
                aria2.setGlobalOptions(globalOptions);
        });

        const data = { method: "aria2.onExportSuccess", source: aria2, gid: response.result };
        if (!downloadItem.filename)
            downloadItem.filename = Utils.getFileNameFromUrl(downloadItem.url);
        data.contextMessage = Utils.formatFilepath(options.dir) + downloadItem.filename;
        notifyTaskStatus(data);
        return Promise.resolve(true);
    }).catch(function (error) {
        let contextMessage = '';
        if (error && error.message) {
            if (error.message.toLowerCase().includes('unauthorized'))
                contextMessage = "Secret key is incorrect."
            else if (error.message.toLowerCase().includes("failed to fetch"))
                contextMessage = "Aria2 server is unreachable.";
            else
                contextMessage = "Error:" + error.message;
        }
        const data = { method: "aria2.onExportError", source: aria2, contextMessage };
        notifyTaskStatus(data);

        return Promise.resolve(false);
    });
}

/**
 * Get a rpc item whose pattern(s) matches the giving resource url 
 * 
 * @param {string} url - The resource url to be downloaded
 * @return {RpcItem} a RpcItem which refers to an Aria2 RPC server
 */
function getRpcServer(url) {
    let defaultIndex = 0;
    for (let i = 1; i < Configs.rpcList.length; i++) {
        const patternStr = Configs.rpcList[i]['pattern'];
        if (patternStr == '*') {
            defaultIndex = i;
            continue;
        }
        for (let pattern of patternStr.split(',')) {
            pattern = pattern.trim();
            if (matchRule(url, pattern)) {
                return Configs.rpcList[i];
            }
        }
    }
    return Configs.rpcList[defaultIndex];
}

function matchRule(str, rule) {
    return new RegExp("^" + rule.replaceAll('*', '.*') + "$").test(str);
}

function shouldCapture(downloadItem) {
    var currentTabUrl = new URL(CurrentTabUrl);
    var url = new URL(downloadItem.referrer || downloadItem.url);

    if (downloadItem.byExtensionId == chrome.runtime.id) {
        return false;
    }

    if (downloadItem.error || downloadItem.state != "in_progress" || !/^(https?|s?ftp):/i.test(downloadItem.url)) {
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
    IconManager.setToDefault();
    Configs.integration = true;
    chrome.contextMenus.update("MENU_CAPTURE_DOWNLOAD", { checked: true });
}

function disableCapture() {
    if (isDownloadListened()) {
        chrome.downloads.onDeterminingFilename.removeListener(captureDownload);
    }
    IconManager.setToDark();
    Configs.integration = false;
    chrome.contextMenus.update("MENU_CAPTURE_DOWNLOAD", { checked: false });
}

async function captureDownload(downloadItem, suggest) {
    if (downloadItem.byExtensionId) {
        // TODO: Filename assigned by chrome.downloads.download() was not passed in
        // and will be discarded by Chrome. No solution or workaround right now. The
        // only way is disabling capture before other extensions call chrome.downloads.download().
        suggest();
        const title = chrome.i18n.getMessage("RemindCaptureTip");
        const message = chrome.i18n.getMessage("RemindCaptureTipDes");
        const requireInteraction = true;
        const btnTitle1 = chrome.i18n.getMessage("Dismiss");
        const btnTitle2 = chrome.i18n.getMessage("NeverRemind");
        const buttons = [{ title: btnTitle1 }, { title: btnTitle2 }];
        if (Configs.remindCaptureTip && downloadItem.byExtensionId != chrome.runtime.id) {
            Utils.showNotification({ title, message, buttons, requireInteraction }, NID_CAPTURED_OTHERS);
        }
    }

    //always use finalurl when it is available
    if (downloadItem.finalUrl && downloadItem.finalUrl != "about:blank") {
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

        let rpcItem = getRpcServer(downloadItem.url + downloadItem.filename);
        let successful = await download(downloadItem, rpcItem);

        if (!successful && Utils.isLocalhost(rpcItem.url)) {
            disableCapture();
            chrome.downloads.download({ url: downloadItem.url }).then(enableCapture);
        }
    }
}

async function launchUI(info) {
    const index = chrome.runtime.getURL('ui/ariang/index.html');
    let webUiUrl = index + '#!'; // launched from notification, option menu or browser toolbar icon

    let sidePanelOpened = false;
    if (Configs.webUIOpenStyle == "sidePanel") {
        try {
            if (info && 'id' in info) {
                await chrome.sidePanel.open({ tabId: info.id });
            } else {
                await chrome.sidePanel.open({ windowId: CurrentWindowId });
            };
            sidePanelOpened = true;
        } catch {
            sidePanelOpened = false;
        }
    }

    /* assemble the final web ui url */
    if (info?.hasOwnProperty("filename") && info.url) { // launched for new task
        const downloadItem = info;
        webUiUrl = webUiUrl + "/new?url=" + encodeURIComponent(btoa(encodeURI(downloadItem.url)));
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
        if (downloadItem.dir) {
            webUiUrl = webUiUrl + "&dir=" + encodeURIComponent(downloadItem.dir);
        }
    } else if (typeof info === "string" && info.startsWith(NID_TASK_STOPPED)) { // launched from task done notification click
        const gid = info.slice(NID_TASK_STOPPED.length) || '';
        webUiUrl += gid ? "/task/detail/" + gid : "/stopped";
    } else {
        webUiUrl = index;
    }

    if (sidePanelOpened) {
        if (info && 'id' in info) {
            await chrome.sidePanel.setOptions({ tabId: info.id, path: webUiUrl });
        } else {
            await chrome.sidePanel.setOptions({ path: webUiUrl });
        }
        return;
    }

    chrome.tabs.query({ "url": index }).then(function (tabs) {
        if (tabs?.length > 0) {
            chrome.windows.update(tabs[0].windowId, {
                focused: true
            });
            let prop = { active: true };
            if (webUiUrl != index) prop.url = webUiUrl;
            chrome.tabs.update(tabs[0].id, prop);
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
                if (Configs.rpcList.length == 1) {
                    title = strExport + Configs.rpcList[i]['name'] + '  📥';
                } else if (Configs.rpcList.length > 1) {
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
        launchUI(tab);
    } else if (info.menuItemId == "MENU_START_ARIA2") {
        const url = chrome.runtime.getURL('aria2.html');
        chrome.tabs.create({ url });
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
            const rpcItem = getRpcServer(downloadItem.url);
            downloadItem.dir = rpcItem.location;
            downloadItem.id = tab.id;
            launchUI(downloadItem);
        } else {
            let id = info.menuItemId.split('-')[1];
            const rpcItem = Configs.rpcList[id];
            downloadItem.dir = rpcItem.location;
            send2Aria(downloadItem, rpcItem);
        }
    } else if (info.menuItemId == "MENU_EXPORT_ALL" && !tab.url.startsWith("chrome")) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: !info.frameId, frameIds: info.frameId ? [info.frameId] : undefined },
            func: exportAllLinks,
            args: [Configs.allowedExts, Configs.blockedExts]
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
    if (MonitorId) {
        console.warn("Warn: Monitor has already started.");
        return;
    }
    monitorAria2();
    MonitorId = setInterval(monitorAria2, MonitorInterval);
    Configs.monitorAria2 = true;
    chrome.contextMenus.update("MENU_MONITOR_ARIA2", { checked: true });
}

function disableMonitor() {
    MonitorId = clearInterval(MonitorId);
    RemoteAria2List.forEach(aria2 => aria2.closeSocket());
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
            remoteAria2.openSocket();

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

            // Only for default aria2, needs Aria2 enhanced version
            const percent = response.result.percentActive;
            if (i == 0 && percent && !isNaN(percent)) {
                IconAnimController.start('Progress', percent / 100);
            }
        } catch (error) {
            disconnected++;
            if (i == 0) {
                if (error.message?.toLowerCase().includes('unauthorized'))
                    errorMessage = "Secret key is incorrect"
                else
                    errorMessage = "Aria2 server is unreachable";

                if (Configs.monitorAria2 && Configs.integration && isDownloadListened()) {
                    chrome.downloads.onDeterminingFilename.removeListener(captureDownload);
                }
            }
        } finally {
            if (!Configs.monitorAria2) remoteAria2.closeSocket();
            if (!Configs.monitorAll) break;
        }
    }

    if (active > 0) {
        if (MonitorInterval == INTERVAL_LONG) {
            MonitorInterval = INTERVAL_SHORT;
            clearInterval(MonitorId);
            MonitorId = setInterval(monitorAria2, MonitorInterval);
        }
        if (Configs.keepAwake && localConnected > 0)
            chrome.power.requestKeepAwake("system");
        else
            chrome.power.releaseKeepAwake();
    } else if (active == 0) {
        if (MonitorInterval == INTERVAL_SHORT) {
            MonitorInterval = INTERVAL_LONG;
            clearInterval(MonitorId);
            MonitorId = setInterval(monitorAria2, MonitorInterval);
        }
        chrome.power.releaseKeepAwake();
        if (waiting > 0) {
            IconAnimController.start('Pause');
        }
    }

    let bgColor = 'green', textColor = 'white', text = '', title = '';
    let connectedStr = chrome.i18n.getMessage("connected");
    let disconnectedStr = chrome.i18n.getMessage("disconnected");
    if (Configs.monitorAll) title = `${connectedStr}: ${connected} ${disconnectedStr}: ${disconnected}\n`
    if (connected > 0) {
        if (!Configs.badgeText) {
            text = '';
        } else if (active > 0) {
            bgColor = (Configs.monitorAll && connected < RemoteAria2List.length) ? '#0077cc' : 'green';
            text = active.toString();
        } else if (waiting > 0) {
            bgColor = '#AAA'; // grey
            text = waiting.toString();
        } else {
            textColor = '#666'; // light blue
            bgColor = '#E1EEF5';
            text = '0';
        }
        uploadSpeed = Utils.getReadableSpeed(uploadSpeed);
        downloadSpeed = Utils.getReadableSpeed(downloadSpeed);
        let uploadStr = chrome.i18n.getMessage("upload");
        let downloadStr = chrome.i18n.getMessage("download");
        let waitStr = chrome.i18n.getMessage("wait");
        let finishStr = chrome.i18n.getMessage("finish");
        title += `${downloadStr}: ${active}  ${waitStr}: ${waiting}  ${finishStr}: ${stopped}\n${uploadStr}: ${uploadSpeed}  ${downloadStr}: ${downloadSpeed}`;
    } else {
        if (localConnected == 0) chrome.power.releaseKeepAwake();
        bgColor = "#A83030" // red;
        text = 'E';
        if (Configs.monitorAll)
            title += 'No Aria2 server is reachable.';
        else
            title += `Failed to connect with ${RemoteAria2List[0].name}. ${errorMessage}.`;
    }

    if (Configs.monitorAria2) {
        chrome.action.setBadgeTextColor({ color: textColor });
        chrome.action.setBadgeBackgroundColor({ color: bgColor });
        chrome.action.setBadgeText({ text });
        chrome.action.setTitle({ title });
    }
}

async function resetSidePanel(tabId) {
    if (Configs.webUIOpenStyle == "sidePanel") {
        let { path } = await chrome.sidePanel.getOptions(tabId ? { tabId } : undefined);
        const defaultPath = 'ui/ariang/index.html';
        if (!path.endsWith(defaultPath)) {
            chrome.sidePanel.setOptions(tabId ? { tabId, path: defaultPath } : { path: defaultPath });
        }
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
        resetSidePanel(tabId);
    });

    chrome.tabs.onActivated.addListener(function (activeInfo) {
        chrome.tabs.get(activeInfo.tabId).then(function (tab) {
            CurrentTabUrl = tab?.url || "about:blank";
            updateOptionMenu(tab);
        });
        resetSidePanel(activeInfo.tabId);
    });

    chrome.windows.onFocusChanged.addListener(function (windowId) {
        CurrentWindowId = windowId;
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

    chrome.notifications.onButtonClicked.addListener(function (nid, buttonIndex) {
        if (nid == NID_CAPTURED_OTHERS) {
            switch (buttonIndex) {
                case 0:
                    break;
                case 1:
                    chrome.storage.local.set({ remindCaptureTip: false });
                    break;
            }
        }
        chrome.notifications.clear(nid);
    });

    chrome.commands.onCommand.addListener(function (command) {
        if (command === "toggle-capture") {
            Configs.integration = !Configs.integration;
            chrome.storage.local.set({ integration: Configs.integration });
        } else if (command === "launch-aria2") {
            const url = chrome.runtime.getURL('aria2.html');
            chrome.tabs.create({ url });
        }
    });

    chrome.runtime.onInstalled.addListener(function (details) {
        if (details.reason == "install") {
            const url = chrome.runtime.getURL("options.html");
            chrome.storage.local.set(Configs).then(() => chrome.tabs.create({ url }));
        } else if (details.reason == "update") {
            const manifest = chrome.runtime.getManifest();
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
    chrome.runtime.onMessageExternal.addListener(
        function (downloadItem) {
            if (Configs.allowExternalRequest) {
                download(downloadItem);
            }
        }
    );

    /* receive download request from magnet page, export all, ariaNG */
    chrome.runtime.onMessage.addListener(
        function (message, sender, sendResponse) {
            switch (message.type) {
                case "DOWNLOAD":
                case "EXPORT_ALL":
                    download(message.data);
                    break;
                case "DOWNLOAD_VIA_BROWSER":
                    let downloadItem = message.data || {};
                    downloadItem.type = "DOWNLOAD_VIA_BROWSER";
                    download(downloadItem);
                    break;
                case "QUERY_WINDOW_STATE":
                    chrome.windows.get(message.data).then(
                        (window) => { sendResponse({ data: window }) }
                    );
                    return true;
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
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: Configs.webUIOpenStyle == "sidePanel" });
    });
}

function initRemoteAria2() {
    let uniqueRpcList = Utils.compactRpcList(Configs.rpcList);
    for (const i in uniqueRpcList) {
        RemoteAria2List = RemoteAria2List.slice(0, uniqueRpcList.length);
        let rpcItem = uniqueRpcList[i];
        let remote = Utils.parseUrl(rpcItem.url);
        remote.name = rpcItem.name;
        if (RemoteAria2List[i]) {
            RemoteAria2List[i].setRemote(remote.name, remote.rpcUrl, remote.secretKey);
        } else {
            RemoteAria2List[i] = new Aria2(remote);
        }
        if (Configs.monitorAria2 && (i == 0 || Configs.monitorAll)) {
            RemoteAria2List[i].regMessageHandler(notifyTaskStatus);
        } else {
            RemoteAria2List[i].unRegMessageHandler(notifyTaskStatus);
        }
    }
}

/**
 * @param {object} data received event
 * @param {string} data.method  event name (required)
 * @param {string} data.contextMessage context message to notify
 * @param {string} data.gid corresponding task gid
 * @param {Aria2} data.source the event source
 */
async function notifyTaskStatus(data) {
    const events = ["aria2.onDownloadComplete", "aria2.onBtDownloadComplete",
        "aria2.onDownloadError", "aria2.onExportSuccess", "aria2.onExportError"];

    if (!data || !events.includes(data.method)) return;

    let event = data.method;

    // notify via extension icon animations
    if (event) {
        if (event.endsWith("ExportSuccess")) {
            IconAnimController.start("Download");
        } else if (event.endsWith("Complete")) {
            IconAnimController.start("Complete");
        } else if (event.endsWith("Error")) {
            IconAnimController.start("Error");
        }
    }

    if (!Configs.allowNotification) return;

    const aria2 = data.source;
    const gid = data.params?.length ? data.params[0]["gid"] : data.gid ?? '';
    let contextMessage = data.contextMessage ?? '';
    if (!contextMessage && gid) {
        try {
            const response = await aria2.tellStatus(gid, ["dir", "files", "bittorrent"]);
            if (response?.result) {
                const dir = Utils.formatFilepath(response.result.dir);
                const bittorrent = response.result.bittorrent;
                const files = response.result.files ?? [];
                if (bittorrent?.info?.name) {
                    contextMessage = dir + bittorrent.info.name;
                } else if (files.length && files[0].path) {
                    contextMessage = Utils.formatFilepath(files[0].path, false);
                } else {
                    contextMessage = dir + Utils.getFileNameFromUrl(files[0].uris[0].uri);
                }
                if (event == "aria2.onDownloadComplete" && bittorrent && !(contextMessage.startsWith("[METADATA]") || contextMessage.endsWith(".torrent"))) {
                    event = "aria2.onSeedingComplete";
                }
            }
        } catch {
            console.warn("NotifyStatus: Can not get context message");
        }
    }

    let title = "taskNotification", message = '', sign = '', nid = '';
    switch (event) {
        case "aria2.onDownloadStart":
            message = "DownloadStart";
            sign = ' ⬇️';
            nid = NID_DEFAULT + gid;
            break;
        case "aria2.onDownloadComplete":
            message = "DownloadComplete";
            sign = ' ✅';
            nid = NID_TASK_STOPPED + gid;
            break;
        case "aria2.onSeedingComplete":
            message = "SeedingOver";
            sign = ' ⬆️ ✅';
            nid = NID_DEFAULT + gid;
            break;
        case "aria2.onBtDownloadComplete":
            message = "DownloadComplete";
            sign = ' ✅';
            nid = NID_TASK_STOPPED + gid;
            break;
        case "aria2.onDownloadError":
            message = "DownloadError";
            sign = ' ❌';
            nid = NID_TASK_STOPPED + gid;
            break;
        case "aria2.onExportSuccess":
            title = "ExportSucceedStr"
            message = "ExportSucceedDes";
            sign = ' ⬇️';
            nid = NID_DEFAULT + gid;
            break;
        case "aria2.onExportError":
            title = "ExportFailedStr";
            message = "ExportFailedDes";
            sign = ' ❌';
            nid = NID_DEFAULT + Aria2.RequestId;
            break;
    }

    //notify via browser notification
    if (message) {
        title = chrome.i18n.getMessage(title);
        message = chrome.i18n.getMessage(message, aria2 ? aria2.name : "Aria2") + sign;
        let silent = Configs.keepSilent;
        Utils.showNotification({ title, message, contextMessage, silent }, nid);
    }
}

/**
 * Web page injector which will send all valid urls to background js
 * 
 * @param {Array} allowedExts - The file extension list which will export
 * @param {Array} blockedExts - The blocked file extension list which will not export
 */
function exportAllLinks(allowedExts, blockedExts) {
    if (!Array.isArray(allowedExts)) allowedExts = [];
    if (!Array.isArray(blockedExts)) blockedExts = [];

    let links = [];
    const elements = document.querySelectorAll("a,img,audio,video,source,enclosure");
    for (const element of elements) {
        let link = '';
        let tagName = element.tagName.toUpperCase();
        let srcProp = '';
        try {
            switch (tagName) {
                case 'A':
                    srcProp = 'href';
                    break;
                case 'ENCLOSURE':
                    srcProp = 'url';
                    break;
                // case 'SOURCE':
                //     srcProp = 'srcset';
                //     break;
                default:
                    srcProp = 'src';
            }
            if (element[srcProp]) {
                link = element[srcProp];
            } else if (element.attributes[srcProp]) {
                link = element.attributes[srcProp].value;
            } else {
                continue;
            }

            let url = new URL(link);
            let filename = url.pathname.split('/').pop();
            let ext = filename.includes('.') ? filename.split('.').pop() : '';
            let valid = false;
            if (url.protocol == "magnet:" || /VIDEO|AUDIO|SOURCE/.test(tagName) && url.protocol.startsWith("http")) {
                valid = true;
            } else if (/^http|ftp|sftp/.test(url.protocol)) {
                if (allowedExts.includes(ext) || allowedExts.includes('*')) {
                    valid = true;
                } else if (blockedExts.includes(ext) || blockedExts.includes('*')) {
                    valid = false;
                } else if (tagName == 'IMG') {
                    if (element.width >= 400 && element.height >= 300) {
                        valid = true;
                    }
                } else if (ext) {
                    if (/^[\da-z]{1,8}$/i.test(ext) && !/^(htm|asp|php|cgi|xml|js|css|do|\d+$)/i.test(ext)) {
                        valid = true;
                    }
                }
            }
            if (valid && !links.includes(link)) {
                links.push(link);
            }
        } catch (e) {
            console.warn("DownloadAllLinks: Invalid URL found, URL=", link);
        }
    }
    if (links.length > 0) {
        let downloadItem = { filename: '', url: links.join('\n'), referrer: window.location.href, multiTask: true };
        chrome.runtime.sendMessage({ type: "EXPORT_ALL", data: downloadItem });
    } else {
        setTimeout(() => {
            if (document.hasFocus()) {
                alert("\nAria2-Explorer: " + chrome.i18n.getMessage("exportAllFailedDes"));
            }
        }, 300);
    }
}
