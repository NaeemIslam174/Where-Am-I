import { addEvent, getRecentEvents } from "./sessionLog.js";
import { classifyPage } from "./classifier.js";

let onActivityLogged = null;

export function setActivityCallback(callback) {
    onActivityLogged = callback;
}

async function notifyActivity() {
    if (!onActivityLogged) return;

    const events = await getRecentEvents(30);
    await onActivityLogged(events);
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);

        await addEvent({
            type: "tabSwitch",
            tabId: tab.id,
            url: tab.url,
            title: tab.title,
            time: Date.now(),
            category: classifyPage(tab.url)
        });

        await notifyActivity();

        console.log("Tab switch saved:", tab.title, classifyPage(tab.url));
    } catch (error) {
        console.error("Failed to save tab switch:", error);
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        try {
            await addEvent({
                type: "pageLoad",
                tabId: tabId,
                url: tab.url,
                title: tab.title,
                time: Date.now(),
                category: classifyPage(tab.url)
            });


            console.log("Page load saved:", tab.url);
        } catch (error) {
            console.error("Failed to save page load:", error);
        }
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
