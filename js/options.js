import Utils from "./utils.js";
import Default from "./config.js";

var Configs =
{
    init: async function () {
        localizeHtmlPage();
        if (location.search.endsWith("upgrade-storage"))
           await upgradeStorage();
        let configs = await chrome.storage.local.get();
        Object.assign(Configs, Default);
        Object.assign(Configs, configs);

        $("input[type=checkbox]").prop("checked", false);
        $("textarea").val("");

        $("#contextMenus").prop('checked', Configs.contextMenus);
        $("#askBeforeExport").prop('checked', Configs.askBeforeExport);
        $("#integration").prop('checked', Configs.integration);
        $("#fileSize").val(Configs.fileSize);
        $("#askBeforeDownload").prop('checked', Configs.askBeforeDownload);
        $("#allowExternalRequest").prop('checked', Configs.allowExternalRequest);
        $("#monitorAria2").prop('checked', Configs.monitorAria2);
        $("#allowNotification").prop('checked', Configs.allowNotification);
        $("#captureMagnet").prop('checked', Configs.captureMagnet);
        $(`#${Configs.webUIOpenStyle}`).prop('checked', true);
        
        if ($(".rpc-list").length !== 0) {
            $(".rpc-list").remove();
        }
        var rpcList = Configs.rpcList || [{ "name": "ARIA2", "url": "http://localhost:6800/jsonrpc", "pattern": "" }];
        for (var i in rpcList) {
            var addBtnOrPattern = i == 0 ? '<button class="btn btn-primary" id="add-rpc"><i class="bi-plus-circle"></i> Add RPC</button>' :
                `<input type="text" class="form-control col-sm-3 rpc-url-pattern" value="${rpcList[i]['pattern'] || ''}" placeholder="URL Pattern(s) splitted by ,">`;
            var row = '<div class="form-group row rpc-list">' +
                '<label class="col-form-label col-sm-2 text-info">' + (i == 0 ? '<i class="bi-hdd-network"></i> Aria2-RPC-Server' : '') + '</label>' +
                '<div class="input-group col-sm-10">' +
                '<input type="text" class="form-control col-sm-1" value="' + rpcList[i]['name'] + '" placeholder="Name ∗">' +
                '<input type="password" class="form-control col-sm-2 secretKey" value="' + Utils.parseUrl(rpcList[i]['url'])[1] + '" placeholder="Secret Key">' +
                '<input type="text" class="form-control col-sm-4 rpc-path" value="' + Utils.parseUrl(rpcList[i]['url'])[0] + '" placeholder="RPC URL ∗">' +
                '<input type="text" class="form-control col-sm-2 location" value="' + (rpcList[i]['location'] || "") + '" placeholder="Download Location">' + addBtnOrPattern +
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
            var rpcForm = '<div class="form-group row rpc-list">' +
                '<label class="col-form-label col-sm-2 text-info "></label>' +
                '<div class="input-group col-sm-10">' +
                '<input type="text" class="form-control col-sm-1" placeholder="Name ∗" required>' +
                '<input type="text" class="form-control col-sm-2 secretKey"  placeholder="Secret Key">' +
                '<input type="text" class="form-control col-sm-4 rpc-path"  placeholder="RPC URL ∗" required>' +
                '<input type="text" class="form-control col-sm-2 location"  placeholder="Download Location">' +
                '<input type="text" class="form-control col-sm-3 rpc-url-pattern" placeholder="URL Pattern(s) splitted by ,">' +
                '</div>' +
                '</div>';
            $(rpcForm).insertAfter($(".rpc-list")[$(".rpc-list").length - 1]);
        });
        $("#uploadConfig").off().on("click", function () {
            Configs.uploadConfig();
        });
        $("#downloadConfig").off().on("click", function () {
            Configs.downloadConfig();
        });
        $("#save").off().on("click", function () {
            Configs.save();
        });
        $("#reset").off().on("click", function () {
            Configs.reset();
        });
        $("form").off().on("submit", function (event) {
            event.preventDefault();
        })
    },
    reset: async function () {
        localStorage.clear();
        await chrome.storage.local.clear();
        let manifest = chrome.runtime.getManifest();
        chrome.storage.local.set({ version: manifest.version })
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
                Configs.displaySyncResult(str + chrome.runtime.lastError.message, "alert-danger");
            } else {
                var str = chrome.i18n.getMessage("uploadConfigSucceed");
                Configs.displaySyncResult(str, "alert-success");
            }
        });
    },
    downloadConfig: function () {
        chrome.storage.sync.get().then(async configs => {
            if (configs && configs.hasOwnProperty("ariaNgOptions")) {
                if (configs.ariaNgOptions) {
                    localStorage.setItem("AriaNg.Options", configs.ariaNgOptions);
                }
                await chrome.storage.local.set(configs);
                let str = chrome.i18n.getMessage("downloadConfigSucceed");
                Configs.displaySyncResult(str, "alert-success");
            } else {
                let str = chrome.i18n.getMessage("downloadConfigFailed");
                Configs.displaySyncResult(str, "alert-danger");
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

window.onload = Configs.init;

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName == "local") {
        Configs.init();
        if (changes.rpcList && changes.rpcList.newValue) {
            let str = chrome.i18n.getMessage("OverwriteAriaNgRpcWarn");
            if (confirm(str)) {
                let ariaNgOptions = JSON.parse(localStorage["AriaNg.Options"]);
                let newAriaNgOptions = Utils.exportRpc2AriaNg(changes.rpcList.newValue, ariaNgOptions);
                localStorage["AriaNg.Options"] = JSON.stringify(newAriaNgOptions);
            }
        }
        if (changes.captureMagnet)
            toggleMagnetHandler(changes.captureMagnet.newValue);
    }    
});

window.onkeyup = function (e) {
    if (e.altKey) {
        let button;
        if (e.key == 's') {
            Configs.save();
            button = document.getElementById("save");
        } else if (e.key == 'r') {
            if (confirm("Clear all local settings?")) {
                Configs.reset();
                button = document.getElementById("reset");
            };
        } else if (e.key == 'u') {
            Configs.uploadConfig();
            button = document.getElementById("uploadConfig");
            
        } else if (e.key == 'j') {
            Configs.downloadConfig();
            button = document.getElementById("downloadConfig");
        }
        button?.focus({ focusVisible: true });
    }
}

function localizeHtmlPage() {
    //Localize by replacing __MSG_***__ meta tags
    let objects = document.getElementsByTagName('html');
    for (const obj of objects) {
        let valStrH = obj.innerHTML.toString();
        let valNewH = valStrH.replace(/__MSG_(\w+)__/g, function (match, v1) {
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
 * @param {boolean} flag Set true to register, false to unregister
 */
function toggleMagnetHandler(flag) {
    let magnetPage = chrome.runtime.getURL("magnet.html") + "?action=magnet&url=%s";
    if (flag) {
        navigator.registerProtocolHandler("magnet", magnetPage, "Capture Magnet");
    } else {
        navigator.unregisterProtocolHandler("magnet", magnetPage);
    }
}

/**
 * Migrate extension settings from web local storage to Chrome local storage
 */
async function upgradeStorage() {
    let configs = await chrome.storage.local.get("rpcList");
    if (configs.rpcList) return;
    let convertList = {
        white_site: "allowedSites",
        black_site: "blockedSites",
        white_ext: "allowedExts",
        black_ext: "blockedExts",
        rpc_list: "rpcList",
        newwindow: "window",
        newtab: "tab"
    }
    for (let [k, v] of Object.entries(localStorage)) {
        if (convertList[k])
            k = convertList[k]

        if (convertList[v])
            v = convertList[v]

        if (k.startsWith("AriaNg"))
            continue;

        if (v == "true")
            configs[k] = true;
        else if (v == "false")
            configs[k] = false;
        else if (/\[.*\]|\{.*\}/.test(v))
            configs[k] = JSON.parse(v);
        else
            configs[k] = v;
    }
    chrome.storage.local.set(configs).then(
        () => console.log("Storage upgrade completed.")
    );
}
