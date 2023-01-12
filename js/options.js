import Utils from "./utils.js";
import Configs from "./config.js";

var config =
{
    init: async function () {
        localizeHtmlPage();
        let configs = await chrome.storage.local.get();
        Object.assign(Configs, configs);

        $('input[type=checkbox]').prop("checked", false);
        $("#contextMenus").prop('checked', Configs.contextMenus);
        $("#askBeforeExport").prop('checked', Configs.askBeforeExport);
        $("#integration").prop('checked', Configs.integration);
        $("#askBeforeDownload").prop('checked', Configs.askBeforeDownload);
        $("#allowExternalRequest").prop('checked', Configs.allowExternalRequest);
        $("#monitorAria2").prop('checked', Configs.monitorAria2);
        $("#allowNotification").prop('checked', Configs.allowNotification);
        $("#captureMagnet").prop('checked', Configs.captureMagnet);
        $(`#${Configs.webUIOpenStyle}`).prop('checked', true);

        $("#fileSize").val(Configs.fileSize);
        if ($(".rpc-list").length !== 0) {
            $(".rpc-list").remove();
        }
        var rpcList = Configs.rpcList || [{ "name": "ARIA2", "url": "http://localhost:6800/jsonrpc", "pattern": "" }];
        for (var i in rpcList) {
            var addBtnOrPattern = i == 0 ? '<button class="btn" id="add-rpc"><i class="icon-plus-sign"></i> Add RPC</button>' :
                `<input type="text" class="input-large rpc-url-pattern" value="${rpcList[i]['pattern'] || ''}" placeholder="URL Pattern(s) splitted by ,">`;
            var row = '<div class="control-group rpc-list">' +
                '<label class="control-label text-info">' + (i == 0 ? '<i class="icon-tasks"></i> Aria2-RPC-Server' : '') + '</label>' +
                '<div class="controls">' +
                '<input type="text" class="input-small" value="' + rpcList[i]['name'] + '" placeholder="Name ∗">' +
                '<input type="password" class="input-medium secretKey" value="' + Utils.parseUrl(rpcList[i]['url'])[1] + '" placeholder="Secret Key">' +
                '<input type="text" class="input-xlarge rpc-path" value="' + Utils.parseUrl(rpcList[i]['url'])[0] + '" placeholder="RPC URL ∗">' +
                '<input type="text" class="input-medium location" value="' + (rpcList[i]['location'] || "") + '" placeholder="Download Location">' + addBtnOrPattern +
                '</div>' +
                '</div>';
            if ($(".rpc-list").length > 0) {
                $(row).insertAfter($(".rpc-list").eq(i - 1));
            } else {
                $(row).insertAfter($("fieldset").children().eq(2));
            }
        }
        if (Configs.blockedSites) {
            $("#blocked-sites").val(Configs.blockedSites.join("\n"));
        }
        if (Configs.allowedSites) {
            $("#allowed-sites").val(Configs.allowedSites.join("\n"));
        }
        if (Configs.blockedExts) {
            $("#blocked-exts").val(Configs.blockedExts.join("\n"));
        }
        if (Configs.allowedExts) {
            $("#allowed-exts").val(Configs.allowedExts.join("\n"));
        }
        $("#add-rpc").off().on("click", function () {
            var rpc_form = '<div class="control-group rpc-list">' +
                '<label class="control-label text-info "></label>' +
                '<div class="controls">' +
                '<input type="text" class="input-small"  placeholder="Name ∗">' +
                '<input type="text" class="input-medium secretKey"  placeholder="Secret Key">' +
                '<input type="text" class="input-xlarge rpc-path"  placeholder="RPC URL ∗">' +
                '<input type="text" class="input-medium location"  placeholder="Download Location">' +
                '<input type="text" class="input-large rpc-url-pattern" placeholder="URL Pattern(s) splitted by ,">' +
                '</div>' +
                '</div>';
            $(rpc_form).insertAfter($(".rpc-list")[$(".rpc-list").length - 1]);
        });
        $("#uploadConfig").off().on("click", function () {
            config.uploadConfig();
        });
        $("#downloadConfig").off().on("click", function () {
            config.downloadConfig();
        });
        $("#save").off().on("click", function () {
            config.save();
        });
        $("#reset").off().on("click", function () {
            config.reset();
        });
    },
    reset: async function () {
        toggleMagnetHandler(false);
        // localStorage.clear();
        await chrome.storage.local.clear();
        config.init()
    },
    save: function () {
        Configs.rpcList = [];
        var rpcUrl = null;
        for (var i = 0; i < $(".rpc-list").length; i++) {
            var child = $(".rpc-list").eq(i).children().eq(1).children();
            if (child.eq(0).val() != "" && child.eq(2).val() != "") {
                rpcUrl = Utils.combineUrl(child.eq(1).val(), child.eq(2).val());
                Configs.rpcList.push({
                    "name": child.eq(0).val(),
                    "url": rpcUrl,
                    "location": child.eq(3).val(),
                    "pattern": child.eq(4).val()
                });
            }
        }

        Configs.contextMenus = $("#contextMenus").prop('checked');
        Configs.askBeforeExport = $("#askBeforeExport").prop('checked');
        Configs.integration = $("#integration").prop('checked');
        Configs.fileSize = parseInt($("#fileSize").val());
        Configs.askBeforeDownload = $("#askBeforeDownload").prop('checked');
        Configs.allowExternalRequest = $("#allowExternalRequest").prop('checked');
        Configs.monitorAria2 = $("#monitorAria2").prop('checked');
        Configs.allowNotification = $("#allowNotification").prop('checked');
        Configs.captureMagnet = $("#captureMagnet").prop('checked');
        toggleMagnetHandler(Configs.captureMagnet);

        if ($("#popup").prop('checked') == true) {
            Configs.webUIOpenStyle = $("#popup").val();
            var index = chrome.runtime.getURL('ui/ariang/popup.html');
            chrome.action.setPopup({
                popup: index
            });
        } else if ($("#tab").prop('checked') == true) {
            Configs.webUIOpenStyle = $("#tab").val();
            chrome.action.setPopup({
                popup: ''
            });
        } else if ($("#window").prop('checked') == true) {
            Configs.webUIOpenStyle = $("#window").val();
            chrome.action.setPopup({
                popup: ''
            });
        }

        Configs.blockedSites = $("#blocked-sites").val().split("\n");
        let tempSet = new Set(Configs.blockedSites);
        // clear the repeat record using Set object
        if (tempSet.has(""))
            tempSet.delete("");
        Configs.blockedSites = Array.from(tempSet);

        Configs.allowedSites = $("#allowed-sites").val().split("\n");
        tempSet = new Set(Configs.allowedSites);
        // clear the repeat record using Set object
        if (tempSet.has(""))
            tempSet.delete("");
        Configs.allowedSites = Array.from(tempSet);

        Configs.blockedExts = $("#blocked-exts").val().split("\n");
        tempSet = new Set(Configs.blockedExts);
        // clear the repeat record using Set object
        if (tempSet.has(""))
            tempSet.delete("");
        Configs.blockedExts = Array.from(tempSet);

        Configs.allowedExts = $("#allowed-exts").val().split("\n");
        tempSet = new Set(Configs.allowedExts);
        // clear the repeat record using Set object
        if (tempSet.has(""))
            tempSet.delete("");
        Configs.allowedExts = Array.from(tempSet);
        chrome.storage.local.set(Configs);
    },
    uploadConfig: function () {

        Configs.ariaNgOptions = localStorage.getItem("AriaNg.Options");

        //check the validity of RPC list
        if (!Configs.rpcList) {
            let str = chrome.i18n.getMessage("uploadConfigWarn");
            if (!confirm(str))
                return;
        }
        chrome.storage.sync.set(Configs).then(() => {
            if (chrome.runtime.lastError) {
                var str = chrome.i18n.getMessage("uploadConfigFailed");
                config.displaySyncResult(str + chrome.runtime.lastError.message, "label-important");
            } else {
                var str = chrome.i18n.getMessage("uploadConfigSucceed");
                config.displaySyncResult(str, "label-success");
            }
        });
    },
    downloadConfig: function () {
        chrome.storage.sync.get().then(configs => {
            if (configs && configs.hasOwnProperty()) {
                if (configs.ariaNgOptions) {
                    localStorage.setItem("AriaNg.Options", configs.ariaNgOptions);
                }
                Object.assign(Configs, configs)
                config.init();
                toggleMagnetHandler(Configs.captureMagnet);
                var str = chrome.i18n.getMessage("downloadConfigSucceed");
                config.displaySyncResult(str, "label-success");
            } else {
                var str = chrome.i18n.getMessage("downloadConfigFailed");
                config.displaySyncResult(str, "label-important");
            }
        });
    },
    displaySyncResult: function (msg, style) {
        $("#sync-result").addClass(style);
        $("#sync-result").text(msg);
        setTimeout(function () {
            $("#sync-result").text("");
            $("#sync-result").removeClass(style);
        }, 3000);
    }
};

