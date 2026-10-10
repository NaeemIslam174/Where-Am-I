// background/index.js
import { checkForDrift } from "./driftDetector.js";
import { summarise } from "./aiSummariser.js";
import { getSettings } from "../shared/settings.js";
import { setActivityCallback } from "./tabTracker.js";
import { addEvent } from "./sessionLog.js";
import { classifyPage } from "./classifier.js";

console.log("Background loaded");

// Content scripts → log: page text (pageReader.js) and scroll/section (positionTracker.js)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || !sender.tab) return;
  if (msg.action !== "pageContent" && msg.action !== "scrollPosition") return;

  addEvent({
    type: msg.action,
    tabId: sender.tab.id,
    url: msg.url,
    title: msg.title || sender.tab.title,
    text: msg.text,
    section: msg.section,
    scroll: msg.scroll,
    time: Date.now(),
    category: classifyPage(msg.url),
  });
});

// Timeline for the drift check = tab switches and page loads only.
// Page text / section / scroll from content scripts are attached to them, so a late
// scroll message can't land between a distraction and the return and hide the drift.
function buildTimeline(events) {
  const latest = {}; // `${tabId}|${url}` → merged page details
  for (const e of events) {
    if (e.type !== "pageContent" && e.type !== "scrollPosition") continue;
    const key = `${e.tabId}|${e.url}`;
    latest[key] = {
      ...latest[key],
      ...(e.text !== undefined && { text: e.text }),
      ...(e.section !== undefined && { section: e.section }),
      ...(e.scroll !== undefined && { scroll: e.scroll }),
    };
  }

  return events
    .filter((e) => e.type === "tabSwitch" || e.type === "pageLoad")
    .map((e) => ({ ...e, ...latest[`${e.tabId}|${e.url}`] }));
}

// tabTracker.js calls this after every tab switch
setActivityCallback((events) => maybeShowCard(buildTimeline(events)));

// Runs the drift check and shows the card if the user just came back
export async function maybeShowCard(events) {
  const settings = await getSettings();
  if (settings.paused) return; // user paused tracking

  const result = checkForDrift(events, settings.thresholdMs);
  if (!result.show) return;

  const fallback = buildFallbackSummary(result.workEvents);
  const ai = await summarise(result.workEvents);
  const summary = ai ? { ...ai, scroll: fallback.scroll } : fallback;

  await sendCardToTab(result.returnEvent.tabId, summary);
}

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
