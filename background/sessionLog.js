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