let writeQueue = Promise.resolve();

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