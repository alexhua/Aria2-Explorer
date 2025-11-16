/**
 * UIController - UI控制器
 */
import Utils from "../utils.js";

const SHORTCUTS_PAGE_URL = "chrome://extensions/shortcuts";

const ColorModeList = [
    { name: 'light', icon: 'fa-sun', title: 'LightMode' },
    { name: 'dark', icon: 'fa-moon', title: 'DarkMode' },
    { name: 'system', icon: 'fa-circle-half-stroke', title: 'FollowSystem' }
];

const OptionDeps = {
    askBeforeExport: 'contextMenus',
    checkClick: 'integration',
    keepAwake: 'monitorAria2',
    keepSilent: 'allowNotification'
};

export class UIController {
    constructor(configManager, rpcManager) {
        this.configManager = configManager;
        this.rpcManager = rpcManager;
    }

    /**
     * 初始化UI
     */
    async init() {
        Utils.localizeHtmlPage();
        
        const config = this.configManager.getConfig();

        // 设置颜色模式
        this._setColorMode();

        // 重置表单
        this._resetForm();

        // 填充表单数据
        this._fillFormData(config);

        // 设置依赖关系
        this._setupDependencies(config);

        // 设置特殊提示
        this._setupSpecialTooltips();

        // 渲染RPC列表
        this.rpcManager.render();

        // 绑定事件
        this._bindEvents();

        // 设置版本信息
        this._setupVersionInfo();
    }

    /**
     * 重置表单
     */
    _resetForm() {
        $("input[type=checkbox]").prop("checked", false);
        $("input[type=text],input[type=number]").val("");
        $("textarea").val("");
    }

    /**
     * 填充表单数据
     */
    _fillFormData(config) {
        // 单选按钮
        $(`#${config.webUIOpenStyle}`).prop('checked', true);
        $(`#${config.iconOffStyle}`).prop('checked', true);

        // 复选框
        $("input[type=checkbox]").each(function() {
            if (config[this.id]) {
                this.checked = config[this.id];
            }
        });

        // 输入框
        $("input[type=text],input[type=number]").each(function() {
            if (config[this.id]) {
                this.value = config[this.id];
            }
        });

        // 文本域
        $("textarea").each(function() {
            if (config[this.id]) {
                this.value = config[this.id].join("\n");
            }
        });

        // 显示/隐藏监控所有选项
        config.rpcList.length > 1 ? $("#monitor-all").show() : $("#monitor-all").hide();
    }

    /**
     * 设置依赖关系
     */
    _setupDependencies(config) {
        for (const [dependent, dependency] of Object.entries(OptionDeps)) {
            $(`#${dependent}`).prop("disabled", !config[dependency]);
            $(`#${dependency}`).change(() => {
                $(`#${dependent}`).prop("disabled", !$(`#${dependency}`).prop("checked"));
            });
        }
    }

    /**
     * 设置特殊提示
     */
    _setupSpecialTooltips() {
        if (Utils.getPlatform() === "Windows") {
            const tooltip = chrome.i18n.getMessage("captureMagnetTip");
            $("#captureMagnet").parent().addClass("tool-tip tool-tip-icon");
        }
    }

    /**
     * 绑定事件
     */
    _bindEvents() {
        // 快捷键设置
        $("#shortcuts-setting").off().on("click", this._openShortcutsPage);

        // 颜色模式切换
        $("#colorMode").off().on("click", () => this._toggleColorMode());

        // 表单提交和重置
        $("form").off().on("submit", (e) => e.preventDefault())
                      .on("reset", (e) => e.preventDefault());

        // 键盘快捷键
        $(window).off('keyup').on('keyup', (e) => this._handleKeyboardShortcuts(e));

        // 存储变化监听
        chrome.storage.onChanged.addListener((changes, areaName) => {
            this._handleStorageChange(changes, areaName);
        });

        // 颜色模式变化监听
        window.matchMedia('(prefers-color-scheme: dark)').onchange = () => this._setColorMode();

        // WebStore链接
        $("#webStoreUrl").prop("href", Utils.getWebStoreUrl());
    }

    /**
     * 设置版本信息
     */
    _setupVersionInfo() {
        const manifest = chrome.runtime.getManifest();
        $("#version").text('v' + manifest.version);
    }

