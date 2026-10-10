let writeQueue = Promise.resolve();

const MAX_TEXT_CHARS = 1500; // keeps storage small
const sameUrl = (a, b) => !!a && !!b && a.split("#")[0] === b.split("#")[0];

export function addEvent(event) {
    const operation = writeQueue.then(async () => {
        const { events = [] } = await chrome.storage.local.get("events");

        events.push(event);

        await chrome.storage.local.set({ events });
    });

    writeQueue = operation.catch((error) => {
        console.error("Failed to store event:", error);
    });

    return operation;
}

// Adds page details (text, section, scroll) to the latest event for that tab and page
export function updateLatestForTab(tabId, url, fields) {
    const operation = writeQueue.then(async () => {
        const { events = [] } = await chrome.storage.local.get("events");

        for (let i = events.length - 1; i >= 0; i--) {
            if (events[i].tabId !== tabId) continue;
            if (!sameUrl(events[i].url, url)) return; // tab has moved on to another page

            for (const [key, value] of Object.entries(fields)) {
                if (value === undefined) continue;
                events[i][key] = key === "text" ? String(value).slice(0, MAX_TEXT_CHARS) : value;
            }
            await chrome.storage.local.set({ events });
            return;
        }
    });

    writeQueue = operation.catch(error => {
        console.error("Failed to update event:", error);
    });

    return operation;
}

export async function getRecentWork(minutes) {
    await writeQueue;

    const { events = [] } = await chrome.storage.local.get("events");

    const cutoff = Date.now() - minutes * 60 * 1000;

    return events.filter(event =>
        event.time >= cutoff &&
        event.category === "work"
    );
}

export async function clearOld() {
    const operation = writeQueue.then(async () => {
        const { events = [] } = await chrome.storage.local.get("events");

        const cutoff = Date.now() - 24 * 60 * 60 * 1000;

        const recentEvents = events.filter(event =>
            event.time >= cutoff
        );

        await chrome.storage.local.set({ events: recentEvents });
    });

    writeQueue = operation.catch(error => {
        console.error("Failed to clear old events:", error);
    });

    return operation;
}

export async function getRecentEvents(minutes = 30) {
    await writeQueue;

    const { events = [] } = await chrome.storage.local.get("events");

    const cutoff = Date.now() - minutes * 60 * 1000;

    return events
        .filter(event =>
            event.time >= cutoff &&
            (event.category === "work" || event.category === "distraction")
        )
        .sort((a, b) => a.time - b.time);
}