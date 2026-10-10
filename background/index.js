// background/index.js
import { checkForDrift } from "./driftDetector.js";
import { summarise, expandPoints } from "./aiSummariser.js";
import { getRecentEvents } from "./sessionLog.js";
import { getSettings } from "../shared/settings.js";
import { setActivityCallback } from "./tabTracker.js";

console.log("Background loaded");
setActivityCallback(maybeShowCard); // tracker calls this after every event

const PENDING_EXPIRY_MS = 30 * 60 * 1000; // left-open tabs stop getting a card after 30 mins
const sameUrl = (a, b) => !!a && !!b && a.split("#")[0] === b.split("#")[0];

// Runs the drift check and shows the card if the user just came back
export async function maybeShowCard(events) {
  const settings = await getSettings();
  if (settings.paused) return; // user paused tracking

  const result = checkForDrift(events, settings.thresholdMs);
  const last = events[events.length - 1];

  if (result.show) {
    // Other work tabs left open before the distraction get their own card when clicked
    const otherTabs = [...new Set(result.workEvents.map((e) => e.tabId))].filter((id) => id !== last.tabId);
    await chrome.storage.session.set({
      pending: { tabs: otherTabs, awayMs: result.distractionMs, since: Date.now() },
    });
    // Summarise the tab they came back to; use all work only if this tab has no history (e.g. a new tab)
    const thisTab = result.workEvents.filter((e) => e.tabId === last.tabId);
    await showSummaryCard(last.tabId, thisTab.length ? thisTab : result.workEvents, result.distractionMs);
    return;
  }

  // Not a fresh return: is this a work tab that was left open before the distraction?
  if (last?.category === "work" && last.type === "tabSwitch") {
    const { pending } = await chrome.storage.session.get("pending");
    if (!pending || Date.now() - pending.since > PENDING_EXPIRY_MS) return;
    if (!pending.tabs.includes(last.tabId)) return;

    pending.tabs = pending.tabs.filter((id) => id !== last.tabId); // only once per tab
    await chrome.storage.session.set({ pending });

    const tabEvents = events.filter((e) => e.tabId === last.tabId && e.category === "work" && e.time < last.time);
    if (tabEvents.length) await showSummaryCard(last.tabId, tabEvents, pending.awayMs);
  }
}

// Gets a summary (AI or fallback) for the given work events and shows the card
async function showSummaryCard(tabId, workEvents, awayMs) {
  const fallback = buildFallbackSummary(workEvents);
  const ai = await summarise(workEvents);

  const lastWork = workEvents[workEvents.length - 1];
  const extras = {
    awayMs,
    sourceTitle: lastWork.title,
    sourceUrl: lastWork.url,
    stopQuote: lastWork.lastParagraph || "",
  };
  const summary = ai ? { ...ai, scroll: fallback.scroll, ...extras } : { ...fallback, ...extras };

  await sendCardToTab(tabId, summary);
}

// Card's "Expand points" button: more detail about one page
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action !== "expandPoints") return;

  (async () => {
    const events = await getRecentEvents(60);
    const page = [...events].reverse().find((e) => sameUrl(e.url, msg.url) && (e.readText || e.text));
    sendResponse({ points: page ? await expandPoints(page) : null });
  })().catch(() => sendResponse({ points: null }));

  return true; // reply comes later
});

// Builds a simple summary without AI, used if Gemini fails
function buildFallbackSummary(workEvents) {
  const lastWork = workEvents[workEvents.length - 1];
  const searches = workEvents
    .filter((e) => e.url && e.url.includes("google.") && e.url.includes("q="))
    .map((e) => new URL(e.url).searchParams.get("q"))
    .filter(Boolean);

  return {
    doing: `You were on "${lastWork.title}".`,
    stoppedAt: lastWork.section ? `The section "${lastWork.section}".` : "Partway through the page.",
    nextStep: searches.length
      ? `You'd last searched for "${searches[searches.length - 1]}".`
      : "Pick up where you left off.",
    scroll: typeof lastWork.scroll === "number" ? lastWork.scroll : undefined,
  };
}

// Sends the card to a tab, injecting card.js first if the tab doesn't have it
async function sendCardToTab(tabId, summary) {
  const message = { action: "showCard", ...summary };

  try {
    await chrome.tabs.sendMessage(tabId, message);
    return; // card.js was already there
  } catch {}

  try {
    // tab was opened before the extension loaded, so add card.js now
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content/card.js"] });
    await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    console.warn("Could not show card on tab", tabId, err.message); // e.g. chrome:// pages
  }
}

// TEMP: test the card flow with fake events. Remove before submitting.
self.testDrift = async function (delayMs = 3000) {
  console.log(`Switch to a web page tab — card in ${delayMs / 1000}s...`);
  await new Promise((r) => setTimeout(r, delayMs));

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab) return console.warn("No active tab found");
  console.log("Testing on:", tab.url); // should be your Wikipedia page

  const now = Date.now();
  const fakeEvents = [
    { type: "activated", tabId: tab.id, url: "https://www.google.com/search?q=causes+of+ww1",
      title: "causes of ww1 - Google Search", time: now - 300000, category: "work" },
    { type: "activated", tabId: tab.id, url: "https://en.wikipedia.org/wiki/Causes_of_World_War_I",
      title: "Causes of World War I - Wikipedia", time: now - 240000, category: "work",
      section: "Triple Entente", scroll: 2400 },
    { type: "activated", tabId: 999, url: "https://www.youtube.com/",
      title: "YouTube", time: now - 120000, category: "distraction" },
    { type: "activated", tabId: tab.id, url: tab.url, title: tab.title, time: now, category: "work" },
  ];

  await maybeShowCard(fakeEvents);
  console.log("testDrift done");
};