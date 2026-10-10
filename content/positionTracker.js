// content/positionTracker.js — module 9: tracks scroll position and the section the user is in.

(function () {
  const THROTTLE_MS = 1000;
  let timer = null;

  // Last heading in the top 30% of the screen or above it (the section being read).
  function currentSection() {
    const headings = document.querySelectorAll("h1, h2, h3, h4");
    let section = "";
    for (const h of headings) {
      if (h.getBoundingClientRect().top > window.innerHeight * 0.3) break;
      const t = h.textContent.replace(/\s+/g, " ").trim();
      if (t) section = t;
    }
    return section.slice(0, 120);
  }

  const BLOCKS = "p, li, h1, h2, h3, h4, blockquote, pre, td";
  const SCREENS_BACK = 3; // how far up to read from where they stopped
  const MAX_READ_CHARS = 3000;

  // The paragraph at the top of the screen: exactly where they stopped
  function lastParagraph() {
    for (const el of document.querySelectorAll(BLOCKS)) {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.height > 0) {
        const t = el.textContent.replace(/\s+/g, " ").trim();
        if (t.length > 20) return t.slice(0, 300);
      }
    }
    return "";
  }

  // Text from 3 screens above the current view down to the bottom of the screen
  function recentlyReadText() {
    const from = window.scrollY - SCREENS_BACK * window.innerHeight;
    const to = window.scrollY + window.innerHeight;
    const parts = [];
    for (const el of document.querySelectorAll(BLOCKS)) {
      if (el.closest("nav, header, footer, aside")) continue; // skip menus
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      if (r.height === 0 || top < from || top > to) continue;
      const t = el.textContent.replace(/\s+/g, " ").trim();
      if (t) parts.push(t);
    }
    return parts.join("\n").slice(-MAX_READ_CHARS); // keep the part nearest where they stopped
  }

  function snapshot() {
    return {
      url: location.href,
      scroll: Math.round(window.scrollY),
      section: currentSection(),
      lastParagraph: lastParagraph(),
      readText: recentlyReadText(),
    };
  }

  function send() {
    timer = null;
    if (!chrome.runtime?.id) return; // extension was reloaded; this old page can't send
    try {
      chrome.runtime.sendMessage({ action: "scrollPosition", ...snapshot() }).catch(() => {});
    } catch {} // extension was reloaded; ignore
  }

  // Content → background: { action: "scrollPosition", url, scroll, section, lastParagraph, readText }
  window.addEventListener(
    "scroll",
    () => {
      if (!timer) timer = setTimeout(send, THROTTLE_MS);
    },
    { passive: true }
  );

  // Send once when the user leaves the tab so the last position is never lost.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") send();
  });

  send(); // send once on load, in case the user never scrolls
})();