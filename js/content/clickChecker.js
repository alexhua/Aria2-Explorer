document.addEventListener('click', (event) => {
    chrome.runtime.sendMessage({
        type: "CLICK_EVENT",
        data: { altKeyPressed: event.altKey }
    });
});