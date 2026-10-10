import { addEvent } from "./sessionLog.js";


chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);

        await addEvent({
            type: "tabSwitch",
            tabId: tab.id,
            url: tab.url,
            title: tab.title,
            time: Date.now()
        });

        console.log("Tab switch saved:", tab.title);
    } catch (error) {
        console.error("Failed to save tab switch:", error);
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        await addEvent({
            type: "pageLoad",
            tabId: tabId,
            url: tab.url,
            title: tab.title,
            time: Date.now()
        });

        console.log("Page load saved:", tab.url);
    }
});


chrome.windows.onFocusChanged.addListener(async (windowId) => {
    await addEvent({
        type: "windowFocus",
        windowId: windowId,
        time: Date.now()
    });

    console.log("Window focus saved:", windowId);
});
