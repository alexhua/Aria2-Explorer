chrome.storage.local.get().then(configs => {
    let darkMode = configs.colorModeId === 1;
    if (configs.colorModeId === 2 && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        darkMode = true;
    }
    if (darkMode) {
        document.documentElement.classList.add('dark-mode');
    }
})