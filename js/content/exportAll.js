
/**
 * Export all downloaded resource links
 * 
 * @param {Array} allowedExts allowed file extensions list
 * @param {Array} blockedExts blocked file extensions list
 * @returns {void}
 */
export function exportAllLinks(allowedExts, blockedExts) {
    if (!Array.isArray(allowedExts)) allowedExts = [];
    if (!Array.isArray(blockedExts)) blockedExts = [];

    const links = [];
    const elements = document.querySelectorAll("a,img,audio,video,source,enclosure");

    for (const element of elements) {
        let link = '';
        const tagName = element.tagName.toUpperCase();
        let srcProp = '';

        try {
            switch (tagName) {
                case 'A':
                    srcProp = 'href';
                    break;
                case 'ENCLOSURE':
                    srcProp = 'url';
                    break;
                default:
                    srcProp = 'src';
            }

            if (element[srcProp]) {
                link = element[srcProp];
            } else if (element.attributes[srcProp]) {
                link = element.attributes[srcProp].value;
            } else {
                continue;
            }

            const url = new URL(link);
            const filename = url.pathname.split('/').pop();
            const ext = filename.includes('.') ? filename.split('.').pop() : '';
            let valid = false;

            if (url.protocol === "magnet:" ||
                /VIDEO|AUDIO|SOURCE/.test(tagName) && url.protocol.startsWith("http")) {
                valid = true;
            } else if (/^(http|ftp|sftp)/.test(url.protocol)) {
                if (allowedExts.includes(ext) || allowedExts.includes('*')) {
                    valid = true;
                } else if (blockedExts.includes(ext) || blockedExts.includes('*')) {
                    valid = false;
                } else if (tagName === 'IMG') {
                    if (element.naturalWidth >= 400 && element.naturalHeight >= 300) {
                        valid = true;
                    }
                } else if (ext) {
                    if (/^[\da-z]{1,8}$/i.test(ext) &&
                        !/^(htm|asp|php|cgi|xml|js|css|do|\d+$)/i.test(ext)) {
                        valid = true;
                    }
                }
            }

            if (valid && !links.includes(link)) {
                links.push(link);
            }
        } catch (e) {
            console.warn("DownloadAllLinks: Invalid URL found, URL=", link);
        }
    }

    if (links.length > 0) {
        const downloadItem = {
            filename: '',
            url: links.join('\n'),
            referrer: window.location.href,
            multiTask: true
        };
        chrome.runtime.sendMessage({ type: "EXPORT_ALL", data: downloadItem });
    } else {
        setTimeout(() => {
            if (document.hasFocus()) {
                alert("\nAria2-Explorer: " + chrome.i18n.getMessage("exportAllFailedDes"));
            }
        }, 300);
    }
}

export default exportAllLinks;