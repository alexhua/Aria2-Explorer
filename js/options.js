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
                var askBeforeDownload = localStorage.getItem("askBeforeDownload");
                if (askBeforeDownload == "true") {
                    $("#askBeforeDownload").prop('checked', true);
                }
                var webUIOpenStyle = localStorage.getItem("webUIOpenStyle");
                if (webUIOpenStyle == "popup") {
                    $("#openstyle1").prop('checked', true);
                }
                var fileSize = localStorage.getItem("fileSize") || 10;
                $("#fileSize").val(fileSize);
                var rpc_list = JSON.parse(localStorage.getItem("rpc_list") || '[{"name":"ARIA2 RPC","url":"http://localhost:6800/jsonrpc"}]');
                for (var i in rpc_list) {
                    var addBtn = 0 == i ? '<button class="btn" id="add-rpc">Add RPC</button>' : '';
                    var row = '<div class="control-group rpc_list"><label class="control-label">JSON-RPC</label><div class="controls"><input type="text" class="input-small" value="' + rpc_list[i]['name'] + '" placeholder="RPC Name"><input type="text" class="input-xlarge rpc-path" value="' + rpc_list[i]['url'] + '" placeholder="RPC Path">' + addBtn + '</div></div>';
                    if ($(".rpc_list").length > 0) {
                        $(row).insertAfter($(".rpc_list").eq(i - 1));
                    } else {
                        $(row).insertAfter($("fieldset").children().eq(2));
                    }
                }
                var custom_rules_list = JSON.parse(localStorage.getItem("custom_rules_list") || '[{"url":"","rpc":""}]');
                if (custom_rules_list.length == 0) {
                    custom_rules_list = JSON.parse('[{"url":"","rpc":"ARIA2 RPC"}]');
                }
                var rpc_list_select = '';
                for (var i in rpc_list) {
                    rpc_list_select += '<option value="' + rpc_list[i]['name'] + '">' + rpc_list[i]['name'] + '</option>';
                }
                for (var i in custom_rules_list) {
                    var addBtn = 0 == i ? '<button class="btn" id="add-custom-rule">Add Rule</button>' : '';
                    var row_start = '<div class="control-group custom_rules_list"><label class="control-label">Custom Rule</label><div class="controls"><input type="text" class="input-xlarge" value="' + custom_rules_list[i]['url'] + '" placeholder="URL"><select class="input-small custom-rule-rpc">'
                    var row_end = '</div></div>';

                    var row = row_start + rpc_list_select + '</select>' + addBtn + row_end;
                    if ($(".custom_rules_list").length > 0) {
                        $(row).insertAfter($(".custom_rules_list").eq(i-1));
                    } else {
                        $(row).insertAfter($('fieldset').children().eq(5));
                    }

                    $(".custom-rule-rpc").val(custom_rules_list[i]['rpc']);
                }
                var black_site = JSON.parse(localStorage.getItem("black_site"));
                if (black_site) {
                    $("#black-site").val(black_site.join("\n"));
                }
                var white_site = JSON.parse(localStorage.getItem("white_site"));
                if (white_site) {
                    $("#white-site").val(white_site.join("\n"));
                }
                $("#add-rpc").on("click", function() {
                    var rpc_form = '<div class="control-group rpc_list">' + '<label class="control-label">JSON-RPC</label>' + '<div class="controls">' + '<input type="text" class="input-small"  placeholder="RPC Name">' + '<input type="text" class="input-xlarge rpc-path"  placeholder="RPC Path"></div></div>';
                    $(rpc_form).insertAfter($(".rpc_list")[0]);
                });
                $("#add-custom-rule").on("click", function() {
                    var custom_rule_form = '<div class="control-group custom_rules_list"><label class="control-label">Custom Rule</label><div class="controls"><input type="text" class="input-xlarge" value="" placeholder="URL"><select class="input-small custom-rule-rpc">' + rpc_list_select + '</select>' + '</div></div>';
                    $(custom_rule_form).insertAfter($('.custom_rules_list')[0]);
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
                var custom_rules_list = [];
                var jsonrpc_history = [];
                var jsoncustomrule_history = [];
                for (var i = 0; i < $(".rpc_list").length; i++) {
                    var child = $(".rpc_list").eq(i).children().eq(1).children();
                    if (child.eq(0).val() != "" && child.eq(1).val() != "") {
                        rpc_list.push({
                            "name": child.eq(0).val(),
                            "url": child.eq(1).val()
                        });
                        jsonrpc_history.push(child.eq(1).val());
                    }
                }
                for (var i = 0; i < $('.custom_rules_list').length; i++) {
                  var child = $('.custom_rules_list').eq(i).children().eq(1).children();
                  if (child.eq(0).val() != '' && child.eq(1).val() != '') {
                    custom_rules_list.push({
                      url: child.eq(0).val(),
                      rpc: child.eq(1).val(),
                    });
                    jsoncustomrule_history.push(child.eq(1).val());
                  }
                }
                localStorage.setItem("rpc_list", JSON.stringify(rpc_list));
                localStorage.setItem("custom_rules_list", JSON.stringify(custom_rules_list));
                localStorage.setItem("jsonrpc_history", JSON.stringify(jsonrpc_history));
                localStorage.setItem("jsoncustomrule_history", JSON.stringify(jsoncustomrule_history));
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
                } else {
                    localStorage.setItem("webUIOpenStyle", $("#openstyle2").val());
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
            },
            uploadConfig: function() {
                var self = this;
                var ExtConfig = {
                    AriaNgConfig: {
                        Options: ""
                    },
                    AriaExtConfig: {
                        askBeforeDownload: "",
                        black_site: "",
                        contextMenus: "",
                        fileSize: "",
                        finalUrl: "",
                        integration: "",
                        jsonrpc_history: "",
                        rpc_list: "",
                        custom_rules_list: "",
                        jsoncustomrule_history: "",
                        version: "",
                        webUIOpenStyle: "",
                        white_site: ""
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
                        self.displaySyncResult(str + chrome.runtime.lastError.message);
                    } else {
                        var str = chrome.i18n.getMessage("uploadConfigSucceed");
                        self.displaySyncResult(str);
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
                        self.displaySyncResult(str);
                    } else {
                        var str = chrome.i18n.getMessage("downloadConfigFailed");
                        self.displaySyncResult(str);
                    }
                });
            },
            displaySyncResult: function(msg) {
                $("#sync-result").text(msg);
                setTimeout(function() {
                    $("#sync-result").text("");
                }, 2000);
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
