# Aria2 for Chrome

Aria2 for chrome 是一款为Chrome定制的下载任务管理扩展，能够自动拦截或手动添加下载任务到Aria2来完成网络资源下载。同时，引入了AriaNG作为前端方便用户对Aria2进行操作和管理。

Aria2 for chrome is an extension that could capture chrome download task to Aria2 and imports AriaNG as built-in management frontend.

## Features

1. 自动拦截浏览器下载任务

    - 拦截通知
    - 快捷键开关自动拦截 (<kbd>Alt</kbd>+<kbd>A</kbd>)
    - 下载前手动设置各种详细参数
    - 通过域名、扩展名或文件大小过滤下载任务
    > 过滤优先级：网站 > 扩展名 > 文件大小，优先处理白名单

2. 设置URL模式规则以自动配置不同的Aria2 RPC

3. 内置Aria2前端：AriaNG

4. 多种前端打开方式：弹窗，新标签，新窗口

5. 所有配置云同步

6. 中英双语支持

7. Aria2下载状态监测

8. 上下文菜单导出下载任务

9. 接受来自其他扩展的下载请求

10. 支持磁力链接

---

1. Auto capture browser download task
    - Capture notification
    - Switch auto-capture by shortcut (<kbd>Alt</kbd>+<kbd>A</kbd>)
    - Manually set all aria2 options before download
    - Filter task by domain, file extension or file size
    > Filter priority: domain > file-ext > file-size, white-list > black-list
2. Auto match multiple aria2 RPCs by URL pattern

3. Built-in Aria2 front-end AriaNG

4. Multiple front-end WebUI present style: popup, new tab, new window

5. Synchronize and store all settings on cloud

6. Support zh-cn/zh-tw/en language

7. Aria2 download state monitor on badge icon

8. Export download task by context menu

9. Receive download request from other extension

10. Support magnet link

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
