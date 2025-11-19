/**
 * RpcManager - RPC list manager
 */
import Utils from "../utils.js";
import { DefaultConfigs } from "../config.js";

const Mark = chrome.i18n.getMessage("Mark");
const NameStr = chrome.i18n.getMessage("Name");
const SecretKeyStr = chrome.i18n.getMessage("SecretKey");
const DownloadLocationStr = chrome.i18n.getMessage("DownloadLocation");
const MarkAsSecureTip = chrome.i18n.getMessage("MarkAsSecureTip");
const MarkAsInsecureTip = chrome.i18n.getMessage("MarkAsInsecureTip");

export class RpcManager {
    constructor(configManager) {
        this.configManager = configManager;
    }

    /**
     * Render RPC list
     */
    render() {
        const config = this.configManager.getConfig();
        const rpcList = config.rpcList?.length ? config.rpcList : DefaultConfigs.rpcList;

        // Clear existing list
        $(".rpcGroup").remove();

        // Render each RPC item
        for (const i in rpcList) {
            this.#renderRpcItem(i, rpcList[i], i == 0);
        }

        // Bind events
        this.#bindEvents();
    }

    /**
     * Render single RPC item
     */
    #renderRpcItem(index, rpcItem, isFirst) {
        const html = this.#buildRpcItemHtml(index, isFirst);
        $("#rpcList").append(html);

        // Fill data
        $(`#name-${index}`).val(rpcItem.name);
        
        const rpc = Utils.parseUrl(rpcItem.url);
        $(`#secretKey-${index}`).val(rpc.secretKey);
        $(`#rpcUrl-${index}`).val(rpc.rpcUrl);
        $(`#location-${index}`).val(rpcItem.location || '');
        
        if (index > 0) {
            $(`#pattern-${index}`).val(rpcItem.pattern || '');
        }

        // Handle security mark
        this.#handleSecurityMark(index, rpcItem);
    }

    /**
     * Build RPC item HTML
     */
    #buildRpcItemHtml(index, isFirst) {
        const required = isFirst ? 'required' : '';
        const addBtnOrPattern = isFirst 
            ? `<button class="btn btn-primary" id="add-rpc"><i class="fa-solid fa-circle-plus"></i> RPC Server</button>`
            : `<input id="pattern-${index}" type="text" class="form-control col-sm-3 pattern" placeholder="URL Pattern(s) splitted by ,">`;

        return `<div class="form-group row rpcGroup">
            <label class="col-form-label col-sm-2 text-info">
                ${isFirst ? '<i class="fa-solid fa-server"></i> Aria2-RPC-Server' : ''}
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
        const config = this.configManager.getConfig();
        
        if (Utils.validateRpcUrl(rpcItem.url) !== "WARNING") {
            return;
        }

        $(`#markRpc-${index}`).css('display', 'inline-block');

        if (rpcItem.ignoreInsecure) {
            $(`#markRpc-${index}`).attr('tooltip-content', MarkAsInsecureTip);
            $(`#markButton-${index}`).removeClass('btn-warning').addClass('btn-success');
        } else {
            let tooltipRes = config.askBeforeDownload || config.askBeforeExport
                ? "ManualDownloadCookiesTooltipDes"
                : "AutoDownloadCookiesTooltipDes";
            
            const tooltip = chrome.i18n.getMessage(tooltipRes);
            $(`#rpcItem-${index}`).addClass('tool-tip');
            $(`#rpcItem-${index}`).attr("tooltip-content", tooltip);
            $(`#rpcUrl-${index}`).addClass('is-warning');
            $(`#markRpc-${index}`).attr('tooltip-content', MarkAsSecureTip);
            $(`#markButton-${index}`).removeClass('btn-success').addClass('btn-warning');
        }
    }

    /**
     * Bind events
     */
    #bindEvents() {
        const config = this.configManager.getConfig();

        // Add RPC button
        $("#add-rpc").off().on("click", () => {
            const i = $(".rpcGroup").length;
            const newInput = this.#buildRpcItemHtml(i, false).replace("password", "text");
            $("#rpcList").append(newInput);
            $(`#rpcUrl-${i}`).on("input", this.validateInput);
            $(`#location-${i}`).on("input", this.validateInput);
            $(`#markRpc-${i}`).off().on('click', (e) => this.#markRpc(e));
        });

        // Validate input
        $(".rpcGroup .rpcUrl").off().on("input", this.validateInput);
        $(".rpcGroup .location").off().on("input", this.validateInput);

        // Mark RPC
        $(".rpcGroup [id^='markRpc-']").off().on('click', (e) => this.#markRpc(e));
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
        input.classList.remove("is-invalid", "is-valid", "is-warning");
        input.parentElement.classList.remove('tool-tip');
        input.parentElement.removeAttribute("tooltip-content");

        const result = validator[input.type](input.value);
        
        if (result === "VALID" || result === true) {
            input.classList.add("is-valid");
        } else if (input.value && (result === "INVALID" || result === false)) {
            input.classList.add("is-invalid");
        } else if (result === "WARNING") {
            input.classList.add("is-valid", "is-warning");
            input.parentElement.classList.add("tool-tip");
            const tooltip = chrome.i18n.getMessage("RpcUrlTooltipWarnDes");
            input.parentElement.setAttribute("tooltip-content", tooltip);
        }
    }

    /**
     * Mark RPC
     */
    #markRpc(event) {
        const config = this.configManager.getConfig();
        const rpcIndex = event.delegateTarget.id.split('-')[1];
        
        if (rpcIndex in config.rpcList) {
            config.rpcList[rpcIndex].ignoreInsecure = !config.rpcList[rpcIndex].ignoreInsecure;
            chrome.storage.local.set(config);
        }
    }

    /**
     * Collect RPC list data
     */
    collectData() {
        const rpcList = [];
        const rpcGroups = $(".rpcGroup");

        for (let i = 0; i < rpcGroups.length; i++) {
            const name = $(`#name-${i}`).val();
            const rpcUrl = $(`#rpcUrl-${i}`).val()?.trim();

            if (!name || !rpcUrl) continue;

            const secretKey = $(`#secretKey-${i}`).val();
            const combinedUrl = Utils.combineUrl(secretKey, rpcUrl);
            
            if (!combinedUrl) continue;

            const location = Utils.formatFilepath($(`#location-${i}`).val()?.trim() || '');
            const pattern = $(`#pattern-${i}`).val()?.trim() || '';

            rpcList.push({
                name: name.trim(),
                url: combinedUrl,
                location: location,
                pattern: pattern
            });
        }

        return rpcList.length ? rpcList : DefaultConfigs.rpcList;
    }
}
