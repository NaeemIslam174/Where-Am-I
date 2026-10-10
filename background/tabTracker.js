import { addEvent, getRecentEvents, updateLatestForTab } from "./sessionLog.js";
import { classifyPage } from "./classifier.js";
import { getSettings } from "../shared/settings.js";

let onActivityLogged = null;
const pageData = new Map(); // tabId -> latest { url, text, section, scroll } from content scripts
const sameUrl = (a, b) => !!a && !!b && a.split("#")[0] === b.split("#")[0];

export function setActivityCallback(callback) {
    onActivityLogged = callback;
}

async function notifyActivity() {
    if (!onActivityLogged) return;

    const events = await getRecentEvents(30);
    await onActivityLogged(events);
}

// Saves one page event (skips chrome:// pages and anything while paused)
async function logPage(type, tab) {
    const settings = await getSettings();
    if (settings.paused) return;

    const category = classifyPage(tab.url, settings.distractions);
    if (category === "other") return;

    const extra = pageData.get(tab.id);
    const details = extra && sameUrl(extra.url, tab.url)
        ? { text: extra.text, section: extra.section, scroll: extra.scroll,
            lastParagraph: extra.lastParagraph, readText: extra.readText }
        : {};

    await addEvent({
        type,
        tabId: tab.id,
        url: tab.url,
        title: tab.title,
        time: Date.now(),
        category,
        ...details
    });

    console.log(`${type} saved:`, tab.title, category);
    await notifyActivity();
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        await logPage("tabSwitch", tab);
    } catch (error) {
        console.error("Failed to save tab switch:", error);
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab.active) return; // only the tab the user is looking at

    try {
        await logPage("pageLoad", tab);
    } catch (error) {
        console.error("Failed to save page load:", error);
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

// Page details from pageReader.js and positionTracker.js
chrome.runtime.onMessage.addListener((msg, sender) => {
    const tabId = sender.tab?.id;
    if (tabId === undefined || !msg?.url) return;

    let fields;
    if (msg.action === "scrollPosition") {
        fields = { scroll: msg.scroll, section: msg.section, lastParagraph: msg.lastParagraph, readText: msg.readText };
    }
    else if (msg.action === "pageContent") fields = { text: msg.text };
    else return;

    const previous = pageData.get(tabId);
    const base = previous && sameUrl(previous.url, msg.url) ? previous : {};
    pageData.set(tabId, { ...base, ...fields, url: msg.url });

    updateLatestForTab(tabId, msg.url, fields);
});