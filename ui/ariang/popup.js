chrome && chrome.tabs.getZoomSettings(zoomSettings => {
    zoomFactor = zoomSettings.defaultZoomFactor || 1;
    const element = document.getElementById('AriaNG');
    if (element && zoomFactor > 0 && zoomFactor != 1) {
        const adjustedWidth = Math.floor(element.offsetWidth / zoomFactor);
        const adjustedHeight = Math.floor(element.offsetHeight / zoomFactor);

        element.style.width = adjustedWidth + 'px';
        element.style.height = adjustedHeight + 'px';
    }
})
