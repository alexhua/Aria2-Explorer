/**
 * RpcManager - RPC list manager
 */
import Utils from "../utils.js";
import Logger from "../logger.js";
import DefaultConfigs from "../config.js";

const Mark = chrome.i18n.getMessage("Mark");
const NameStr = chrome.i18n.getMessage("Name");
const SecretKeyStr = chrome.i18n.getMessage("SecretKey");
const DownloadLocationStr = chrome.i18n.getMessage("DownloadLocation");
const MarkAsSecureTip = chrome.i18n.getMessage("MarkAsSecureTip");
const MarkAsInsecureTip = chrome.i18n.getMessage("MarkAsInsecureTip");

import { ConfigService } from "../services/ConfigService.js";

// Shorthand helpers
const QS = (sel, ctx = document) => ctx.querySelector(sel);
const QSA = (sel, ctx = document) => ctx.querySelectorAll(sel);

export class RpcManager {
    constructor() {
        this.configService = ConfigService.getInstance();
    }

    /**
     * Render RPC list
     */
    render() {
        const config = this.configService.get();
        const rpcList = config.rpcList?.length ? config.rpcList : DefaultConfigs.rpcList;

        // Clear existing list
        QSA(".rpcGroup").forEach(el => el.remove());

        // Render each RPC item
        for (const i in rpcList) {
            this.#renderRpcItem(i, rpcList[i], false);
        }

        this.#bindEvents();
    }

    /**
     * Render single RPC item
     */
    #renderRpcItem(index, rpcItem, enableRequired) {
        const html = this.#buildRpcItemHtml(index, enableRequired);
        QS("#rpcList").insertAdjacentHTML("beforeend", html);

        // Fill data
        QS(`#name-${index}`).value = rpcItem.name;
        QS(`#location-${index}`).value = rpcItem.location || "";

        const rpc = Utils.parseUrl(rpcItem.url);
        QS(`#secretKey-${index}`).value = rpc.secretKey;
        QS(`#rpcUrl-${index}`).value = rpc.rpcUrl;

        if (index > 0) {
            QS(`#pattern-${index}`).value = rpcItem.pattern || "";
        }

