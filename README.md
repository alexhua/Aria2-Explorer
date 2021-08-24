# Aria2 for Chrome <span style="float:right">[[中文]](README.cn.md)</span>

Aria2 for chrome is an extension that could export URL to Aria2 to complete download and imports AriaNG as built-in management frontend.

Common user should download aria2 utility, run it in the terminal (or cmd) with typing "aria2c --enable-rpc" and enable auto-capture in extension options page, then enjoy the high-speed download experience.

[Download Latest aria2c](https://github.com/aria2/aria2/releases/latest)

## Features

1. Auto capture browser download task
    - Capture notification
    - Support magnet link
    - Switch auto-capture by shortcut (Default: <kbd>Alt</kbd>+<kbd>A</kbd>)
    - Manually set all aria2 options before download
    - Filter task by domain, file extension or file size
    > Filter priority: domain > file-ext > file-size, white-list > black-list
2. Auto select aria2 RPC server by matching presetting download URL pattern

3. Built-in Aria2 front-end AriaNG, multiple present style: popup, new tab, new window

4. Synchronize and store all settings on cloud

5. Support zh-cn/zh-tw/en language

6. Aria2 download state monitor on badge icon

7. Export download task by context menu

8. Receive download request from other extension

9. Support shortcuts in options page (Save:<kbd>Alt</kbd>+<kbd>S</kbd> Reset:<kbd>Alt</kbd>+<kbd>R</kbd> Download:<kbd>Alt</kbd>+<kbd>J</kbd> Upload:<kbd>Alt</kbd>+<kbd>U</kbd>)

10. Auto-Export default RPC setting to AriaNG

## Integration

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

[![Chrome Web Store](https://storage.googleapis.com/chrome-gcs-uploader.appspot.com/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/UV4C4ybeBTsZt43U4xis.png)](https://chrome.google.com/webstore/detail/aria2-for-chrome/mpkodccbngfoacfalldjimigbofkhgjn "Aria2 for Chrome")
[<img src="https://developer.microsoft.com/en-us/store/badges/images/English_get-it-from-MS.png" height=58 >](https://microsoftedge.microsoft.com/addons/detail/jjfgljkjddpcpfapejfkelkbjbehagbh "Aria2 for Edge")

## Tips & FAQs

[https://github.com/alexhua/Aria2-for-chrome/issues?q=label:faq](https://github.com/alexhua/Aria2-for-chrome/issues?q=label%3Afaq)

## Privacy policy

This extension just captures chrome download task and related website cookies for the user's specific connecting aria2 to download the network resource. Aria2 connection and config information will be just stored locally or uploaded to user's Google cloud by choice. It will never collect any user's personal data, network activity or share it to 3rd party.

## License

![GPLv3](https://www.gnu.org/graphics/gplv3-127x51.png)

Aria2-for-Chrome is licensed under [GNU General Public License](https://www.gnu.org/licenses/gpl.html) Version 3 or later.
