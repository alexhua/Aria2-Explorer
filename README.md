# Aria2 for Chrome

Aria2 for chrome 是一款为Chrome定制的下载任务管理扩展，能够自动拦截或手动添加下载任务到Aria2来完成网络资源下载。同时，引入了AriaNG作为前端方便用户对Aria2进行操作和管理。

小白用户可下载Aria2主程序后打开cmd (或Terminal) 输入" aria2c --enable-rpc "，然后在扩展选项中打开“自动拦截下载”，既可在Chrome中享受高速下载体验。关于Aria2如何在后台运行，以及进一步的配置可自行Google。

Aria2 for chrome is an extension that could export URL to Aria2 to complete download and imports AriaNG as built-in management frontend.

User should download Aria2 utility, run it in the terminal (or cmd) with typing "aria2c --enable-rpc" and enable auto-caption in extension options page, then enjoy the high-speed download experience.

[Download Latest Aria2](https://github.com/aria2/aria2/releases/latest)

## Features

1. 自动拦截浏览器下载任务

    - 拦截通知
    - 支持磁力链接
    - 快捷键开关自动拦截 (默认：<kbd>Alt</kbd>+<kbd>A</kbd>)
    - 下载前手动设置各种详细参数
    - 通过域名、扩展名或文件大小过滤下载任务
    > 过滤优先级：网站 > 扩展名 > 文件大小，优先处理白名单

2. 设置URL规则以根据下载地址自动选择不同的Aria2 RPC

3. 内置Aria2前端：AriaNG，多种呈现方式：弹窗，新标签，新窗口

4. 所有配置云端同步

5. 中英双语支持

6. Aria2下载状态监测

7. 上下文菜单导出下载任务

8. 接受来自其他扩展的下载请求

9. 选项配置页面快捷键（保存：<kbd>Alt</kbd>+<kbd>S</kbd> 重置：<kbd>Alt</kbd>+<kbd>R</kbd> 下载：<kbd>Alt</kbd>+<kbd>J</kbd> 上传：<kbd>Alt</kbd>+<kbd>U</kbd>）

10. 只需一次配置，自动导出默认RPC设置到AriaNG

---

1. Auto capture browser download task
    - Capture notification
    - Support magnet link
    - Switch auto-capture by shortcut (Default: <kbd>Alt</kbd>+<kbd>A</kbd>)
    - Manually set all aria2 options before download
    - Filter task by domain, file extension or file size
    > Filter priority: domain > file-ext > file-size, white-list > black-list
2. Auto select aria2 RPC by matching presetting download URL pattern

3. Built-in Aria2 front-end AriaNG, multiple present style: popup, new tab, new window

4. Synchronize and store all settings on cloud

5. Support zh-cn/zh-tw/en language

6. Aria2 download state monitor on badge icon

7. Export download task by context menu

8. Receive download request from other extension

9. Support shortcuts in options page (Save:<kbd>Alt</kbd>+<kbd>S</kbd> Reset:<kbd>Alt</kbd>+<kbd>R</kbd> Download:<kbd>Alt</kbd>+<kbd>J</kbd> Upload:<kbd>Alt</kbd>+<kbd>U</kbd>)

10. Auto-Export default RPC setting to AriaNG

## Integration

允許其他擴展使用這個擴展作為與 Aria2 的中介軟體來下載檔案。  
Allow other extensions use this extension as middleware to download file with Aria2.

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

## Install

[![Chrome Web Store](https://developer.chrome.com/webstore/images/ChromeWebStore_BadgeWBorder_v2_206x58.png)](https://chrome.google.com/webstore/detail/aria2-for-chrome/mpkodccbngfoacfalldjimigbofkhgjn "Aria2 for Chrome")
[<img src="https://developer.microsoft.com/en-us/store/badges/images/English_get-it-from-MS.png" height=58 >](https://microsoftedge.microsoft.com/addons/detail/jjfgljkjddpcpfapejfkelkbjbehagbh "Aria2 for Edge")

## Privacy policy

This extension just captures chrome download task and related website cookies for the user's specific connecting aria2 to download the network resource. Aria2 connection and config information will be just stored locally or uploaded to user's Google cloud by choice. It will never collect any user's personal data, network activity or share it to 3rd party.

## License

![GPLv3](https://www.gnu.org/graphics/gplv3-127x51.png)

Aria2-for-Chrome is licensed under [GNU General Public License](https://www.gnu.org/licenses/gpl.html) Version 3 or later.
