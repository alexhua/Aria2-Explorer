var url = new URL(window.location.href);
var action = url.searchParams.get("action");
var magnetUrl = url.searchParams.get("url");
var webUiUrl = chrome.extension.getURL('ui/ariang/index.html');
if (action == "magnet") {
    var askBeforeDownload = localStorage.getItem("askBeforeDownload") || "false";
    if (askBeforeDownload == "true") {
        launchUI(webUiUrl);
    } else {
        chrome.runtime.sendMessage({ url: magnetUrl });
        closeHandlerPage();
    }
}

function closeHandlerPage() {
    if (window.history.length > 1)
        window.history.back();
    else
        window.close();
}

function launchUI(webUiUrl) {
    chrome.tabs.query({ "url": webUiUrl }, function (tabs) {
        webUiUrl += "#!/new?url=" + btoa(magnetUrl);
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
            if (localStorage.webUIOpenStyle == "newwindow") {
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
