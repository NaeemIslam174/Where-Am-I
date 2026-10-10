// content/positionTracker.js — module 9: tracks scroll position and the section the user is in.

(function () {
  const THROTTLE_MS = 1000;
  let timer = null;

  // Nearest heading above the top of the viewport (the section being read).
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
    // sendMessage throws synchronously if the extension was reloaded; ignore it
    try {
      chrome.runtime.sendMessage({ action: "scrollPosition", ...snapshot() }).catch(() => {});
    } catch (e) {}
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
})();
