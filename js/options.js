import Utils from "./utils.js";
import Default from "./config.js";

var Configs =
{
    init: async function () {
        Utils.localizeHtmlPage();
        if (location.search.endsWith("upgrade-storage"))
            await upgradeStorage();
        let configs = await chrome.storage.local.get();
        Object.assign(Configs, Default);
        Object.assign(Configs, configs);

        $("input[type=checkbox]").prop("checked", false);
        $("input[type=text]").val("");
        $("textarea").val("");
        $(`#${Configs.webUIOpenStyle}`).prop('checked', true);

        for (const checkbox of $("input[type=checkbox]")) {
            if (Configs[checkbox.id])
                checkbox.checked = Configs[checkbox.id];
        }

        for (const input of $("input[type=text]")) {
            if (Configs[input.id])
                input.value = Configs[input.id];
        }

        for (const textarea of $("textarea")) {
            if (Configs[textarea.id])
                textarea.value = Configs[textarea.id].join("\n");
        }

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

        for (const button of $("button")) {
            if (Configs[button.id] || !button.onclick)
                button.onclick = Configs[button.id];
        }
        /* prevent page from refresh when submit*/
        $("form").off().on("submit", function (event) {
            event.preventDefault();
        })
    },
    reset: async function () {
        localStorage.clear();
        await chrome.storage.local.clear();
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

        for (const checkbox of $("input[type=checkbox]")) {
            if (Configs.hasOwnProperty(checkbox.id))
                Configs[checkbox.id] = checkbox.checked;
        }
        for (const input of $("input[type=text]")) {
            if (Configs.hasOwnProperty(input.id))
                Configs[input.id] = input.value;
        }

        let url = '';
        Configs.webUIOpenStyle = $("[name=webUIOpenStyle]:checked").val();
        if (Configs.webUIOpenStyle == "popup") {
            url = chrome.runtime.getURL("ui/ariang/popup.html");
        }
        chrome.action.setPopup({
            popup: url
        });

        for (const textarea of $("textarea")) {
            Configs[textarea.id] = textarea.value.split("\n");
            // clear the repeat record using Set object
            let tempSet = new Set(Configs[textarea.id]);
            tempSet.delete("");
            Configs[textarea.id] = Array.from(tempSet);
        }
        chrome.storage.local.set(Configs);
    },
    uploadConfig: function () {

        Configs.ariaNgOptions = localStorage.getItem("AriaNg.Options");

        //check the validity of RPC list
        if (!Configs.rpcList || !Configs.rpcList.length) {
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
