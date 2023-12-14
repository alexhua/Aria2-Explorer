# Aria2 Explorer <span style="float:right">[[中文]](README.cn.md)</span>

**Aria2 Explorer** is an extension that could export URLs to Aria2 to complete downloads and imports [AriaNG](https://www.github.com/mayswind/AriaNg/) as a built-in management frontend.

## 📑How to use

Procedures:

1. Download Aria2 utility: [![Download Aria2](https://img.shields.io/github/downloads/aria2/aria2/total?color=blue&label=Aria2)](https://github.com/aria2/aria2/releases)
2. Run it in the terminal (or cmd) with typing `aria2c --enable-rpc`.
3. Install extension from [web store](#-installation).
4. Enable `auto-capture` on the extension options page and configure others as you need.

After completing these steps, the extension will take over the download process, leading you to a high-speed download experience.

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

7. Batch export webpage resources (Image·Audio·Videos·Magnet) links from context menu

8. Receive download requests from other extensions

9. Support shortcuts in the options page (Save:<kbd>Alt</kbd>+<kbd>S</kbd> Reset:<kbd>Alt</kbd>+<kbd>R</kbd> Download:<kbd>Alt</kbd>+<kbd>J</kbd> Upload:<kbd>Alt</kbd>+<kbd>U</kbd>)

10. Support downloading blob URL via browser

## 🧩 Integration

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

chrome.runtime.sendMessage(`Aria2-Explorer extension ID`, downloadItem)

```

## 📥 Installation

[![Chrome Web Store](https://storage.googleapis.com/chrome-gcs-uploader.appspot.com/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/UV4C4ybeBTsZt43U4xis.png)](https://chrome.google.com/webstore/detail/mpkodccbngfoacfalldjimigbofkhgjn "Aria2 Explorer")
[<img src="https://developer.microsoft.com/en-us/store/badges/images/English_get-it-from-MS.png" height=58 >](https://microsoftedge.microsoft.com/addons/detail/jjfgljkjddpcpfapejfkelkbjbehagbh "Aria2 Explorer")

## 💡 Tips & FAQs

[https://github.com/alexhua/aria2-explorer/issues?q=label:faq](https://github.com/alexhua/aria2-explorer/issues?q=label%3AFAQ+sort%3Acreated-asc)

## 🔒 Privacy policy

This extension just captures download tasks and related website cookies from the user's browser for the purpose of connecting to the user's Aria2 server to download the network resources. Any connection and configuration information for Aria2 will be stored locally or can be optionally uploaded to the user's logged-in cloud. This extension does not collect any personal data or network activity from the user, nor will it share any such data with 3rd parties.

## 📜 License

![BSD](https://i0.wp.com/opensource.org/wp-content/uploads/2006/07/OSI_Approved_License.png?w=90&ssl=1)

Aria2-Explorer is licensed under [BSD 3-Clause License](https://opensource.org/license/bsd-3-clause/).
