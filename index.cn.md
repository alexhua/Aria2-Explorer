# Aria2 Explorer

<h1 style="position:absolute; top: 14px; right:14px"><a href="index.html">[返回]</a></h1>

**Aria2 Explorer** 是一款基于 [**Aria2**](https://github.com/aria2/aria2) 的下载工具，能够自动拦截浏览器或手动添加下载任务到 **Aria2** 完成网络资源下载，支持 **HTTP/HTTPS/FTP/SFTP/BT/Magnet** 协议。

同时，引入了 [AriaNG](https://www.github.com/mayswind/AriaNg/) 作为前端，方便用户对 Aria2 进行操作和管理。

任务管理在线版：[https://ui.aria2e.com](https://ui.aria2e.com)


## 📑 如何使用

1. Windows系统请下载 <span style="vertical-align:middle;">[![下载Aria2 Manager](https://img.shields.io/github/downloads/alexhua/aria2-manager/total?color=blue&label=Aria2%20Manager)](https://github.com/alexhua/aria2-manager/ "去 Aria2-Manager 主页了解更多信息")</span>，其他系统请下载 Aria2 主程序：<span style="vertical-align:middle;">[![下载 Aria2](https://img.shields.io/github/downloads/aria2/aria2/total?color=blue&label=Aria2)](https://github.com/aria2/aria2/releases "跳转到 Aria2 下载页面")</span>
2. Windows系统请运行 **Aria2Manager.exe** ，其他系统，请打开 **Terminal** 输入 `aria2c --enable-rpc`
3. 从[在线商店](#-安装地址)安装 **Aria2 Explorer**
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

3. 内置 Aria2 前端：AriaNG 增强版，多种呈现方式：弹窗，新标签，新窗口，PWA

4. 所有配置云端同步

5. 中/英双语言支持

6. Aria2下载状态监测

7. 支持右键菜单批量导出网页资源（图片·音频·视频·磁力链接）

8. 接受来自其他扩展的下载请求

9. 选项配置页面快捷键（保存：<kbd>Alt</kbd>+<kbd>S</kbd> 重置：<kbd>Alt</kbd>+<kbd>R</kbd> 下载：<kbd>Alt</kbd>+<kbd>J</kbd> 上传：<kbd>Alt</kbd>+<kbd>U</kbd>）

10. 支持通过浏览器下载拦截链接

## 🧩 外部调用

允許其他擴展使用這個擴展作為與 Aria2 的中介軟體來下載檔案。  

```js

const downloadItem = {
    url: "https://sample.com/image.jpg", // 多个url使用 \n 分隔
    filename: "image_from_sample.jpg",
    referrer: "https://sample.com",
    options: { 
        split: "10", // aria2 RPC options here
        xxxxx: "oooo"
    }
}

chrome.runtime.sendMessage(`Aria2-Explorer extension ID`, downloadItem)

```

## 📥 安装地址

### Aria2-Explorer:

[<img src="https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/iNEddTyWiMfLSwFD6qGq.png" style="box-shadow: 1px 1px 1px #888;border-radius:8px" height="55">](https://chrome.google.com/webstore/detail/mpkodccbngfoacfalldjimigbofkhgjn "从 Chrome 商店安装 Aria2-Explorer")
[<img src="https://get.microsoft.com/images/zh-cn%20light.svg" height="56" >](https://microsoftedge.microsoft.com/addons/detail/jjfgljkjddpcpfapejfkelkbjbehagbh "从 Edge 商店安装 Aria2-Explorer")

### Aria2-Manager:

[<img src="https://get.microsoft.com/images/zh-cn%20light.svg" height="56"/>](https://apps.microsoft.com/detail/Aria2%20Manager/9P5WQ68Q20WV?launch=true&cid=aria2e "从微软商店安装 Aria2-Manager")

## 💡 常见问题

[https://github.com/alexhua/aria2-explorer/issues?q=label:FAQ](https://github.com/alexhua/aria2-explorer/issues?q=label%3AFAQ+sort%3Acreated-asc)

## 🔒 隐私政策

本扩展会拦截浏览器下载任务和相关 Cookies 信息，发送到用户指定的 Aria2 服务端来完成下载。Aria2 连接和配置信息会保存在本地或者由用户选择上传到用户登录的云端进行存储。本扩展不会收集任何用户个人信息或网络活动记录，也不会帮助任何第三方收集用户信息。

## 📜 开源协议

![BSD](https://i0.wp.com/opensource.org/wp-content/uploads/2006/07/OSI_Approved_License.png?w=90&ssl=1)

Aria2-Explorer is licensed under [BSD 3-Clause License](https://opensource.org/license/bsd-3-clause/).
