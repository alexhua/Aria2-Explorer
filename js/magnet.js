var url = new URL(window.location.href);
var action = url.searchParams.get("action");
var magnetUrl = url.searchParams.get("url");
var webUiUrl = chrome.runtime.getURL('ui/ariang/index.html');
var Configs = await chrome.storage.local.get(["askBeforeDownload", "webUIOpenStyle"]);
var askBeforeDownload = Configs.askBeforeDownload;
var webUIOpenStyle = Configs.webUIOpenStyle;

if (action == "magnet" && magnetUrl && magnetUrl.startsWith("magnet:")) {
    if (askBeforeDownload) {
        launchUI(webUiUrl);
    } else {
        chrome.runtime.sendMessage({ type: "DOWNLOAD", data: { url: magnetUrl } }).then(closeHandlerPage);
    }
} else {
    closeHandlerPage();
}

function closeHandlerPage() {
    if (window.history.length > 1)
        window.history.back();
    else
        window.close();
}

function launchUI(webUiUrl) {
    chrome.tabs.query({ "url": webUiUrl }).then(function (tabs) {
        webUiUrl += "#!/new?url=" + encodeURIComponent(btoa(encodeURI(magnetUrl)));
        if (tabs?.length > 0) {
            chrome.windows.update(tabs[0].windowId, {
                focused: true
            });
            chrome.tabs.update(tabs[0].id, {
                active: true,
                url: webUiUrl
            }, function () {
                closeHandlerPage();
            });
        } else {
            if (webUIOpenStyle == "window") {
                openInWindow(webUiUrl);
            } else {
                chrome.tabs.create({
                    url: webUiUrl
                }, function () {
                    closeHandlerPage();
                });
            }
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
        closeHandlerPage();
    });
}
