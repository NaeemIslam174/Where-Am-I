// popup/popup.js
import { getSettings, saveSettings, clearHistory } from "../shared/settings.js";
import { STORAGE_KEYS } from "../shared/constants.js";

const pauseToggle = document.getElementById("pauseToggle");
const siteList = document.getElementById("siteList");
const addForm = document.getElementById("addForm");
const siteInput = document.getElementById("siteInput");
const siteError = document.getElementById("siteError");
const clearBtn = document.getElementById("clearBtn");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

let settings;

// Loads settings and draws the popup
async function init() {
  settings = await getSettings();
  render();
}

// Updates everything on screen from the current settings
async function render() {
  pauseToggle.setAttribute("aria-checked", String(settings.paused));
  renderSites();
  await renderStatus();
}

// Shows "Paused" or how many work pages are logged
async function renderStatus() {
  statusDot.classList.toggle("paused", settings.paused);
  if (settings.paused) {
    statusText.textContent = "Paused";
    return;
  }
  const stored = await chrome.storage.local.get(STORAGE_KEYS.log);
  const log = Array.isArray(stored[STORAGE_KEYS.log]) ? stored[STORAGE_KEYS.log] : [];
  const workPages = log.filter((e) => e.category === "work").length;
  statusText.textContent = workPages ? `Tracking ${workPages} work pages this session` : "Tracking";
}

// Draws one chip per distraction site
function renderSites() {
  siteList.replaceChildren();
  if (settings.distractions.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No sites yet. Add one below.";
    siteList.append(empty);
    return;
  }
  for (const site of settings.distractions) {
    const chip = document.createElement("li");
    chip.className = "chip";
    chip.textContent = site;

    const remove = document.createElement("button");
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${site}`);
    remove.addEventListener("click", () => removeSite(site));

    chip.append(remove);
    siteList.append(chip);
  }
}

// Turns "https://www.YouTube.com/watch" into "youtube.com"
function cleanSite(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

// Adds a site from the input box
async function addSite(event) {
  event.preventDefault(); // stop the form reloading the popup
  const site = cleanSite(siteInput.value);
  siteError.textContent = "";

  if (!site.includes(".")) {
    siteError.textContent = "Enter a website like reddit.com";
    return;
  }
  if (settings.distractions.includes(site)) {
    siteError.textContent = `${site} is already on the list`;
    return;
  }

  settings = await saveSettings({ distractions: [...settings.distractions, site] });
  siteInput.value = "";
  renderSites();
}

// Removes a site from the list
async function removeSite(site) {
  settings = await saveSettings({ distractions: settings.distractions.filter((s) => s !== site) });
  renderSites();
}

// Flips pause on or off
async function togglePause() {
  settings = await saveSettings({ paused: !settings.paused });
  render();
}

// Deletes the log and confirms on the button
async function onClear() {
  await clearHistory();
  clearBtn.textContent = "History cleared";
  clearBtn.disabled = true;
  await renderStatus();
  setTimeout(() => {
    clearBtn.textContent = "Clear history";
    clearBtn.disabled = false;
  }, 2000);
}

pauseToggle.addEventListener("click", togglePause);
addForm.addEventListener("submit", addSite);
clearBtn.addEventListener("click", onClear);

init();