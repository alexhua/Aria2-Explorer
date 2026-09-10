// Track configurations
const configs = {
    integration: false,
    captureMagnet: false,
    checkClick: false
};

// Initialize settings from storage
chrome.storage.local.get(['integration', 'captureMagnet', 'checkClick']).then((res) => {
    Object.assign(configs, res);
});

// Keep settings in sync
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        for (const [key, { newValue }] of Object.entries(changes)) {
            if (key in configs) {
                configs[key] = newValue;
            }
        }
    }
});

/**
 * Extract magnet URL from click event target or its ancestors
 *
 * @param {MouseEvent} event
 * @returns {string|null}
 */
function getMagnetUrl(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    for (const el of path) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) continue;
        const href = el.getAttribute?.('href') || (typeof el.href === 'string' ? el.href : el.href?.baseVal);
        if (href && /^magnet:/i.test(href.trim())) {
            return href.trim();
        }
    }
    const anchor = event.target?.closest ? event.target.closest('a[href], area[href]') : null;
    if (anchor) {
        const href = anchor.getAttribute('href') || (typeof anchor.href === 'string' ? anchor.href : anchor.href?.baseVal);
        if (href && /^magnet:/i.test(href.trim())) {
            return href.trim();
        }
    }
    return null;
}

document.addEventListener('click', (event) => {
    if (configs.checkClick) {
        chrome.runtime.sendMessage({
            type: "CLICK_EVENT",
            data: { altKeyPressed: event.altKey }
        }).catch(() => { });
    }

    const magnetUrl = getMagnetUrl(event);
    if (magnetUrl && configs.integration && configs.captureMagnet) {
        if (configs.checkClick && event.altKey) {
            // Bypass capture when Alt key is pressed
            return;
        }
        event.preventDefault();
        event.stopPropagation();

        chrome.runtime.sendMessage({
            type: "DOWNLOAD",
            data: {
                url: magnetUrl,
                filename: '',
                referrer: window.location.href
            }
        }).catch(() => { });
    }
}, true);