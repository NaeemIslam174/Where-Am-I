// content/pageReader.js — module 8: extracts the main text and title of the page.
// Uses Readability.js (loaded before this script, see manifest.json).

(function () {
  const MAX_CHARS = 4000; // keep the AI prompt small
  const SEND_DELAY_MS = 1500; // let SPAs finish rendering

  function readPage() {
    let title = document.title || "";
    let text = "";

    try {
      // Readability mutates the DOM it is given, so always work on a clone.
      const article = new Readability(document.cloneNode(true)).parse();
      if (article) {
        title = article.title || title;
        text = article.textContent || "";
      }
    } catch (e) {
      // fall through to the plain-text fallback
    }

    if (!text) text = (document.body && document.body.innerText) || "";

    text = text.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
    return { url: location.href, title, text };
  }

  function sendPage() {
    const page = readPage();
    // sendMessage throws synchronously if the extension was reloaded; ignore it
    try {
      chrome.runtime.sendMessage({ action: "pageContent", ...page }).catch(() => {});
    } catch (e) {}
  }

  // Content → background: { action: "pageContent", url, title, text }
  setTimeout(sendPage, SEND_DELAY_MS);

  // Background can also ask for a fresh read: { action: "readPage" }
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.action === "readPage") sendResponse(readPage());
  });
})();
