# Aria2 for Chrome <span style="float:right">[[返回]](index.md)</span>

**Aria2 for Chrome** 是一款为 Chrome 定制的下载任务管理扩展，能够自动拦截或手动添加下载任务到 Aria2 来完成网络资源下载。同时，引入了 [AriaNG](https://www.github.com/mayswind/AriaNg/) 作为前端，方便用户对 Aria2 进行操作和管理。

## 📑 如何使用

1. 下载 Aria2 主程序：<span style="vertical-align:text-top;">[![下载 Aria2](https://img.shields.io/github/downloads/aria2/aria2/total?color=blue&label=下载%20Aria2)](https://github.com/aria2/aria2/releases)</span>
2. 打开 cmd（或 Terminal）输入 `aria2c --enable-rpc`
3. 从[在线商店](#-安装地址)安装浏览器扩展
4. 在扩展选项中打开 `自动拦截下载`，并根据需求配置其他选项

完成后，既可在Chrome中享受高速下载体验。

## ⭐ 功能特性

1. 自动拦截浏览器下载任务

    - 拦截通知
    - 支持磁力链接
    - 快捷键开关自动拦截 (默认：<kbd>Alt</kbd>+<kbd>A</kbd>)
    - 下载前手动设置各种详细参数
    - 通过域名、扩展名或文件大小过滤下载任务
    > 过滤优先级：网站 > 扩展名 > 文件大小，优先处理白名单

2. 根据预设URL规则自动选择不同的 Aria2 RPC 服务端

3. 内置 Aria2 前端：AriaNG，多种呈现方式：弹窗，新标签，新窗口

4. 所有配置云端同步

5. 中英双语支持

6. Aria2下载状态监测

7. 上下文菜单导出下载任务

8. 接受来自其他扩展的下载请求

9. 选项配置页面快捷键（保存：<kbd>Alt</kbd>+<kbd>S</kbd> 重置：<kbd>Alt</kbd>+<kbd>R</kbd> 下载：<kbd>Alt</kbd>+<kbd>J</kbd> 上传：<kbd>Alt</kbd>+<kbd>U</kbd>）

10. 只需一次配置，自动导出默认 RPC 设置到 AriaNG

## 🪢 外部调用

允許其他擴展使用這個擴展作為與 Aria2 的中介軟體來下載檔案。  

```js

const downloadItem = {
    url: "https://sample.com/image.jpg",
    filename: "image_from_sample.jpg",
    referrer: "https://sample.com",
    options: { 
        split: "10", // aria2 RPC options here
        xxxxx: "oooo"
    }
}

chrome.runtime.sendMessage(`Aria2 for Chrome extension ID`, downloadItem)

```

## 🔗 安装地址

[![Chrome Web Store](https://storage.googleapis.com/chrome-gcs-uploader.appspot.com/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/UV4C4ybeBTsZt43U4xis.png)](https://chrome.google.com/webstore/detail/aria2-for-chrome/mpkodccbngfoacfalldjimigbofkhgjn "Aria2 for Chrome")
[<img src="https://developer.microsoft.com/en-us/store/badges/images/English_get-it-from-MS.png" height=58 >](https://microsoftedge.microsoft.com/addons/detail/jjfgljkjddpcpfapejfkelkbjbehagbh "Aria2 for Edge")

## 💡 常见问题

[https://github.com/alexhua/aria2-for-chrome/issues?q=label:faq](https://github.com/alexhua/aria2-for-chrome/issues?q=label%3Afaq)

## 🔒 隐私政策

本扩展会拦截浏览器下载任务和相关 Cookies 信息发送到用户指定的 Aria2 服务端来完成下载。Aria2 连接和配置信息会保存在本地或者由用户选择上传到用户账户云端进行存储。本扩展不会收集任何用户个人信息或网络活动记录，也不会帮助任何第三方收集信息。

## 📜 源协议

![GPLv3](https://www.gnu.org/graphics/gplv3-127x51.png)

Aria2-for-Chrome is licensed under [GNU General Public License](https://www.gnu.org/licenses/gpl.html) Version 3 or later.
