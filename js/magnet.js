var url = new URL(window.location.href);
var action = url.searchParams.get("action");
var magnetUrl = url.searchParams.get("url");

if (action == "magnet" && magnetUrl && magnetUrl.startsWith("magnet:")) {
    chrome.runtime.sendMessage({
        type: "DOWNLOAD",
        data: { filename: '', url: magnetUrl }
    }).then(closeHandlerPage);
} else {
    closeHandlerPage();
}

function closeHandlerPage() {
    if (window.history.length > 1)
        window.history.back();
    else
        window.close();
}