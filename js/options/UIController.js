/**
 * UIController - UI controller
 */
import Utils from "../utils.js";
import Logger from "../logger.js";

const SHORTCUTS_PAGE_URL = "chrome://extensions/shortcuts";

const ColorModeList = [
    { name: 'light', icon: 'fa-sun', title: 'LightMode' },
    { name: 'dark', icon: 'fa-moon', title: 'DarkMode' },
    { name: 'system', icon: 'fa-circle-half-stroke', title: 'FollowSystem' }
];

const OptionDeps = {
    // Section 1: Context Menu
    askBeforeExport: 'contextMenus',

    // Section 2: Browser Download Interception
    fileSize: 'integration',
    checkClick: 'integration',
    askBeforeDownload: 'integration',

    // Section 3: Aria2 Status Monitor & Notifications
    monitorAll: 'monitorAria2',
    keepAwake: 'monitorAria2',
    badgeText: 'monitorAria2',
    allowNotification: 'monitorAria2',
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
        this._keydownHandler = (e) => this.#handleKeyboardShortcuts(e);
        this._scrollHandler = null;
        this._savedSnapshot = "";
        this._focusHandler = () => this.updateCommandShortcuts();
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
        this.#setupSegmentedControls();
        this.#setupVersionInfo();
        this.captureSnapshot();
        this.#bindChangeWatcher();
        await this.updateCommandShortcuts();
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

        // Show/hide window-blur-close option (no animation during initial hydration)
        this.#setWindowBlurCloseVisible(config.webUIOpenStyle === "window", false);

        this.#updateDependencyState(config);
    }

    /**
     * Setup dependency listeners
     */
    #setupDependencies() {
        this.#updateDependencyState();

        // Bind change listener once per unique dependency
        const uniqueDependencies = new Set(Object.values(OptionDeps));
        uniqueDependencies.forEach(depId => {
            const depEl = QS(`#${depId}`);
            if (depEl) {
                depEl.addEventListener("change", () => this.#updateDependencyState());
            }
        });
    }

    /**
     * Update dependency state (enable/disable inputs with cascade support)
     */
    #updateDependencyState() {
        // Run passes to propagate multi-level cascading dependencies
        for (let pass = 0; pass < 2; pass++) {
            for (const [dependent, dependency] of Object.entries(OptionDeps)) {
                const depEl = QS(`#${dependency}`);
                const target = QS(`#${dependent}`);
                if (!target || !depEl) continue;

                const isEnabled = !depEl.disabled && Boolean(depEl.checked);
                target.disabled = !isEnabled;
            }
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
        window.removeEventListener("keydown", this._keydownHandler);
        window.removeEventListener("focus", this._focusHandler);
        if (this._scrollHandler) {
            window.removeEventListener("scroll", this._scrollHandler);
            this._scrollHandler = null;
        }
        window.addEventListener("keydown", this._keydownHandler);

        // Window focus listener to refresh real command shortcuts if modified in shortcuts page
        window.removeEventListener("focus", this._focusHandler);
        window.addEventListener("focus", this._focusHandler);

        // Auto-hide header on scroll down, restore on scroll up
        if (this._scrollHandler) {
            window.removeEventListener("scroll", this._scrollHandler);
        }
        let lastScrollY = window.scrollY;
        this._scrollHandler = () => {
            const currentScrollY = window.scrollY;
            const header = QS(".app-header");
            if (!header) return;
            if (currentScrollY > 40 && currentScrollY > lastScrollY) {
                header.classList.add("header-hidden");
            } else {
                header.classList.remove("header-hidden");
            }
            lastScrollY = currentScrollY;
        };
        window.addEventListener("scroll", this._scrollHandler, { passive: true });

        // System color scheme listener
        this.mediaQueryList = window.matchMedia("(prefers-color-scheme: dark)");
        this.mediaQueryList.onchange = () => this.#setColorMode();

        // WebStore link
        const storeLink = QS("#webStoreUrl");
        if (storeLink) storeLink.href = Utils.getWebStoreUrl();

        // WebUI open style change listener to toggle windowBlurClose option smoothly
        QSA("input[name=webUIOpenStyle]").forEach(radio => {
            radio.addEventListener("change", (e) => {
                this.#setWindowBlurCloseVisible(e.target.value === "window", true);
            });
        });
    }

    /**
     * Toggle visibility of window-blur-close option with optional transition
     * @param {boolean} visible - Whether the option should be visible
     * @param {boolean} [animate=true] - Whether to animate the transition
     */
    #setWindowBlurCloseVisible(visible, animate = true) {
        const wrapper = QS("#window-blur-close-wrapper");
        if (!wrapper) return;
        if (!animate) {
            wrapper.classList.add("no-transition");
            wrapper.classList.toggle("is-visible", visible);
            // Force synchronous reflow to apply state instantly without animation
            void wrapper.offsetHeight;
            wrapper.classList.remove("no-transition");
        } else {
            wrapper.classList.toggle("is-visible", visible);
        }
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
        // Ignore when holding Ctrl or Meta (Command) to avoid hijacking browser shortcuts
        if (e.ctrlKey || e.metaKey) return;

        // Suppress page shortcuts when any modal dialog is open (e.g. help modal)
        if (document.querySelector("dialog[open]")) return;

        // Don't trigger single keys while typing in text inputs or textareas
        const isTyping = Boolean(
            e.target.closest('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]')
        );
        if (isTyping && !e.altKey) return;

        const actions = {
            s: "save",
            r: "reset",
            u: "upload",
            j: "download",
            e: "exportConfig",
            i: "importConfig"
        };

        const id = actions[e.key.toLowerCase()];
        if (id) {
            e.preventDefault();
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
        this.#updateSegmentedControls(false);
        this.captureSnapshot();
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
     * Capture current form snapshot as reference
     */
    captureSnapshot() {
        this._savedSnapshot = JSON.stringify(this.collectFormData());
        this.checkChanges();
    }

    /**
     * Check if form data differs from last saved snapshot
     */
    checkChanges() {
        const current = JSON.stringify(this.collectFormData());
        const hasChanges = (current !== this._savedSnapshot);
        const saveBtn = QS("#save");
        if (saveBtn) {
            saveBtn.classList.toggle("has-changes", hasChanges);
        }
        return hasChanges;
    }

    /**
     * Bind form change watcher
     */
    #bindChangeWatcher() {
        const container = QS(".main-container");
        if (container) {
            container.addEventListener("input", () => this.checkChanges());
            container.addEventListener("change", () => this.checkChanges());
        }
        window.addEventListener("formChange", () => this.checkChanges());
    }

    /**
     * Show save success visual feedback
     */
    showSaveSuccess() {
        this.captureSnapshot();
        const saveBtn = QS("#save");
        if (!saveBtn) return;

        const icon = QS("i", saveBtn);
        saveBtn.classList.remove("has-changes");
        saveBtn.classList.add("is-saved");

        if (icon) {
            const originalClass = icon.className;
            icon.className = "fa-solid fa-check";
            setTimeout(() => {
                saveBtn.classList.remove("is-saved");
                icon.className = originalClass;
            }, 1200);
        } else {
            setTimeout(() => {
                saveBtn.classList.remove("is-saved");
            }, 1200);
        }
    }

    /**
     * Refresh active indicators for all segmented controls
     */
    #updateSegmentedControls(animate = false) {
        QSA(".segmented-control").forEach(control => {
            if (typeof control._updateActive === "function") {
                control._updateActive(animate);
            }
        });
    }

    /**
     * Setup sliding active & hover indicators for segmented controls
     */
    #setupSegmentedControls() {
        QSA(".segmented-control").forEach(control => {
            // 1. Sliding active indicator (white card pill)
            let activeIndicator = QS(".segmented-active-indicator", control);
            if (!activeIndicator) {
                activeIndicator = document.createElement("div");
                activeIndicator.className = "segmented-active-indicator";
                activeIndicator.setAttribute("aria-hidden", "true");
                control.prepend(activeIndicator);
            }

            // 2. Sliding hover indicator (subtle glow pill)
            let hoverIndicator = QS(".segmented-hover-indicator", control);
            if (!hoverIndicator) {
                hoverIndicator = document.createElement("div");
                hoverIndicator.className = "segmented-hover-indicator";
                hoverIndicator.setAttribute("aria-hidden", "true");
                control.prepend(hoverIndicator);
            }

            // Function to smoothly slide active indicator to current checked option
            const updateActive = (animate = true) => {
                const checkedRadio = QS("input[type=radio]:checked", control);
                if (!checkedRadio) return;
                const checkedLabel = QS(`label[for="${checkedRadio.id}"]`, control);
                if (!checkedLabel) return;

                const actRect = checkedLabel.getBoundingClientRect();
                const ctrlRect = control.getBoundingClientRect();

                const left = actRect.left - ctrlRect.left;
                const top = actRect.top - ctrlRect.top;

                if (!animate) {
                    activeIndicator.style.transition = "none";
                }
                activeIndicator.style.width = `${actRect.width}px`;
                activeIndicator.style.height = `${actRect.height}px`;
                activeIndicator.style.transform = `translate3d(${left}px, ${top}px, 0)`;

                if (!animate) {
                    activeIndicator.offsetHeight;
                    activeIndicator.style.transition = "";
                }
            };

            // Expose updateActive on control for programmatic refresh
            control._updateActive = updateActive;

            // Slide active pill when user selects another option
            control.addEventListener("change", () => updateActive(true));

            // Initial positioning & window resize handling
            requestAnimationFrame(() => updateActive(false));
            window.addEventListener("resize", () => updateActive(false));

            // Hover interactions
            const options = QSA(".segmented-option label", control);
            options.forEach(label => {
                label.addEventListener("pointerenter", () => {
                    const optRect = label.getBoundingClientRect();
                    const ctrlRect = control.getBoundingClientRect();

                    const left = optRect.left - ctrlRect.left;
                    const top = optRect.top - ctrlRect.top;

                    hoverIndicator.style.width = `${optRect.width}px`;
                    hoverIndicator.style.height = `${optRect.height}px`;
                    hoverIndicator.style.transform = `translate3d(${left}px, ${top}px, 0)`;
                    hoverIndicator.style.opacity = "1";
                });
            });

            control.addEventListener("pointerleave", () => {
                hoverIndicator.style.opacity = "0";
            });
        });
    }

    /**
     * Update dynamic command shortcuts (reflect real user configuration)
     */
    async updateCommandShortcuts() {
        if (!chrome?.commands?.getAll) return;

        try {
            const commands = await chrome.commands.getAll();
            const notSetText = chrome.i18n.getMessage("shortcutNotSet") || "Not set";

            // 1. Update toggle-capture setting gear button tooltip
            const toggleCmd = commands.find(c => c.name === "toggle-capture");
            const shortcutsBtn = QS("#shortcuts-setting");
            if (shortcutsBtn) {
                const rawKey = toggleCmd?.shortcut?.trim();
                const formattedKey = rawKey ? rawKey.replace(/\+/g, " + ") : "";
                const tooltip = formattedKey ? `⌨: ${formattedKey}` : `⌨: ${notSetText}`;
                shortcutsBtn.setAttribute("tooltip-content", tooltip);
            }

            // 2. Update help dialog global extension shortcuts if present
            const helpToggleKeys = QS("#helpShortcutToggleCapture");
            if (helpToggleKeys) {
                this.#renderCommandKbd(helpToggleKeys, toggleCmd?.shortcut);
            }

            const launchCmd = commands.find(c => c.name === "launch-aria2");
            const helpLaunchKeys = QS("#helpShortcutLaunchAria2");
            if (helpLaunchKeys) {
                this.#renderCommandKbd(helpLaunchKeys, launchCmd?.shortcut);
            }
        } catch (err) {
            Logger.warn("Failed to update command shortcuts:", err);
        }
    }

    /**
     * Render command kbd badges into container
     */
    #renderCommandKbd(container, shortcutStr) {
        if (!container) return;
        const raw = shortcutStr?.trim();
        if (!raw) {
            const notSetText = chrome.i18n.getMessage("shortcutNotSet") || "Not set";
            container.innerHTML = `<span class="help-key-not-set">${notSetText}</span>`;
            return;
        }

        const keys = raw.split("+").map(k => k.trim()).filter(Boolean);
        container.innerHTML = keys
            .map(k => `<kbd>${k}</kbd>`)
            .join('<span class="help-key-plus">+</span>');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        window.removeEventListener("keydown", this._keydownHandler);
        if (this.mediaQueryList) {
            this.mediaQueryList.onchange = null;
            this.mediaQueryList = null;
        }
    }
}
