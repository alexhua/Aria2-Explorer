// get bdpanDownload setting
chrome.storage.local.get('bdpanDownload', function({bdpanDownload}) {
  if (bdpanDownload === undefined) {
    // set default
    bdpanDownload = true;
    chrome.storage.local.set({bdpanDownload: bdpanDownload});
  }
  // inject
  if (bdpanDownload) {
    const actualCode = "Object.defineProperty(navigator,'platform',{get:function(){return 'Android';}});";
    let s = document.createElement('script');
    s.textContent = actualCode;
    document.documentElement.appendChild(s);
  }
});