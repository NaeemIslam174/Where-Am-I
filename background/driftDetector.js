// background/driftDetector.js

export const DEFAULT_THRESHOLD_MS = 30 * 1000; // 30s for demo, 2 mins for real use

// Checks if the user just came back to work after being distracted
export function checkForDrift(events, thresholdMs = DEFAULT_THRESHOLD_MS) {
  if (!events || events.length < 3) return { show: false };

  const last = events[events.length - 1];
  if (last.category !== "work") return { show: false }; // still distracted

  const { firstDistraction, index } = findDistractionRun(events);
  if (!firstDistraction) return { show: false }; // never left work

  const workEvents = getWorkBefore(events, index);
  if (workEvents.length === 0) return { show: false }; // nothing to summarise

  const timeAway = last.time - firstDistraction.time;
  if (timeAway < thresholdMs) return { show: false }; // too quick, ignore

  return { show: true, returnEvent: last, distractionMs: timeAway, workEvents };
}

// Goes back from the newest event and finds where the distraction started
function findDistractionRun(events) {
  let i = events.length - 2;
  let firstDistraction = null;

  while (i >= 0 && events[i].category === "distraction") {
    firstDistraction = events[i];
    i--;
  }

  return { firstDistraction, index: i };
}

// Gets all the work events up to the given index
function getWorkBefore(events, index) {
  return events.slice(0, index + 1).filter((e) => e.category === "work");
}