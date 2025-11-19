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

        // Set color mode
        this.#setColorMode();

        // Reset form
        this.#resetForm();

        // Fill form data
        this.#fillFormData(config);

        // Setup dependencies
        this.#setupDependencies(config);

        // Setup special tooltips
        this.#setupSpecialTooltips();

        // Render RPC list
        this.rpcManager.render();

        // Bind events
        this.#bindEvents();

        // Setup version info
        this.#setupVersionInfo();
    }

    /**
     * Reset form
     */
    #resetForm() {
        $("input[type=checkbox]").prop("checked", false);
        $("input[type=text],input[type=number]").val("");
        $("textarea").val("");
    }

    /**
     * Fill form data
     */
    #fillFormData(config) {
        // Radio buttons
        $(`#${config.webUIOpenStyle}`).prop('checked', true);
        $(`#${config.iconOffStyle}`).prop('checked', true);

        // Checkboxes
        $("input[type=checkbox]").each(function() {
            if (config[this.id]) {
                this.checked = config[this.id];
            }
        });

        // Input fields
        $("input[type=text],input[type=number]").each(function() {
            if (config[this.id]) {
                this.value = config[this.id];
            }
        });

        // Textareas
        $("textarea").each(function() {
            if (config[this.id]) {
                this.value = config[this.id].join("\n");
            }
        });

        // Show/hide monitor all option
        config.rpcList.length > 1 ? $("#monitor-all").show() : $("#monitor-all").hide();
    }

    /**
     * Setup dependencies
     */
    #setupDependencies(config) {
        for (const [dependent, dependency] of Object.entries(OptionDeps)) {
            $(`#${dependent}`).prop("disabled", !config[dependency]);
            $(`#${dependency}`).change(() => {
                $(`#${dependent}`).prop("disabled", !$(`#${dependency}`).prop("checked"));
            });
        }
    }

    /**
     * Setup special tooltips
     */
    #setupSpecialTooltips() {
        if (Utils.getPlatform() === "Windows") {
            const tooltip = chrome.i18n.getMessage("captureMagnetTip");
            $("#captureMagnet").parent().addClass("tool-tip tool-tip-icon");
        }
    }

    /**
     * Bind events
     */
    #bindEvents() {
        // Shortcuts setting
        $("#shortcuts-setting").off().on("click", this.openShortcutsPage);

        // Color mode toggle
        $("#colorMode").off().on("click", () => this.#toggleColorMode());

        // Form submit and reset
        $("form").off().on("submit", (e) => e.preventDefault())
                      .on("reset", (e) => e.preventDefault());

        // Keyboard shortcuts
        $(window).off('keyup').on('keyup', (e) => this.#handleKeyboardShortcuts(e));

        // Storage change listener
        chrome.storage.onChanged.addListener((changes, areaName) => {
            this.#handleStorageChange(changes, areaName);
        });

        // Color mode change listener
        window.matchMedia('(prefers-color-scheme: dark)').onchange = () => this.#setColorMode();

        // WebStore link
        $("#webStoreUrl").prop("href", Utils.getWebStoreUrl());
    }

    /**
     * Setup version info
     */
    #setupVersionInfo() {
        const manifest = chrome.runtime.getManifest();
        $("#version").text('v' + manifest.version);
    }

    /**
     * Open shortcuts settings page (public method used as event handler)
     */
    openShortcutsPage() {
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
     * Toggle color mode
     */
    #toggleColorMode() {
        const config = this.configManager.getConfig();
        config.colorModeId = (config.colorModeId + 1) % ColorModeList.length;
        chrome.storage.local.set({ colorModeId: config.colorModeId });
    }

    /**
     * Set color mode
     */
    #setColorMode() {
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
     * Handle keyboard shortcuts
     */
    #handleKeyboardShortcuts(e) {
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
     * Handle storage changes
     */
    #handleStorageChange(changes, areaName) {
        if (areaName !== "local") return;

        // Only update color mode
        if (Object.keys(changes).length === 1 && changes.hasOwnProperty('colorModeId')) {
            this.#setColorMode();
            return;
        }

        // Reinitialize
        this.init();

        // Handle RPC list changes
        if (changes.rpcList && !changes.hasOwnProperty("ariaNgOptions")) {
            const oldList = changes.rpcList.oldValue;
            const newList = changes.rpcList.newValue;
            
            if (this.configManager.isRpcListChanged(oldList, newList)) {
                this.configManager.updateAriaNgRpc(newList);
            }
        }

        // Handle magnet capture
        if (changes.captureMagnet) {
            this.#toggleMagnetHandler(changes.captureMagnet.newValue);
        }
    }

    /**
     * Toggle magnet link handler
     */
    #toggleMagnetHandler(flag) {
        const magnetPage = chrome.runtime.getURL("magnet.html") + "?action=magnet&url=%s";
        
        if (flag) {
            navigator.registerProtocolHandler("magnet", magnetPage, "Capture Magnet");
        } else {
            navigator.unregisterProtocolHandler("magnet", magnetPage);
        }
    }

    /**
     * Collect form data
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

        // Collect checkboxes
        $("input[type=checkbox]").each(function() {
            formData.checkboxes[this.id] = this.checked;
        });

        // Collect input fields
        $("input[type=text],input[type=number]").each(function() {
            formData.inputs[this.id] = this.value;
        });

        // Collect textareas
        $("textarea").each(function() {
            formData.textareas[this.id] = this.value;
        });

        return formData;
    }

    /**
     * Show result message
     */
    showResult(elementId, message, isSuccess, timeout = 2000) {
        const style = isSuccess ? "alert-success" : "alert-danger";
        $(`#${elementId}`).addClass(style).text(message);
        
        setTimeout(() => {
            $(`#${elementId}`).text("").removeClass(style);
        }, timeout);
    }
}
