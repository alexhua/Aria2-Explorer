$(function() {
    var config = (function() {
        return {
            init: function() {
                var self = this;
                var contextMenus = localStorage.getItem("contextMenus");
                if (contextMenus == "true") {
                    $("#contextMenus").prop('checked', true);
                }
                var integration = localStorage.getItem("integration");
                if (integration == "true") {
                    $("#integration").prop('checked', true);
                }
                var finalUrl = localStorage.getItem("finalUrl");
                if (finalUrl == "true") {
                    $("#finalUrl").prop('checked', true);
                }
                var allowExternalRequest = localStorage.getItem("allowExternalRequest");
                if (allowExternalRequest == "true") {
                    $("#allowExternalRequest").prop('checked', true);
                }
                var askBeforeDownload = localStorage.getItem("askBeforeDownload");
                if (askBeforeDownload == "true") {
                    $("#askBeforeDownload").prop('checked', true);
                }
                var webUIOpenStyle = localStorage.getItem("webUIOpenStyle");
                if (webUIOpenStyle == "popup") {
                    $("#openstyle1").prop('checked', true);
                } else if (webUIOpenStyle == "newwindow") {
                    $("#openstyle3").prop('checked', true);
                }
                var fileSize = localStorage.getItem("fileSize") || 10;
                $("#fileSize").val(fileSize);
                var rpc_list = JSON.parse(localStorage.getItem("rpc_list") || '[{"name":"ARIA2 RPC","url":"http://localhost:6800/jsonrpc", "pattern": ""}]');
                for (var i in rpc_list) {
                    var addBtnOrPattern = 0 == i ? '<button class="btn" id="add-rpc">Add RPC</button>' : '<input type="text" class="input-large rpc-url-pattern" value="' + (rpc_list[i]['pattern']||"") + '"placeholder="URL pattern(s) (separated by ,)">';
                    var row = '<div class="control-group rpc_list">' +
                                '<label class="control-label text-info">' + (i==0? 'JSON-RPC' : '') + '</label>' +
                                '<div class="controls">' +
                                    '<input type="text" class="input-small" value="' + rpc_list[i]['name'] + '" placeholder="RPC Name">' +
                                    '<input type="text" class="input-medium secretKey" value="' + parseUrl(rpc_list[i]['url'])[1] + '" placeholder="Secret Key">' +
                                    '<input type="text" class="input-xlarge rpc-path" value="' + parseUrl(rpc_list[i]['url'])[0] + '" placeholder="RPC Path">' + addBtnOrPattern +
                                '</div>' +
                               '</div>';
                    if ($(".rpc_list").length > 0) {
                        $(row).insertAfter($(".rpc_list").eq(i - 1));
                    } else {
                        $(row).insertAfter($("fieldset").children().eq(2));
                    }
                }
                var black_site = JSON.parse(localStorage.getItem("black_site"));
                if (black_site) {
                    $("#black-site").val(black_site.join("\n"));
                }
                var white_site = JSON.parse(localStorage.getItem("white_site"));
                if (white_site) {
                    $("#white-site").val(white_site.join("\n"));
                }
                var black_ext = JSON.parse(localStorage.getItem("black_ext"));
                if (black_ext) {
                    $("#black-ext").val(black_ext.join("\n"));
                }
                var white_ext = JSON.parse(localStorage.getItem("white_ext"));
                if (white_ext) {
                    $("#white-ext").val(white_ext.join("\n"));
                }
                $("#add-rpc").on("click", function() {
                    var rpc_form = '<div class="control-group rpc_list">' +
                                    '<label class="control-label text-info "></label>' +
                                    '<div class="controls">' +
                                        '<input type="text" class="input-small"  placeholder="RPC Name">' +
                                        '<input type="text" class="input-medium secretKey"  placeholder="Secret Key">' +
                                        '<input type="text" class="input-xlarge rpc-path"  placeholder="RPC Path">' +
                                        '<input type="text" class="input-large rpc-url-pattern" placeholder="URL pattern(s) (separated by ,)">' +
                                     '</div>' +
                                    '</div>';
                    $(rpc_form).insertAfter($(".rpc_list")[0]);
                });
                $("#uploadConfig").on("click", function() {
                    self.uploadConfig();
                });
                $("#downloadConfig").on("click", function() {
                    self.downloadConfig();
                });
                $("#save").on("click", function() {
                    self.save();
                });
                $("#reset").on("click", function() {
                    localStorage.clear();
                    location.reload();
                    chrome.storage.local.clear(function() {
                        console.log("Settings storage is cleared!");
                    });
                });
            },
            save: function() {
                var rpc_list = [];
                var jsonrpc_history = [];
                var rpcUrl = null;
                for (var i = 0; i < $(".rpc_list").length; i++) {
                    var child = $(".rpc_list").eq(i).children().eq(1).children();
                    if (child.eq(0).val() != "" && child.eq(2).val() != "") {
                        rpcUrl = combineUrl(child.eq(1).val(), child.eq(2).val());
                        rpc_list.push({
                            "name": child.eq(0).val(),
                            "url": rpcUrl,
                            "pattern": child.eq(3).val()
                        });
                        jsonrpc_history.push(rpcUrl);
                    }
                }
                localStorage.setItem("rpc_list", JSON.stringify(rpc_list));
                localStorage.setItem("jsonrpc_history", JSON.stringify(jsonrpc_history));
                if ($("#contextMenus").prop('checked') == true) {
                    localStorage.setItem("contextMenus", true);
                } else {
                    localStorage.setItem("contextMenus", false);
                }
                if ($("#integration").prop('checked') == true) {
                    localStorage.setItem("integration", true);
                } else {
                    localStorage.setItem("integration", false);
                }
                if ($("#finalUrl").prop('checked') == true) {
                    localStorage.setItem("finalUrl", true);
                } else {
                    localStorage.setItem("finalUrl", false);
                }
                if ($("#allowExternalRequest").prop('checked') == true) {
                    localStorage.setItem("allowExternalRequest", true);
                } else {
                    localStorage.setItem("allowExternalRequest", false);
                }
                if ($("#askBeforeDownload").prop('checked') == true) {
                    localStorage.setItem("askBeforeDownload", true);
                } else {
                    localStorage.setItem("askBeforeDownload", false);
                }
                if ($("#openstyle1").prop('checked') == true) {
                    localStorage.setItem("webUIOpenStyle", $("#openstyle1").val());
                    var index = chrome.extension.getURL('ui/ariang/popup.html');
                    chrome.browserAction.setPopup({
                        popup: index
                    });
                } else if ($("#openstyle2").prop('checked') == true){
                    localStorage.setItem("webUIOpenStyle", $("#openstyle2").val());
                    chrome.browserAction.setPopup({
                        popup: ''
                    });
                } else if ($("#openstyle3").prop('checked') == true){
                    localStorage.setItem("webUIOpenStyle", $("#openstyle3").val());
                    chrome.browserAction.setPopup({
                        popup: ''
                    });
                }
                var fileSize = $("#fileSize").val();
                localStorage.setItem("fileSize", fileSize);
                var black_site = $("#black-site").val().split("\n");
                var black_site_set = new Set(black_site);
                // clear the repeat record using Set object
                if (black_site_set.has(""))
                    black_site_set.delete("");
                localStorage.setItem("black_site", JSON.stringify(Array.from(black_site_set)));
                var white_site = $("#white-site").val().split("\n");
                var white_site_set = new Set(white_site);
                // clear the repeat record using Set object
                if (white_site_set.has(""))
                    white_site_set.delete("");
                localStorage.setItem("white_site", JSON.stringify(Array.from(white_site_set)));

                var black_ext = $("#black-ext").val().split("\n");
                var black_ext_set = new Set(black_ext);
                // clear the repeat record using Set object
                if (black_ext_set.has(""))
                    black_ext_set.delete("");
                localStorage.setItem("black_ext", JSON.stringify(Array.from(black_ext_set)));
                var white_ext = $("#white-ext").val().split("\n");
                var white_ext_set = new Set(white_ext);
                // clear the repeat record using Set object
                if (white_ext_set.has(""))
                    white_ext_set.delete("");
                localStorage.setItem("white_ext", JSON.stringify(Array.from(white_ext_set)));
            },
            uploadConfig: function() {
                var self = this;
                var ExtConfig = {
                    AriaNgConfig: {
                        Options: ""
                    },
                    AriaExtConfig: {
                        askBeforeDownload: "",
                        contextMenus: "",
                        fileSize: "",
                        finalUrl: "",
                        allowExternalRequest: "",
                        integration: "",
                        jsonrpc_history: "",
                        rpc_list: "",
                        version: "",
                        webUIOpenStyle: "",
                        white_site: "",
                        black_site: "",
                        white_ext: "",
                        black_ext: "",
                    }
                };

                ExtConfig.AriaNgConfig.Options = localStorage.getItem("AriaNg.Options");
                for (var key in ExtConfig.AriaExtConfig) {
                    ExtConfig.AriaExtConfig[key] = localStorage.getItem(key);
                }
                
                //check the validility of local config
                if (ExtConfig.AriaExtConfig.integration == "") {
                    var str = chrome.i18n.getMessage("uploadConfigWarn");
                    if (!confirm(str))
                        return;
                }
                chrome.storage.sync.set(ExtConfig, function() {
                    if (chrome.runtime.lastError) {
                        var str = chrome.i18n.getMessage("uploadConfigFailed");
                        self.displaySyncResult(str + chrome.runtime.lastError.message, "label-important");
                    } else {
                        var str = chrome.i18n.getMessage("uploadConfigSucceed");
                        self.displaySyncResult(str, "label-success");
                    }
                });
            },
            downloadConfig: function() {
                var self = this;
                chrome.storage.sync.get(null, function(extConfig) {
                    if (extConfig && extConfig.AriaExtConfig) {
                        if (extConfig.AriaNgConfig.Options != "") {
                            localStorage.setItem("AriaNg.Options", extConfig.AriaNgConfig.Options);
                        }
                        for (var key in extConfig.AriaExtConfig) {
                            localStorage[key] = extConfig.AriaExtConfig[key];
                        }
                        location.reload();
                        var str = chrome.i18n.getMessage("downloadConfigSucceed");
                        self.displaySyncResult(str, "label-success");
                    } else {
                        var str = chrome.i18n.getMessage("downloadConfigFailed");
                        self.displaySyncResult(str, "label-important");
                    }
                });
            },
            displaySyncResult: function(msg, style) {
                $("#sync-result").addClass(style);
                $("#sync-result").text(msg);
                setTimeout(function() {
                    $("#sync-result").text("");
                    $("#sync-result").removeClass(style);
                }, 3000);
            }
        };
    }
    )();
    config.init();

});
localizeHtmlPage();
function localizeHtmlPage() {
    //Localize by replacing __MSG_***__ meta tags
    var objects = document.getElementsByTagName('html');
    for (var j = 0; j < objects.length; j++) {
        var obj = objects[j];

        var valStrH = obj.innerHTML.toString();
        var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1) {
            return v1 ? chrome.i18n.getMessage(v1) : "";
        });

        if (valNewH != valStrH) {
            obj.innerHTML = valNewH;
        }
    }
}

function parseUrl(rpcUrl) {
    var url = null;
    var urlPath = null;
    var secretKey = null;
    try {
        url = new URL(rpcUrl);
        urlPath = url.origin+url.pathname;
        secretKey = url.password;
    } catch (error){
        console.warn('Stored Rpc Url is invalid! RpcUrl ="' + rpcUrl +'"');
        return ["", ""];
    }
    return [urlPath, secretKey];
}

function combineUrl(secretKey, urlPath) {
    var url = null;
    try {
        url = new URL(urlPath);
        if (secretKey && secretKey != ""){
            url.username = "token";
            url.password = secretKey;
        }
    } catch (error) {
        console.warn('Input a invalid Url Path! UrlPath ="' + urlPath +'"');
        return null;
    }
    return url.toString(); 
    
}