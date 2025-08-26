chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install" || details.reason === "update") {
        chrome.tabs.create({
            url: chrome.runtime.getURL(`src/html/instructions.html?version=${details.previousVersion}`)
        });
    }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "openExtensionPage") {
      chrome.tabs.create({
          url: chrome.runtime.getURL("src/html/index.html")
      });
  }
});

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
        url: chrome.runtime.getURL("src/html/index.html")
    });
});
