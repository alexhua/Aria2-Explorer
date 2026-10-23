/**
 * HelpDialog - Help dialog with shortcut cheatsheet and other works showcase
 */
const STORE_BASE = {
    chrome: "https://chromewebstore.google.com/detail/",
    edge: "https://microsoftedge.microsoft.com/addons/detail/"
};

// Other works by the author, shown in the "More works" section
const WORKS = [
    {
        name: "DownCenter",
        descKey: "downCenterDesc",
        icon: "fa-solid fa-download",
        stores: {
            chrome: "downcenter/fdigeipllamghcclefoogimaofjelcln",
            edge: "downcenter/iddkhghdnohpcpnlhhglcchokilnghel"
        }
    },
    {
        name: "Gold Index",
        descKey: "goldIndexDesc",
        icon: "fa-solid fa-chart-line",
        iconClass: "gold",
        stores: {
            chrome: "gold-index/ehkdekfplfleigejnihhphiehgngmlla",
            edge: "gold-index/kkaefdangipfeegngcjmhapgglbliijg"
        }
    }
];

const CLOSE_ANIMATION_FALLBACK_MS = 300;

export class HelpDialog {
    static init() {
        const dialog = document.getElementById("helpDialog");
        if (!dialog) return;

        HelpDialog.#renderWorks(document.getElementById("helpWorks"));

        document.getElementById("helpBtn")?.addEventListener("click", () => HelpDialog.open());
        document.getElementById("helpCloseBtn")?.addEventListener("click", () => HelpDialog.close());

        // Close on backdrop click (click target is the dialog itself, not its content)
        dialog.addEventListener("click", (e) => {
            if (e.target === dialog) HelpDialog.close();
        });

        // Replace native Esc closing with the animated one
        dialog.addEventListener("cancel", (e) => {
            e.preventDefault();
            HelpDialog.close();
        });

        // Intercept global right-click to open help dialog
        document.addEventListener("contextmenu", (e) => {
            // Allow native context menu inside text inputs/textareas for cut/copy/paste
            if (e.target.closest('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')) {
                return;
            }
            e.preventDefault();
            HelpDialog.open();
        });

        // Keyboard shortcut: '?' to toggle help dialog when not typing in text fields
        document.addEventListener("keydown", (e) => {
            if (e.key === "?" && !e.ctrlKey && !e.altKey && !e.metaKey &&
                !e.target.closest('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')) {
                e.preventDefault();
                if (dialog.open) {
                    HelpDialog.close();
                } else {
                    HelpDialog.open();
                }
            }
        });
    }

    /**
     * Open help dialog
     */
    static open() {
        const dialog = document.getElementById("helpDialog");
        if (!dialog || dialog.open) return;
        dialog.showModal();
    }

    /**
     * Close with exit animation
     */
    static close() {
        const dialog = document.getElementById("helpDialog");
        if (!dialog) return;
        HelpDialog.#close(dialog);
    }

    static #close(dialog) {
        if (!dialog.open || dialog.classList.contains("is-closing")) return;

        const finish = () => {
            dialog.removeEventListener("animationend", finish);
            clearTimeout(timer);
            dialog.classList.remove("is-closing");
            dialog.close();
        };
        const timer = setTimeout(finish, CLOSE_ANIMATION_FALLBACK_MS);
        dialog.addEventListener("animationend", finish);
        dialog.classList.add("is-closing");
    }

    static #renderWorks(container) {
        if (!container) return;

        const store = /Edg/.test(navigator.userAgent) ? "edge" : "chrome";
        container.innerHTML = WORKS.map(work => `
            <a class="help-work-card" href="${STORE_BASE[store]}${work.stores[store]}" target="_blank" rel="noopener noreferrer">
                <div class="help-work-banner">
                    <div class="help-work-badge ${work.iconClass || ""}"><i class="${work.icon}"></i></div>
                </div>
                <div class="help-work-body">
                    <div class="help-work-title">
                        <span>${work.name}</span>
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </div>
                    <div class="help-work-desc">${chrome.i18n.getMessage(work.descKey)}</div>
                </div>
            </a>
        `).join("");
    }
}
