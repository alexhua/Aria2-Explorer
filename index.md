# Aria2 Explorer

<h1 style="position:absolute; top: 14px; right:14px"><a href="index.cn.html">[中文]</a></h1>

**Aria2 Explorer** is a download tool based on [**Aria2**](https://github.com/aria2/aria2), which could export URLs from browser to **Aria2** to complete downloads and support for **HTTP/HTTPS/FTP/SFTP/BT/Magnet** protocols.

Meanwhile, imports [AriaNG](https://www.github.com/mayswind/AriaNg/) as a built-in management frontend. 

Task management online: [https://ui.aria2e.com](https://ui.aria2e.com)

## 📑How to use

Procedures:

1. For Windows, please download <span style="vertical-align:middle;">[![Download Aria2 Manager](https://img.shields.io/github/downloads/alexhua/aria2-manager/total?color=blue&label=Aria2%20Manager )](https://github.com/alexhua/aria2-manager/ "Goto Aria2-Manager homepage for more details")</span>. Other platform, please download Aria2 utility: <span style="vertical-align:middle;">[![Download Aria2](https://img.shields.io/github/downloads/aria2/aria2/total?color=blue&label=Aria2)](https://github.com/aria2/aria2/releases "Goto Aria2 download page")</span>
2. For Windows, please run **Aria2Manager.exe**. Other platform, please run Aria2 in the **Terminal** with typing `aria2c --enable-rpc`.
3. Install **Aria2 Explorer** from [Web Store](#-installation).
4. Enable `auto-capture` on the extension options page and configure others as you need.

After completing these steps, the extension will take over the download process, leading you to a high-speed download experience. 

## ⭐ Features

1. Auto capture browser download tasks
    - Capture notification
    - Support magnet links
    - Toggle auto-capture by shortcut (Default: <kbd>Alt</kbd>+<kbd>A</kbd>)
    - Set all Aria2 options manually before download
    - Filter task by the domain, file extensions or file sizes
    > Filter priority: domain > file-ext > file-size, allow-list > block-list
2. Auto-select Aria2 RPC server by matching the preset download URL pattern

3. Built-in Aria2 frontend: AriaNG **enhanced version**, multiple present styles: popup, new tab, new window, PWA

4. Synchronize and store all settings on the cloud

5. Support for zh-CN/zh-TW/en languages

6. Monitor Aria2 download status via icon badge

7. Support batch exporting webpage resources (Image·Audio·Video·Magnet) links from context menu

8. Receive download requests from other extensions

9. Support shortcuts in the options page (Save:<kbd>Alt</kbd>+<kbd>S</kbd> Reset:<kbd>Alt</kbd>+<kbd>R</kbd> Download:<kbd>Alt</kbd>+<kbd>J</kbd> Upload:<kbd>Alt</kbd>+<kbd>U</kbd>)

10. Support downloading URL via browser

## 🧩 Integration

Allow other extensions to use this extension as middleware to download files with Aria2.

```js

const downloadItem = {
    url: "https://sample.com/image.jpg", // multiple urls should be split by \n
    filename: "image_from_sample.jpg",
    referrer: "https://sample.com",
    options: { 
        split: "10", // aria2 RPC options here
        xxxxx: "oooo"
    }
}

chrome.runtime.sendMessage(`Aria2-Explorer extension ID`, downloadItem)

```

## 💡 Tips & FAQs

[https://github.com/alexhua/aria2-explorer/issues?q=label:FAQ](https://github.com/alexhua/aria2-explorer/issues?q=label%3AFAQ)

## 📥 Installation

[<img src="https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/iNEddTyWiMfLSwFD6qGq.png" style="box-shadow: 1px 1px 1px #888;border-radius:8px" height="55">](https://chrome.google.com/webstore/detail/mpkodccbngfoacfalldjimigbofkhgjn "Install Aria2-Explorer from Chrome Web Store")
[<img src="https://get.microsoft.com/images/en-us%20light.svg" height="56" >](https://microsoftedge.microsoft.com/addons/detail/jjfgljkjddpcpfapejfkelkbjbehagbh "Install Aria2-Explorer from Edge Web Store")

---

# Aria2 Manager

**Aria2 Manager** Enhanced version has been delivered to Microsoft Store

## ⭐ Enhanced features
- 🔄️ Support for enabling startup on boot
- 👆 One-click installation and automatic update
- 🫷 Suppress task notification on Aria2 startup
- 🛠️ Some Aria2 bug fixes
- 🧼 Support for removing download file(s) (Remove .aria2 control file when remove task, remove download file(s) with Shift, needs Aria2 Explorer v2.4.0+)

The enhanced version will always keep the Aria2 binary latest and update BT tracker list opportunistically. Also, there will be more features in the future.

## 📥 Installation
[<img src="https://get.microsoft.com/images/en-us%20light.svg" height="56"/>](https://apps.microsoft.com/detail/Aria2%20Manager/9P5WQ68Q20WV?launch=true&cid=aria2e "Install Aria2-Manager from Microsoft Store")

## 💡 Tips & FAQs

[https://github.com/alexhua/aria2-manager/issues?q=label:FAQ](https://github.com/alexhua/aria2-manager/issues?q=label%3AFAQ)

---

## 🔒 Privacy policy

**Aria2 Explorer** just captures download tasks and related website cookies from the user's browser for the purpose of connecting to the user's Aria2 server to download the network resources. Any connection and configuration information for Aria2 will be stored locally or can be optionally uploaded to the user's logged-in cloud. This download solution does not collect any personal data or network activity from the user, nor will it share any such data with 3rd parties.

## 📜 License

![BSD](https://i0.wp.com/opensource.org/wp-content/uploads/2006/07/OSI_Approved_License.png?w=90&ssl=1)

**Aria2 Explorer** is licensed under [BSD 3-Clause License](https://opensource.org/license/bsd-3-clause/).
