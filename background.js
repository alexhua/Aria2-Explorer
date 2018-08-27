const defaultRPC = '[{"name":"ARIA2 RPC","url":"http://localhost:6800/jsonrpc"}]';
var HttpSendRead = function(info) {
    Promise.prototype.done = Promise.prototype.then;
    Promise.prototype.fail = Promise.prototype.catch;
    return new Promise(function(resolve, reject) {
        var http = new XMLHttpRequest();
        var contentType = "application/x-www-form-urlencoded; charset=UTF-8";
        var timeout = 3000;
        if (info.contentType != null) {
            contentType = info.contentType;
        }
        if (info.timeout != null) {
            timeout = info.timeout;
        }
        var timeId = setTimeout(httpclose, timeout);
        function httpclose() {
            http.abort();
        }
        http.onreadystatechange = function() {
            if (http.readyState == 4) {
                if ((http.status == 200 && http.status < 300) || http.status == 304) {
                    clearTimeout(timeId);
                    if (info.dataType == "json") {
                        resolve(JSON.parse(http.responseText), http.status, http);
                    } else if (info.dataType == "SCRIPT") {
                        // eval(http.responseText);
                        resolve(http.responseText, http.status, http);
                    }
                } else {
                    clearTimeout(timeId);
                    reject(http, http.statusText, http.status);
                }
            }
        }
        http.open(info.type, info.url, true);
        http.setRequestHeader("Content-type", contentType);
        for (h in info.headers) {
            if (info.headers[h]) {
                http.setRequestHeader(h, info.headers[h]);
            }
        }
        if (info.type == "POST") {
            http.send(info.data);
        } else {
            http.send();
        }
    }
    );
};

//弹出chrome通知
function showNotification(id, opt) {
    var notification = chrome.notifications.create(id, opt, function(notifyId) {
        return notifyId
    });
}
//解析RPC地址
function parse_url(url) {
    var auth_str = request_auth(url);
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

function aria2Send(link, rpcUrl, downloadItem) {
    var filename = null;
    var referrer = null;
    var cookiesLink = null;
    if (downloadItem != null) {
        filename = downloadItem.filename;
        referrer = downloadItem.referrer;
        cookiesLink = downloadItem.url;
    } else {
        cookiesLink = link;
    }

    chrome.cookies.getAll({
        "url": cookiesLink
    }, function(cookies) {
        var format_cookies = [];
        for (var i in cookies) {
            var cookie = cookies[i];
            format_cookies.push(cookie.name + "=" + cookie.value);
        }
        var header = [];
        header.push("Cookie: " + format_cookies.join("; "));
        header.push("User-Agent: " + navigator.userAgent);
        header.push("Connection: keep-alive");

        var rpc_data = {
            "jsonrpc": "2.0",
            "method": "aria2.addUri",
            "id": new Date().getTime(),
            "params": [[link], {
                "header": header,
                "referer": referrer,
                "out": filename
            }]
        };
        var result = parse_url(rpcUrl);
        var auth = result[1];
        if (auth && auth.indexOf('token:') == 0) {
            rpc_data.params.unshift(auth);
        }

        var parameter = {
            'url': result[0],
            'dataType': 'json',
            type: 'POST',
            data: JSON.stringify(rpc_data),
            'headers': {
                'Authorization': auth
            }
        };
        HttpSendRead(parameter).done(function(json, textStatus, jqXHR) {
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
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.log(jqXHR);
            var title = chrome.i18n.getMessage("exportFailedStr");
            var des = chrome.i18n.getMessage("exportFailedDes");
            var opt = {
                type: "basic",
                title: title,
                message: des,
                iconUrl: "images/logo64.png",
                requireInteraction: false
            }
            var id = new Date().getTime().toString();
            showNotification(id, opt);
        });
    });

}
function matchRule(str, rule) {
    return new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
}
function isCapture(downloadItem) {
    var fileSize = localStorage.getItem("fileSize");
    var white_site = JSON.parse(localStorage.getItem("white_site"));
    var black_site = JSON.parse(localStorage.getItem("black_site"));
    var url = downloadItem.referrer || downloadItem.url;

    if (downloadItem.error || downloadItem.state != "in_progress" || url.startsWith("http") == false) {
        return false;
    }

    var parse_url = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
    var result = parse_url.exec(url)[3];

    for (var i = 0; i < white_site.length; i++) {
        if (matchRule(result, white_site[i])) {
            return true;
        }
    }

    for (var i = 0; i < black_site.length; i++) {
        if (matchRule(result, black_site[i])) {
            return false;
        }
    }

    if (downloadItem.fileSize >= fileSize * 1024 * 1024) {
        return true;
    } else {
        return false;
    }
}

function isCaptureFinalUrl() {
    var finalUrl = localStorage.getItem("finalUrl");
    return finalUrl == "true";

}

chrome.downloads.onDeterminingFilename.addListener(function(downloadItem) {
    var integration = localStorage.getItem("integration");
    var askBeforeDownload = localStorage.getItem("askBeforeDownload");
    if (integration == "true" && isCapture(downloadItem)) {
        if (askBeforeDownload == "true") {
            if (isCaptureFinalUrl()) {
                launchUI(downloadItem.finalUrl);
            } else {
                launchUI(downloadItem.url);
            }
        } else {
            var rpc_list = JSON.parse(localStorage.getItem("rpc_list") || defaultRPC);
            if (isCaptureFinalUrl()) {
                aria2Send(downloadItem.finalUrl, rpc_list[0]['url'], downloadItem);
            } else {
                aria2Send(downloadItem.url, rpc_list[0]['url'], downloadItem);
            }
        }
        chrome.downloads.cancel(downloadItem.id);
    }
});

chrome.browserAction.onClicked.addListener(launchUI);

function launchUI(downloadURL) {
    var index = chrome.extension.getURL('ui/ariang/index.html');
    var url = (typeof downloadURL === "string") ? index + "#!/new?url=" + btoa(downloadURL) : index;
    chrome.tabs.getAllInWindow(undefined, function(tabs) {
        for (var i = 0, tab; tab = tabs[i]; i++) {
            if (tab.url && tab.url.startsWith(index)) {
                chrome.tabs.update(tab.id, {
                    selected: true,
                    url: url
                });
                return;
            }
        }
        chrome.tabs.create({
            url: url
        });
    });

}

//add Context Menu
function addContextMenu(id, title) {
    chrome.contextMenus.create({
        id: id,
        title: title,
        contexts: ['link']
    });
}

function createOptionMenu() {
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

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    var strExport = chrome.i18n.getMessage("contextmenuTitle");
    if (changeInfo.status === 'loading') {
        chrome.contextMenus.removeAll();
        createOptionMenu();
        updateOptionMenu(tab);
        var contextMenus = localStorage.getItem("contextMenus");
        if (contextMenus == "true" || contextMenus == null) {
            var rpc_list = JSON.parse(localStorage.getItem("rpc_list") || defaultRPC);
            for (var i in rpc_list) {
                addContextMenu(rpc_list[i]['url'], strExport + rpc_list[i]['name']);
            }
            localStorage.setItem("contextMenus", true);
        }
    }

});

chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
        updateOptionMenu(tab);
    });

});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
    var uri = decodeURIComponent(info.linkUrl);
    var referrer = info.frameUrl || info.pageUrl;
    // mock a DownloadItem
    var downloadItem = {
        url: uri,
        referrer: referrer,
        filename: ""
    };

    if (info.menuItemId == "updateBlackSite") {
        updateBlackSite(tab);
        updateOptionMenu(tab)
    } else if (info.menuItemId == "updateWhiteSite") {
        updateWhiteSite(tab);
        updateOptionMenu(tab)
    } else {
        aria2Send(uri, info.menuItemId, downloadItem);
    }
});

function updateOptionMenu(tab) {
    var black_site = JSON.parse(localStorage.getItem("black_site"));
    var black_site_set = new Set(black_site);
    var white_site = JSON.parse(localStorage.getItem("white_site"));
    var white_site_set = new Set(white_site);
    var parse_url = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
    if (tab == null || tab.url == null) {
        console.warn("Could not get active tab url, update option menu failed.");
    }
    if (!tab.active || tab.url.startsWith("chrome"))
        return;
    var domain = parse_url.exec(tab.url)[3];
    if (black_site_set.has(domain)) {
        var updateBlackSiteStr = chrome.i18n.getMessage("removeFromBlackListStr");
        chrome.contextMenus.update("updateBlackSite", {
            "title": updateBlackSiteStr
        }, function() {});
    } else {
        var updateBlackSiteStr = chrome.i18n.getMessage("addToBlackListStr");
        chrome.contextMenus.update("updateBlackSite", {
            "title": updateBlackSiteStr
        }, function() {});
    }
    if (white_site_set.has(domain)) {
        var updateWhiteSiteStr = chrome.i18n.getMessage("removeFromWhiteListStr");
        chrome.contextMenus.update("updateWhiteSite", {
            "title": updateWhiteSiteStr
        }, function() {});
    } else {
        var updateWhiteSiteStr = chrome.i18n.getMessage("addToWhiteListStr");
        chrome.contextMenus.update("updateWhiteSite", {
            "title": updateWhiteSiteStr
        }, function() {});
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
    var parse_url = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
    var domain = parse_url.exec(tab.url)[3];
    if (white_site_set.has(domain)) {
        white_site_set.delete(domain);
    } else {
        white_site_set.add(domain);
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
    var parse_url = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
    var domain = parse_url.exec(tab.url)[3];
    if (black_site_set.has(domain)) {
        black_site_set.delete(domain);
    } else {
        black_site_set.add(domain);
    }
    localStorage.setItem("black_site", JSON.stringify(Array.from(black_site_set)));

}
chrome.notifications.onClicked.addListener(function(id) {
    launchUI();
    chrome.notifications.clear(id, function() {});
});

//软件版本更新提示
var manifest = chrome.runtime.getManifest();
var previousVersion = localStorage.getItem("version");
if (previousVersion == "" || previousVersion != manifest.version) {
    var opt = {
        type: "basic",
        title: "更新",
        message: "版本更新到" + manifest.version + "啦\nAriaNG支持在Chrome中浏览下载目录，需要在扩展管理页面勾选“允许访问文件地址”选项！",
        iconUrl: "images/logo64.png",
        requireInteraction: true
    };
    var id = new Date().getTime().toString();
    //showNotification(id, opt);
    localStorage.setItem("version", manifest.version);
}

createOptionMenu();
