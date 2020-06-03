# Aria2 for Chrome

Aria2 for chrome 是一款为Chrome定制的下载任务管理扩展，能够自动拦截或手动添加下载任务到Aria2c来完成网络资源下载。
同时引入了AriaNG作为前端方便用户对Aria2c进行操作和管理。

## Usage

扩展和AriaNG分别需要配置RPC地址

右键单击扩展图标并点击“选项”选单，可以设置是否开启右键菜单和下载拦截

并且可以设置多大的文件使用导出下载,小文件使用Chrome自带的下载功能,拦截下载默认使用第一个RPC地址.

开启右键菜单之后任意链接都可以右键导出到Aria2进行下载.

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
[<img src="https://developer.microsoft.com/en-us/store/badges/images/English_get-it-from-MS.png" width=30% >](https://microsoftedge.microsoft.com/addons/detail/jjfgljkjddpcpfapejfkelkbjbehagbh "Aria2 for Edge")


## Privacy policy

This extension just captures chrome download task and related website cookies for the user's specific connecting aria2c to download the  network resource. Aria2c connection and config infomation will be just stored locally or uploaded to user's Google cloud by choice. It will never collect any user's personal data, network activity or share it to 3rd party.

## License

![GPLv3](https://www.gnu.org/graphics/gplv3-127x51.png)

Aria2-for-Chrome is licensed under [GNU General Public License](https://www.gnu.org/licenses/gpl.html) Version 3 or later.