window.onload = config.init;

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName == "local") {
        config.init();
        if (changes.rpcList) {
            let str = chrome.i18n.getMessage("OverwriteAriaNgRpcWarn");
            if (confirm(str)) {
                let ariaNgOptions = JSON.parse(localStorage["AriaNg.Options"]);
                let newAriaNgOptions = Utils.exportRpc2AriaNg(changes.rpcList.newValue, ariaNgOptions);
                localStorage["AriaNg.Options"] = JSON.stringify(newAriaNgOptions);
            }
        }
    }    
});

window.onkeyup = function (e) {
    if (e.altKey) {
        if (e.key == 's') {
            config.save();
        } else if (e.key == 'r') {
            if (confirm("Clear all local settings?")) {
                config.reset();
            };
        } else if (e.key == 'u') {
            config.uploadConfig();

        } else if (e.key == 'j') {
            config.downloadConfig();
        }
    }
}

function localizeHtmlPage() {
    //Localize by replacing __MSG_***__ meta tags
    var objects = document.getElementsByTagName('html');
    for (var j = 0; j < objects.length; j++) {
        var obj = objects[j];

        var valStrH = obj.innerHTML.toString();
        var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function (match, v1) {
            return v1 ? chrome.i18n.getMessage(v1) : "";
        });

        if (valNewH != valStrH) {
            obj.innerHTML = valNewH;
        }
    }
}

/**
 * toggle magnet protocol handler before changing the captureMagnet storage value
 *
 * @param {boolean} flag new value
 */
function toggleMagnetHandler(flag) {
    var magnetPage = chrome.runtime.getURL("magnet.html") + "?action=magnet&url=%s";
    var captureMagnet = localStorage.getItem("captureMagnet") || "false";
    if (flag && captureMagnet == "false") {
        navigator.registerProtocolHandler("magnet", magnetPage, "Capture Magnet");
    } else if (!flag && captureMagnet == "true") {
        navigator.unregisterProtocolHandler("magnet", magnetPage);
    }
}
