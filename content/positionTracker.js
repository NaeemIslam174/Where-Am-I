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

  // After the extension is reloaded, old copies of this script lose their connection.
  // Detect that and stop quietly instead of throwing on every scroll.
  function alive() {
    try {
      return !!(chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function shutDown() {
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVisibility);
  }

  function send() {
    timer = null;
    if (!alive()) return shutDown();
    try {
      chrome.runtime.sendMessage({ action: "scrollPosition", ...snapshot() }).catch(() => {});
    } catch (e) {
      shutDown();
    }
  }

  function onScroll() {
    if (!timer) timer = setTimeout(send, THROTTLE_MS);
  }

  function onVisibility() {
    if (document.visibilityState === "hidden") send();
  }

  // Content → background: { action: "scrollPosition", url, scroll, section }
  window.addEventListener("scroll", onScroll, { passive: true });

  // Send once when the user leaves the tab so the last position is never lost.
  document.addEventListener("visibilitychange", onVisibility);
})();
