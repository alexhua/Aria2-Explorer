/**
 * Click Checker — ISOLATED world content script
 * Handles Alt+Click state reporting and magnet link click interception.
 */
(() => {
    'use strict';

    let captureMagnet = false;
    let checkClick = false;

    function updateConfig(config) {
        captureMagnet = Boolean(config?.captureMagnet);
        checkClick = Boolean((config?.integration !== false) && config?.checkClick);
    }

    // Load initial configuration from storage
    chrome.storage.local.get(['captureMagnet', 'checkClick', 'integration'], (config) => {
        updateConfig(config);
    });

    // Listen for real-time config updates
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if ('captureMagnet' in changes || 'checkClick' in changes || 'integration' in changes) {
            chrome.storage.local.get(['captureMagnet', 'checkClick', 'integration'], (config) => {
                updateConfig(config);
            });
        }
    });

    // Intercept click in the capture phase to precede host page handlers
    document.addEventListener('click', (event) => {
        if (captureMagnet) {
            const anchor = event.target.closest?.('a[href]');
            if (anchor) {
                const href = (anchor.getAttribute('href') || anchor.href || '').trim();
                if (/^magnet:/i.test(href)) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    chrome.runtime.sendMessage({
                        type: "DOWNLOAD",
                        data: { filename: '', url: anchor.href || href }
                    });
                    return;
                }
            }
        }

        if (checkClick) {
            chrome.runtime.sendMessage({
                type: "CLICK_EVENT",
                data: { altKeyPressed: event.altKey }
            });
        }
    }, true);
})();
