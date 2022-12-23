# Aria2 for Chrome <span style="float:right">[[中文]](index.cn.md)</span>

**Aria2 for Chrome** is an extension that could export URLs to Aria2 to complete downloads and imports [AriaNG](https://www.github.com/mayswind/AriaNg/) as a built-in management frontend.

## 📑 How to use

Procedures:

1. Download Aria2 utility: <span style="vertical-align:text-top;">[![Download Aria2](https://img.shields.io/github/downloads/aria2/aria2/total?color=blue&label=Download%20Aria2)](https://github.com/aria2/aria2/releases)</span>
2. Run it in the terminal (or cmd) with typing `aria2c --enable-rpc`.
3. Install extension from [web store](#-installation).
4. Enable `auto-capture` on the extension options page and configure others as you need.

After these steps, the extension will then take over the download, leading you to a high-speed download experience.

## ⭐ Features

1. Auto capture browser download tasks
    - Capture notification
    - Support magnet links
    - Toggle auto-capture by shortcut (Default: <kbd>Alt</kbd>+<kbd>A</kbd>)
    - Set all Aria2 options manually before download
    - Filter task by the domain, file extensions or file sizes
    > Filter priority: domain > file-ext > file-size, white-list > black-list
2. Auto-select Aria2 RPC server by matching the preset download URL pattern

3. Built-in Aria2 frontend: AriaNG, multiple present styles: popup, new tab, new window

4. Synchronize and store all settings on the cloud

5. Support for zh-CN/zh-TW/en languages

6. Monitor Aria2 download status via icon badge

7. Export download tasks from context menu

8. Receive download requests from other extensions

9. Support shortcuts in the options page (Save:<kbd>Alt</kbd>+<kbd>S</kbd> Reset:<kbd>Alt</kbd>+<kbd>R</kbd> Download:<kbd>Alt</kbd>+<kbd>J</kbd> Upload:<kbd>Alt</kbd>+<kbd>U</kbd>)

10. Auto-Export the default RPC setting to AriaNG

## 🪢 Integration

Allow other extensions to use this extension as middleware to download files with Aria2.

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

## 🔗 Installation

[![Chrome Web Store](https://storage.googleapis.com/chrome-gcs-uploader.appspot.com/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/UV4C4ybeBTsZt43U4xis.png)](https://chrome.google.com/webstore/detail/aria2-for-chrome/mpkodccbngfoacfalldjimigbofkhgjn "Aria2 for Chrome")
[<img src="https://developer.microsoft.com/en-us/store/badges/images/English_get-it-from-MS.png" height=58 >](https://microsoftedge.microsoft.com/addons/detail/jjfgljkjddpcpfapejfkelkbjbehagbh "Aria2 for Edge")

## 💡 Tips & FAQs

[https://github.com/alexhua/aria2-for-chrome/issues?q=label:faq](https://github.com/alexhua/aria2-for-chrome/issues?q=label%3Afaq)

## 🔒 Privacy policy

This extension just captures Chrome download tasks and related website cookies for the purpose of the user's specific connecting aria2 to download the network resources. Aria2 connections and config information will be only stored locally or uploaded to the user's Google Cloud by choice. It will never collect any personal data or network activity from the user, nor will it share with 3rd parties.

## 📜 License

![GPLv3](https://www.gnu.org/graphics/gplv3-127x51.png)

Aria2-for-Chrome is licensed under [GNU General Public License](https://www.gnu.org/licenses/gpl.html) Version 3 or later.
