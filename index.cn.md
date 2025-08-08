# Aria2 Explorer

<h1 style="position:absolute; top: 14px; right:14px"><a href="index.html">[返回]</a></h1>

**Aria2 Explorer** 是一款基于 [**Aria2**](https://github.com/aria2/aria2) 的下载工具，能够自动拦截浏览器或手动添加下载任务到 **Aria2** 完成网络资源下载，支持 **HTTP/HTTPS/FTP/SFTP/BT/Magnet** 等协议。

同时，引入了 [AriaNG](https://www.github.com/mayswind/AriaNg/) 作为前端，方便用户对 Aria2 进行操作和管理。

任务管理在线版：[https://ui.aria2e.com](https://ui.aria2e.com)


## 📑 如何使用

1. Windows 系统, 请从 [Microsoft Store](#-安装地址-1) 安装 **Aria2 Manager**，其他系统请下载 Aria2 主程序：<span style="vertical-align:middle;">[![下载 Aria2](https://img.shields.io/github/downloads/aria2/aria2/total?color=blue&label=Aria2)](https://github.com/aria2/aria2/releases "跳转到 Aria2 下载页面")</span>
2. Windows 系统请运行 **Aria2 Manager**，其他系统，请打开 **Terminal** 输入 `aria2c --enable-rpc`
3. 从 [在线商店](#-安装地址) 安装 **Aria2 Explorer**
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

3. 内置 Aria2 前端：AriaNG **增强版**，多种呈现方式：弹窗，新标签，新窗口，侧边栏，PWA

4. 所有配置云端同步

5. 中/英/日/韩/法/意/俄/乌/捷克语/西班牙语多语言支持

6. Aria2下载状态监测

7. 支持右键菜单批量导出网页资源（图片·音频·视频·磁力链接）

8. 接受来自其他扩展的下载请求

9. 选项配置页面快捷键（保存：<kbd>Alt</kbd>+<kbd>S</kbd> 重置：<kbd>Alt</kbd>+<kbd>R</kbd> 下载：<kbd>Alt</kbd>+<kbd>J</kbd> 上传：<kbd>Alt</kbd>+<kbd>U</kbd>）

10. 支持通过浏览器下载拦截链接

## 🧩 外部调用

允許其他擴展使用這個擴展作為與 Aria2 的中介軟體來下載檔案。  

```js

const downloadItem = {
    url: "https://sample.com/image.jpg", // 多个 url 使用 \n 分隔
    filename: "image_from_sample.jpg",
    referrer: "https://sample.com",
    options: { 
        split: "10", // aria2 RPC options here
        xxxxx: "oooo"
    }
}

chrome.runtime.sendMessage(`Aria2-Explorer extension ID`, downloadItem)

```

## 💡 常见问题

[https://github.com/alexhua/aria2-explorer/issues?q=label:FAQ](https://github.com/alexhua/aria2-explorer/issues?q=label%3AFAQ)

## 📥 安装地址

[<img src="https://developer.chrome.com/static/docs/webstore/branding/image/UV4C4ybeBTsZt43U4xis.png" style="box-shadow: 1px 1px 1px #888;border-radius:8px" height="55">](https://chrome.google.com/webstore/detail/mpkodccbngfoacfalldjimigbofkhgjn "Google Chrome 扩展商店")
[<img src="https://get.microsoft.com/images/zh-cn%20light.svg" height="56" >](https://microsoftedge.microsoft.com/addons/detail/jjfgljkjddpcpfapejfkelkbjbehagbh "Microsoft Edge 加载项商店")

## 💡 常见问题

[https://github.com/alexhua/aria2-explorer/issues?q=label:FAQ](https://github.com/alexhua/aria2-explorer/issues?q=label%3AFAQ)

---

# Aria2 Manager

**Aria2 Manager** `增强版` 已上架微软商店。

## ⭐ 增强特性

- 🔄️ 支持开机自启动
- 🪟 内置任务管理界面
- 👆 一键安装并自动更新
- 🛠️ 一些 Aria2 问题修复
- 🔔 系统通知提醒任务状态
- 🩺 在托盘图标提示下载状态
- 📄 关联种子文件和磁力链接
- ⚡ 点击任务名直接打开已下载文件
- 🔕 禁止 Aria2 开启时的已完成任务通知
- 🔀 支持通过 UPnP 协议进行 BT 和 DHT 端口映射，提升 BT 下载连接的连通性
- 🧹 支持删除 .aria2 控制文件和已下载文件（ Shift + 删除任务）

商店版将会不定期更新 Aria2 主程序和 BT Tracker 列表，未来还会加入更多的功能，敬请期待。

## 📥 安装地址

[<img src="https://get.microsoft.com/images/zh-cn%20dark.svg" height="56"/>](https://apps.microsoft.com/detail/Aria2%20Manager/9P5WQ68Q20WV?launch=true&cid=aria2e "从微软商店安装 Aria2-Manager")

## 💡 常见问题

[https://github.com/alexhua/aria2-manager/issues?q=label:FAQ](https://github.com/alexhua/aria2-manager/issues?q=label%3AFAQ)

---

## 🔒 隐私政策
**Aria2 Explorer** 和 **Aria2 Manager** 是一套用于管理 Aria2 下载任务的工具，我们非常重视用户隐私，并致力于保护用户的个人信息。本文概述我们收集的数据以及处理方式。

### Aria2 配置数据
**Aria2 Explorer** 和 **Aria2 Manager** 不会收集、传输或存储任何个人数据和网络活动信息。所有 Aria2 配置信息都保存在本地，或可选地上传至用户登录的浏览器云存储。我们从不收集、共享这些数据给任何第三方。

### 内嵌页面说明
**Aria2 Explorer** 和 **Aria2 Manager** 的界面中嵌入了一个 `Alex 推荐频道` 页面，其中包含一个托管在云端的评论系统（Waline）。

- 评论及相关用户数据（如昵称、电子邮件地址和 IP 地址）由该评论系统直接存储。

- **Aria2 Explorer** 和 **Aria2 Manager** 不处理或访问任何上述数据。

- IP 地址仅用于评论系统防止垃圾信息；电子邮件地址仅用于发送评论通知，并不会与第三方共享。

这两个工具本身不收集、存储和处理任何用户信息

```更新于2025-8-8```

## 📜 开源协议

![BSD](https://i0.wp.com/opensource.org/wp-content/uploads/2006/07/OSI_Approved_License.png?w=90&ssl=1)

**Aria2 Explorer** is licensed under [BSD 3-Clause License](https://opensource.org/license/bsd-3-clause/).