        this.#handleSecurityMark(index, rpcItem);
    }

    /**
     * Build RPC item HTML
     */
    #buildRpcItemHtml(index, enableRequired) {
        const required = (enableRequired || index == 0) ? "required" : "";
        const addBtnOrPattern = index == 0
            ? `<button class="btn btn-primary" id="add-rpc"><i class="fa-solid fa-circle-plus"></i> RPC Server</button>`
            : `<input id="pattern-${index}" type="text" class="form-control col-sm-3 pattern" placeholder="URL Pattern(s) splitted by ,">`;

        return `<div class="form-group row rpcGroup">
            <label class="col-form-label col-sm-2 text-info">
                ${index == 0 ? '<i class="fa-solid fa-server"></i> Aria2-RPC-Server' : ''}
            </label>
            <div id="rpcItem-${index}" class="input-group col-sm-10">
                <input id="name-${index}" type="text" class="form-control col-sm-1 name"
                    placeholder="${NameStr} ∗" ${required}>
                <input id="secretKey-${index}" type="password" class="form-control col-sm-2 secretKey"
                    placeholder="${SecretKeyStr}">
                <input id="rpcUrl-${index}" type="url" class="form-control col-sm-4 rpcUrl"
                    placeholder="RPC URL ∗" ${required}>
                <div id="markRpc-${index}" class="input-group-append tool-tip" tooltip-content="">
                    <button id="markButton-${index}" class="btn btn-success" type="button">
                        <i class="fa-solid fa-pencil"></i> ${Mark}
                    </button>
                </div>
                <input id="location-${index}" type="text" class="form-control col-sm-2 location"
                    placeholder="${DownloadLocationStr}">
                ${addBtnOrPattern}
            </div>
        </div>`;
    }

    /**
     * Handle security mark
     */
    #handleSecurityMark(index, rpcItem) {
        const config = this.configService.get();

        if (Utils.validateRpcUrl(rpcItem.url) !== "WARNING") return;

        const markRpc = QS(`#markRpc-${index}`);
        const markButton = QS(`#markButton-${index}`);
        const rpcItem_el = QS(`#rpcItem-${index}`);
        const rpcUrl_el = QS(`#rpcUrl-${index}`);

        markRpc.style.display = "inline-block";

        if (rpcItem.ignoreInsecure) {
            markRpc.setAttribute("tooltip-content", MarkAsInsecureTip);
            markButton.classList.replace("btn-warning", "btn-success");
        } else {
            const tooltipKey = config.askBeforeDownload || config.askBeforeExport
                ? "ManualDownloadCookiesTooltipDes"
                : "AutoDownloadCookiesTooltipDes";

            rpcItem_el.classList.add("tool-tip");
            rpcItem_el.setAttribute("tooltip-content", chrome.i18n.getMessage(tooltipKey));
            rpcUrl_el.classList.add("is-warning");
            markRpc.setAttribute("tooltip-content", MarkAsSecureTip);
            markButton.classList.replace("btn-success", "btn-warning");
        }
    }

    /**
     * Bind events
     */
    #bindEvents() {
        // Add RPC button
        const addBtn = QS("#add-rpc");
        if (addBtn) {
            addBtn.addEventListener("click", () => {
                const i = QSA(".rpcGroup").length;
                const html = this.#buildRpcItemHtml(i, true).replace("password", "text");
                QS("#rpcList").insertAdjacentHTML("beforeend", html);
                QS(`#rpcUrl-${i}`).addEventListener("input", this.validateInput);
                QS(`#location-${i}`).addEventListener("input", this.validateInput);
                QS(`#markRpc-${i}`).addEventListener("click", e => this.markRpc(e));
            });
        }

        // Validate inputs
        QSA(".rpcGroup .rpcUrl").forEach(el => el.addEventListener("input", this.validateInput));
        QSA(".rpcGroup .location").forEach(el => el.addEventListener("input", this.validateInput));

        // Mark RPC buttons
        QSA(".rpcGroup [id^='markRpc-']").forEach(el =>
            el.addEventListener("click", e => this.markRpc(e))
        );
    }

    /**
     * Validate input (public method used as event handler)
     */
    validateInput(event) {
        const validator = {
            "url": Utils.validateRpcUrl,
            "text": Utils.validateFilePath
        };

        const input = event.target;
        const parent = input.parentElement;

        input.classList.remove("is-invalid", "is-valid", "is-warning");
        parent.classList.remove("tool-tip");
        parent.removeAttribute("tooltip-content");

        const result = validator[input.type](input.value);

        if (result === "VALID" || result === true) {
            input.classList.add("is-valid");
        } else if (input.value && (result === "INVALID" || result === false)) {
            input.classList.add("is-invalid");
        } else if (result === "WARNING") {
            input.classList.add("is-valid", "is-warning");
            parent.classList.add("tool-tip");
            parent.setAttribute("tooltip-content", chrome.i18n.getMessage("RpcUrlTooltipWarnDes"));
        }
    }

    /**
     * Mark RPC (public method used as event handler)
     */
    async markRpc(event) {
        const config = this.configService.get();
        const target = event.currentTarget || event.target;
        const rpcIndex = parseInt(target.id.split("-")[1]);

        if (rpcIndex >= 0 && rpcIndex < config.rpcList.length) {
            config.rpcList[rpcIndex].ignoreInsecure = !config.rpcList[rpcIndex].ignoreInsecure;
            Logger.log("[RpcManager] Marking RPC:", rpcIndex, "ignoreInsecure:", config.rpcList[rpcIndex].ignoreInsecure);
            await this.configService.set({ rpcList: config.rpcList });
            this.render();
        }
    }

    /**
     * Collect RPC list data
     */
    collectData() {
        const rpcList = [];
        const rpcGroups = QSA(".rpcGroup");

        for (let i = 0; i < rpcGroups.length; i++) {
            const name = QS(`#name-${i}`)?.value;
            const rpcUrl = QS(`#rpcUrl-${i}`)?.value?.trim();

            if (!name || !rpcUrl) continue;

            const secretKey = QS(`#secretKey-${i}`)?.value;
            const combinedUrl = Utils.combineUrl(secretKey, rpcUrl);

            if (!combinedUrl) continue;

            const location = Utils.formatFilepath(QS(`#location-${i}`)?.value?.trim() || "");
            const pattern = QS(`#pattern-${i}`)?.value?.trim() || "";

            rpcList.push({ name: name.trim(), url: combinedUrl, location, pattern });
        }

        return rpcList.length ? rpcList : DefaultConfigs.rpcList;
    }
}
