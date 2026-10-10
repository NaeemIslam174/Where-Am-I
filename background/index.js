// background/index.js
import { checkForDrift } from "./driftDetector.js";
import { summarise } from "./aiSummariser.js";

console.log("Background loaded");

// Runs the drift check and shows the card if the user just came back
export async function maybeShowCard(events) {
  const result = checkForDrift(events);
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