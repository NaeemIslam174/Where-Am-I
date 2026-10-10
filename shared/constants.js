// shared/constants.js — values both halves use (agree changes with Person 1)

export const DEFAULT_DISTRACTIONS = [
  "youtube.com",
  "reddit.com",
  "tiktok.com",
  "instagram.com",
  "x.com",
  "netflix.com",
  "facebook.com",
];

export const STORAGE_KEYS = {
  log: "sessionLog", // Person 1's session log
  settings: "settings",
};

export const DEFAULT_SETTINGS = {
  paused: false,
  distractions: DEFAULT_DISTRACTIONS,
  thresholdMs: 30 * 1000, // 30s for demo, 2 mins for real use
};
