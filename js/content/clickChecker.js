document.addEventListener('click', (event) => {
    if (event.altKey) {
        chrome.runtime.sendMessage({
            type: "ALT_KEY_EVENT",
            data: { pressed: true }
        });
    }
});