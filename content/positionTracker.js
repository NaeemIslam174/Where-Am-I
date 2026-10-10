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

  function snapshot() {
    return {
      url: location.href,
      scroll: Math.round(window.scrollY),
      section: currentSection(),
    };
  }

  function send() {
    timer = null;
    if (!chrome.runtime?.id) return; // extension was reloaded; this old page can't send
    try {
      chrome.runtime.sendMessage({ action: "scrollPosition", ...snapshot() }).catch(() => {});
    } catch {} // extension was reloaded; ignore
  }

  // Content → background: { action: "scrollPosition", url, scroll, section }
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