    /**
     * 打开快捷键设置页面
     */
    _openShortcutsPage() {
        chrome.tabs.query({ "url": SHORTCUTS_PAGE_URL }).then((tabs) => {
            if (tabs?.length > 0) {
                chrome.windows.update(tabs[0].windowId, { focused: true });
                chrome.tabs.update(tabs[0].id, { active: true });
            } else {
                chrome.tabs.getCurrent().then(tab => {
                    chrome.tabs.create({
                        url: SHORTCUTS_PAGE_URL,
                        openerTabId: tab.id,
                        index: tab.index + 1
                    });
                });
            }
        });
    }

    /**
     * 切换颜色模式
     */
    _toggleColorMode() {
        const config = this.configManager.getConfig();
        config.colorModeId = (config.colorModeId + 1) % ColorModeList.length;
        chrome.storage.local.set({ colorModeId: config.colorModeId });
    }

    /**
     * 设置颜色模式
     */
    _setColorMode() {
        const config = this.configManager.getConfig();
        
        switch (config.colorModeId) {
            case 0:
                $('html').removeClass("dark-mode");
                break;
            case 1:
                $('html').addClass("dark-mode");
                break;
            case 2:
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    $('html').addClass("dark-mode");
                } else {
                    $('html').removeClass("dark-mode");
                }
                break;
        }

        const title = chrome.i18n.getMessage(ColorModeList[config.colorModeId].title);
        $("#colorMode .fa").removeClass('fa-moon fa-sun fa-circle-half-stroke')
            .addClass(ColorModeList[config.colorModeId].icon)
            .attr("title", title);
    }

    /**
     * 处理键盘快捷键
     */
    _handleKeyboardShortcuts(e) {
        if (!e.altKey) return;

        const actions = {
            's': { method: 'save', button: 'save' },
            'r': { method: 'reset', button: 'reset' },
            'u': { method: 'upload', button: 'upload' },
            'j': { method: 'download', button: 'download' },
            'e': { method: 'export', button: 'exportConfig' },
            'i': { method: 'import', button: 'importConfig' }
        };

        const action = actions[e.key];
        if (action) {
            const button = document.getElementById(action.button);
            button?.click();
            button?.focus({ focusVisible: true });
        }
    }

    /**
     * 处理存储变化
     */
    _handleStorageChange(changes, areaName) {
        if (areaName !== "local") return;

        // 只更新颜色模式
        if (Object.keys(changes).length === 1 && changes.hasOwnProperty('colorModeId')) {
            this._setColorMode();
            return;
        }

        // 重新初始化
        this.init();

        // 处理RPC列表变化
        if (changes.rpcList && !changes.hasOwnProperty("ariaNgOptions")) {
            const oldList = changes.rpcList.oldValue;
            const newList = changes.rpcList.newValue;
            
            if (this.configManager.isRpcListChanged(oldList, newList)) {
                this.configManager.updateAriaNgRpc(newList);
            }
        }

        // 处理磁力链接捕获
        if (changes.captureMagnet) {
            this._toggleMagnetHandler(changes.captureMagnet.newValue);
        }
    }

    /**
     * 切换磁力链接处理器
     */
    _toggleMagnetHandler(flag) {
        const magnetPage = chrome.runtime.getURL("magnet.html") + "?action=magnet&url=%s";
        
        if (flag) {
            navigator.registerProtocolHandler("magnet", magnetPage, "Capture Magnet");
        } else {
            navigator.unregisterProtocolHandler("magnet", magnetPage);
        }
    }

    /**
     * 收集表单数据
     */
    collectFormData() {
        const formData = {
            rpcList: this.rpcManager.collectData(),
            checkboxes: {},
            inputs: {},
            textareas: {},
            webUIOpenStyle: $("[name=webUIOpenStyle]:checked").val(),
            iconOffStyle: $("[name=iconOffStyle]:checked").val()
        };

        // 收集复选框
        $("input[type=checkbox]").each(function() {
            formData.checkboxes[this.id] = this.checked;
        });

        // 收集输入框
        $("input[type=text],input[type=number]").each(function() {
            formData.inputs[this.id] = this.value;
        });

        // 收集文本域
        $("textarea").each(function() {
            formData.textareas[this.id] = this.value;
        });

        return formData;
    }

    /**
     * 显示结果消息
     */
    showResult(elementId, message, isSuccess, timeout = 2000) {
        const style = isSuccess ? "alert-success" : "alert-danger";
        $(`#${elementId}`).addClass(style).text(message);
        
        setTimeout(() => {
            $(`#${elementId}`).text("").removeClass(style);
        }, timeout);
    }
}
