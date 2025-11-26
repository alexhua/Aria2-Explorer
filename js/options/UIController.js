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

import { ConfigService } from "../services/ConfigService.js";

export class UIController {
    constructor(rpcManager) {
        this.configService = ConfigService.getInstance();
        this.rpcManager = rpcManager;
        this.mediaQueryList = null;
    }

    /**
     * 初始化UI
     */
    async init() {
        Utils.localizeHtmlPage();

        const config = this.configService.get();

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
        $("input[type=checkbox]").each(function () {
            if (config[this.id] !== undefined) {
                this.checked = config[this.id];
            }
        });

        // Input fields
        $("input[type=text],input[type=number]").not("#rpcList input").each(function () {
            if (config[this.id] !== undefined) {
                this.value = config[this.id];
            }
        });

        // Textareas
        $("textarea").each(function () {
            if (config[this.id]) {
                this.value = config[this.id].join("\n");
            }
        });

        // Show/hide monitor all option
        config.rpcList.length > 1 ? $("#monitor-all").show() : $("#monitor-all").hide();

        // Update dependencies state
        this.#updateDependencyState(config);
    }

    /**
     * Setup dependencies listeners
     */
    #setupDependencies(config) {
        // Initial state update
        this.#updateDependencyState(config);

        // Bind listeners
        for (const [dependent, dependency] of Object.entries(OptionDeps)) {
            $(`#${dependency}`).change(() => {
                $(`#${dependent}`).prop("disabled", !$(`#${dependency}`).prop("checked"));
            });
        }
    }

    /**
     * Update dependency state (enable/disable inputs)
     */
    #updateDependencyState(config) {
        for (const [dependent, dependency] of Object.entries(OptionDeps)) {
            // Use config value if available, otherwise check DOM
            const isEnabled = config[dependency] !== undefined ? config[dependency] : $(`#${dependency}`).prop("checked");
            $(`#${dependent}`).prop("disabled", !isEnabled);
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

        // Color mode change listener
        this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        this.mediaQueryList.onchange = () => this.#setColorMode();

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
    async #toggleColorMode() {
        const current = this.configService.get('colorModeId');
        const next = (current + 1) % ColorModeList.length;
        await this.configService.set({ colorModeId: next });
    }

    /**
     * Set color mode
     */
    #setColorMode() {
        const config = this.configService.get();

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
     * Update UI with new config
     * Called by OptionsApp when config changes
     */
    updateUI(config) {
        // Update color mode if changed
        this.#setColorMode();

        // Update form data
        this.#fillFormData(config);

        // Re-render RPC list
        this.rpcManager.render();
    }

    /**
     * Collect form data
     */
    collectFormData() {
        const formData = {
            rpcList: this.rpcManager.collectData(),
            webUIOpenStyle: $("[name=webUIOpenStyle]:checked").val(),
            iconOffStyle: $("[name=iconOffStyle]:checked").val()
        };

        // Collect checkboxes
        $("input[type=checkbox]").each(function () {
            formData[this.id] = this.checked;
        });

        // Collect input fields
        $("input[type=text],input[type=number]").not("#rpcList input").each(function () {
            if (this.type === 'number') {
                formData[this.id] = Number(this.value);
            } else {
                formData[this.id] = this.value;
            }
        });

        // Collect textareas
        $("textarea").each(function () {
            if (this.value) {
                formData[this.id] = this.value.split("\n").filter(line => line.trim() !== "");
            } else {
                formData[this.id] = [];
            }
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

    /**
     * Cleanup resources
     */
    cleanup() {
        // Clean up media query listener
        if (this.mediaQueryList) {
            this.mediaQueryList.onchange = null;
            this.mediaQueryList = null;
        }
    }
}
