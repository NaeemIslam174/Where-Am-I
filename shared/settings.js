// shared/settings.js
import { STORAGE_KEYS, DEFAULT_SETTINGS } from "./constants.js";

// Gets saved settings, filling in defaults for anything missing
export async function getSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.settings] || {}) };
}

// Saves only the settings that changed and returns the full set
export async function saveSettings(changes) {
  const next = { ...(await getSettings()), ...changes };
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
  return next;
}

// Deletes the session log
export async function clearHistory() {
  await chrome.storage.local.remove(STORAGE_KEYS.log);
}