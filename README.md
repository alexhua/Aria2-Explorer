# Aria2 for Chrome

Aria2 for chrome 是一款为Chrome定制的下载任务管理扩展，能够自动拦截或手动添加下载任务到Aria2来完成网络资源下载。
同时，引入了AriaNG作为前端方便用户对Aria2进行操作和管理。

Aria2 for chrome is an extension that could capture chrome download task to Aria2 and imports AriaNG as built-in management frontend.

## Usage

扩展和AriaNG分别需要配置RPC地址

右键单击扩展图标并点击“选项”选单，可以设置是否开启右键菜单和下载拦截，默认使用Alt+A可以开关下载拦截功能。

用户可以设置扩展名、网站黑白名单或文件大小来决定拦截哪些下载任务。同时还可以添加多个JSON-RPC地址并设置不同的URL匹配规则，让扩展自动选择对应的JSON-RPC地址。下载任务默认发送到第一个JSON-RPC地址，用户可以使用 * 作为匹配规则来更改默认JSON-RPC地址。

过滤优先级:网站 -> 扩展名 -> 文件大小，优先处理白名单。

开启右键菜单之后任意链接都可以右键导出到Aria2进行下载.

User should config auto-capture function in extension option page. AND config aria2 remote management function in AriaNG settings page. Shortcut Alt+A could toggle auto-capture function in chrome.

User could set file extension or website white/black list to filter download task. User could add more JSON-RPC and set URL reg-exp patterns to let extension select among them automatically. The first JSON-RPC will be select as default. Also user could set pattern as * to change the default JSON-RPC.

Filter priority: Website -> File-ext -> File-size, White-list -> Black-list.

After enable context menu, user could right-click the link in the web page and export it to specific aria2 manually.

## Integration

允許其他擴展使用這個擴展作為與 Aria2c 的中介軟體來下載檔案。

Allow other extensions use this extension as middleware to download file with Aria2c.

```js

const downloadItem = {
    "url": "https://sample.com/image.jpg",
    "filename": "image_from_sample.jpg",
    "referrer": "https://sample.com",
    "options": { // aria2c RPC options here
        "split": "10",
        "...": "..."
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
