var url = new URL(window.location.href);
var action = url.searchParams.get("action");
var magnetUrl = url.searchParams.get("url");
if (action == "magnet") {
    var askBeforeDownload = localStorage.getItem("askBeforeDownload") || "false";
    if (askBeforeDownload == "true") {
        webUI = chrome.extension.getURL('ui/ariang/index.html');
        url = webUI + "#!/new?url=" + btoa(magnetUrl);
        window.location.replace(url);
    } else {
        chrome.runtime.sendMessage({ url: magnetUrl });
        if (window.history.length > 1)
            window.history.back();
        else
            window.close();
    }
}