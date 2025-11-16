/**
 * Options Page - 主入口
 * 重构后的模块化架构
 */
import { ConfigManager } from "./options/ConfigManager.js";
import { UIController } from "./options/UIController.js";
import { RpcManager } from "./options/RpcManager.js";

/**
 * 选项页面应用类
 */
class OptionsApp {
    constructor() {
        this.configManager = new ConfigManager();
        this.rpcManager = new RpcManager(this.configManager);
        this.uiController = new UIController(this.configManager, this.rpcManager);
    }

    /**
     * 初始化应用
     */
    async init() {
        // 检查是否需要升级存储
        if (location.search.endsWith("upgrade-storage")) {
            await this._upgradeStorage();
        }

        // 初始化配置
        await this.configManager.init();

        // 初始化UI
        await this.uiController.init();

        // 绑定按钮事件
        this._bindButtonEvents();
    }

    /**
     * 绑定按钮事件
     */
    _bindButtonEvents() {
        // 保存按钮
        $("#save").off().on("click", async () => {
            const formData = this.uiController.collectFormData();
            await this.configManager.save(formData);
        });

        // 重置按钮
        $("#reset").off().on("click", async () => {
            const success = await this.configManager.reset();
            if (success) {
                await this.init();
            }
        });

        // 上传按钮
        $("#upload").off().on("click", async () => {
            const result = await this.configManager.upload();
            this.uiController.showResult(
                "sync-result",
                result.message,
                result.success,
                result.success ? 2000 : 5000
            );
        });

        // 下载按钮
        $("#download").off().on("click", async () => {
            const result = await this.configManager.download();
            this.uiController.showResult(
                "sync-result",
                result.message,
                result.success,
                result.success ? 2000 : 5000
            );
            if (result.success) {
                await this.init();
            }
        });

        // 导出按钮
        $("#exportConfig").off().on("click", () => {
            const result = this.configManager.export();
            this.uiController.showResult(
                "import-export-result",
                result.message,
                result.success
            );
        });

        // 导入按钮
        $("#importConfig").off().on("click", () => {
            $("#configFileInput").click();
        });

        // 文件输入
        $("#configFileInput").off().on("change", async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const result = await this.configManager.import(file);
            
            if (!result.cancelled) {
                this.uiController.showResult(
                    "import-export-result",
                    result.message,
                    result.success,
                    result.success ? 2000 : 5000
                );
            }

            if (result.success) {
                await this.init();
            }

            event.target.value = '';
        });
    }

    /**
     * 升级存储（从localStorage迁移到chrome.storage）
     */
    async _upgradeStorage() {
        const configs = await chrome.storage.local.get("rpcList");
        if (configs.rpcList) return;

        const convertMap = {
            white_site: "allowedSites",
            black_site: "blockedSites",
            white_ext: "allowedExts",
            black_ext: "blockedExts",
            rpc_list: "rpcList",
            newwindow: "window",
            newtab: "tab"
        };

        const newConfigs = {};

        for (let [k, v] of Object.entries(localStorage)) {
            if (convertMap[k]) k = convertMap[k];
            if (convertMap[v]) v = convertMap[v];
            if (k.startsWith("AriaNg")) continue;

            if (v === "true") {
                newConfigs[k] = true;
            } else if (v === "false") {
                newConfigs[k] = false;
            } else if (/\[.*\]|\{.*\}/.test(v)) {
                newConfigs[k] = JSON.parse(v);
            } else {
                newConfigs[k] = v;
            }
        }

        await chrome.storage.local.set(newConfigs);
        console.log("Storage upgrade completed.");
    }
}

// 创建并初始化应用
const app = new OptionsApp();

window.onload = () => {
    app.init().catch(error => {
        console.error("Failed to initialize options page:", error);
    });
};
