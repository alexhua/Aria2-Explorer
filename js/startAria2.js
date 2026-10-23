import Logger from "./logger.js";

const SCHEME_ARIA2_START = "aria2://start/";
const PROMOTION_DES = "Aria2ManagerPromotionDes";
const PROMOTION_PAGE = chrome.runtime.getURL('ui/ariang/index.html') + "#!recommend?path=/posts/3#usage";
const TIMEOUT = 800 // timeout for scheme URL invoke （unit:ms）

var focused = true;
var confirmed = false;

window.addEventListener('blur', function () {
    focused = false;
    Logger.log('Web page is blurred');
    chrome.runtime.sendMessage({ type: 'QUERY_WINDOW_STATE', data: chrome.windows.WINDOW_ID_CURRENT }).then(
        (response) => {
            if (response && response.data) {
                let currentWindow = response.data;
                Logger.log('Current window = %d, focus =', currentWindow.id, currentWindow.focused);
                if (!currentWindow.focused) {
                    Logger.log('Chrome is blurred, Web page will close.');
                    window.close();
                }
            }
        }
    )
});

window.addEventListener('focus', function () {
    focused = true;
    Logger.log('Web page is focused, if not confirmed, it will close. confirmed = ', confirmed);
    !confirmed && window.close();
});

window.location.href = SCHEME_ARIA2_START;

setTimeout(() => {
    if (focused) {
        let des = chrome.i18n.getMessage(PROMOTION_DES) || PROMOTION_DES;
        if (confirm(des)) {
            confirmed = true;
            window.location.href = PROMOTION_PAGE;
        } else {
            Logger.log('Promotion is canceled, web page will close.')
            window.close();
        }
    }
}, TIMEOUT);

