/**
 * UIController - UI controller
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

// Shorthand helpers
const QS = (sel, ctx = document) => ctx.querySelector(sel);
const QSA = (sel, ctx = document) => ctx.querySelectorAll(sel);

export class UIController {
    constructor(rpcManager) {
        this.configService = ConfigService.getInstance();
        this.rpcManager = rpcManager;
        this.mediaQueryList = null;
        // Store bound listener refs for clean removal
        this._keyupHandler = (e) => this.#handleKeyboardShortcuts(e);
    }

    /**
     * Initialize UI
     */
    async init() {
        Utils.localizeHtmlPage();

        const config = this.configService.get();

        this.#setColorMode();
        this.#resetForm();
        this.#fillFormData(config);
        this.#setupDependencies(config);
        this.rpcManager.render();
        this.#bindEvents();
        this.#setupVersionInfo();
    }

    /**
     * Reset form
     */
    #resetForm() {
        QSA("input[type=checkbox]").forEach(el => el.checked = false);
        QSA("input[type=text],input[type=number]").forEach(el => el.value = "");
        QSA("textarea").forEach(el => el.value = "");
    }

    /**
     * Fill form data
     */
    #fillFormData(config) {
        // Radio buttons
        const webUI = QS(`#${config.webUIOpenStyle}`);
        const icon = QS(`#${config.iconOffStyle}`);
        if (webUI) webUI.checked = true;
        if (icon) icon.checked = true;

        // Checkboxes
        QSA("input[type=checkbox]").forEach(el => {
            if (config[el.id] !== undefined) el.checked = config[el.id];
        });

        // Input fields (excluding RPC inputs)
        QSA("input[type=text],input[type=number]").forEach(el => {
            if (!el.closest("#rpcList") && config[el.id] !== undefined) {
                el.value = config[el.id];
            }
        });

        // Textareas
        QSA("textarea").forEach(el => {
            if (config[el.id]) el.value = config[el.id].join("\n");
        });

        // Show/hide monitor-all option
        QS("#monitor-all").style.display = config.rpcList.length > 1 ? "" : "none";

        this.#updateDependencyState(config);
    }

    /**
     * Setup dependency listeners
     */
    #setupDependencies(config) {
        this.#updateDependencyState(config);

        for (const [dependent, dependency] of Object.entries(OptionDeps)) {
            const depEl = QS(`#${dependency}`);
            if (!depEl) continue;
            // Replace with clone to clear previous listeners safely
            const fresh = depEl.cloneNode(true);
            depEl.replaceWith(fresh);
            fresh.addEventListener("change", () => {
                const target = QS(`#${dependent}`);
                if (target) target.disabled = !fresh.checked;
            });
        }
    }

    /**
     * Update dependency state (enable/disable inputs)
     */
    #updateDependencyState(config) {
        for (const [dependent, dependency] of Object.entries(OptionDeps)) {
            const depEl = QS(`#${dependency}`);
            const target = QS(`#${dependent}`);
            if (!target) continue;
            const isEnabled = config[dependency] !== undefined
                ? config[dependency]
                : depEl?.checked ?? false;
            target.disabled = !isEnabled;
        }
    }

    /**
     * Bind events
     */
    #bindEvents() {
        // Shortcuts setting
        const shortcutsBtn = QS("#shortcuts-setting");
        if (shortcutsBtn) {
            const fresh = shortcutsBtn.cloneNode(true);
            shortcutsBtn.replaceWith(fresh);
            fresh.addEventListener("click", () => this.openShortcutsPage());
        }

        // Color mode toggle
        const colorModeBtn = QS("#colorMode");
        if (colorModeBtn) {
            const fresh = colorModeBtn.cloneNode(true);
            colorModeBtn.replaceWith(fresh);
            fresh.addEventListener("click", () => this.#toggleColorMode());
        }

        // Form submit / reset prevention
        const form = QS("form");
        if (form) {
            form.addEventListener("submit", e => e.preventDefault());
            form.addEventListener("reset", e => e.preventDefault());
        }

        // Keyboard shortcuts
        window.removeEventListener("keyup", this._keyupHandler);
        window.addEventListener("keyup", this._keyupHandler);

        // System color scheme listener
        this.mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
        this.mediaQueryList.onchange = () => this.#setColorMode();

        // WebStore link
        const storeLink = QS("#webStoreUrl");
        if (storeLink) storeLink.href = Utils.getWebStoreUrl();
    }

    /**
     * Setup version info
     */
    #setupVersionInfo() {
        const manifest = chrome.runtime.getManifest();
        const versionEl = QS("#version");
        if (versionEl) versionEl.textContent = "v" + manifest.version;
    }

    /**
     * Open shortcuts settings page
     */
    openShortcutsPage() {
        chrome.tabs.query({ "url": SHORTCUTS_PAGE_URL }).then(tabs => {
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
        const current = this.configService.get("colorModeId");
        const next = (current + 1) % ColorModeList.length;
        await this.configService.set({ colorModeId: next });
    }

    /**
     * Set color mode
     */
    #setColorMode() {
        const config = this.configService.get();
        const html = document.documentElement;
        const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        const isDark =
            config.colorModeId === 1 ||
            (config.colorModeId === 2 && dark);

        html.classList.toggle("dark-mode", isDark);

        const mode = ColorModeList[config.colorModeId];
        const iconEl = QS("#colorMode .fa");
        if (iconEl) {
            iconEl.classList.remove("fa-moon", "fa-sun", "fa-circle-half-stroke");
            iconEl.classList.add(mode.icon);
            iconEl.title = chrome.i18n.getMessage(mode.title);
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    #handleKeyboardShortcuts(e) {
        if (!e.altKey) return;

        const actions = {
            s: "save",
            r: "reset",
            u: "upload",
            j: "download",
            e: "exportConfig",
            i: "importConfig"
        };

        const id = actions[e.key];
        if (id) {
            const btn = document.getElementById(id);
            btn?.click();
            btn?.focus({ focusVisible: true });
        }
    }

    /**
     * Update UI with new config (called when config changes)
     */
    updateUI(config) {
        this.#setColorMode();
        this.#fillFormData(config);
        this.rpcManager.render();
    }

    /**
     * Collect form data
     */
    collectFormData() {
        const formData = {
            rpcList: this.rpcManager.collectData(),
            webUIOpenStyle: QS("[name=webUIOpenStyle]:checked")?.value,
            iconOffStyle: QS("[name=iconOffStyle]:checked")?.value
        };

        // Checkboxes
        QSA("input[type=checkbox]").forEach(el => {
            formData[el.id] = el.checked;
        });

        // Input fields (excluding RPC inputs)
        QSA("input[type=text],input[type=number]").forEach(el => {
            if (el.closest("#rpcList")) return;
            formData[el.id] = el.type === "number" ? Number(el.value) : el.value;
        });

        // Textareas
        QSA("textarea").forEach(el => {
            formData[el.id] = el.value
                ? el.value.split("\n").filter(line => line.trim() !== "")
                : [];
        });

        return formData;
    }

    /**
     * Show result message
     */
    showResult(elementId, message, isSuccess, timeout = 2000) {
        const el = QS(`#${elementId}`);
        const style = isSuccess ? "alert-success" : "alert-danger";
        if (!el) return;

        el.classList.add(style);
        el.textContent = message;

        setTimeout(() => {
            el.textContent = "";
            el.classList.remove(style);
        }, timeout);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        window.removeEventListener("keyup", this._keyupHandler);
        if (this.mediaQueryList) {
            this.mediaQueryList.onchange = null;
            this.mediaQueryList = null;
        }
    }
}
