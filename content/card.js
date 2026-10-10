// content/card.js — the "Where Was I?" card

(function () {
  const CARD_ID = "where-was-i-card-host";
  const AUTO_FADE_MS = 15000; // card disappears after 15s

  const STYLES = `
    .card {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 261px;
      min-height: 340px; /* grows if the AI text is long */
      box-sizing: border-box;
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      overflow: hidden;
      background: linear-gradient(180deg, #fff 0%, #999 100%);
      color: #2b2b2b;
      border: 2px solid #fff;
      border-radius: 16px;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
      font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      z-index: 2147483647;
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .card::before { /* faint question mark pattern */
      content: "";
      position: absolute;
      inset: 0;
      background-image: var(--pattern);
      background-size: 260px auto;
      opacity: 0.1;
      mix-blend-mode: multiply; /* only the dark marks show, white parts disappear */
      pointer-events: none;
    }
    .card > * { position: relative; } /* keep content above the pattern */
    .card.show { opacity: 1; transform: translateY(0); }
    .header { width: 100%; text-align: center; padding-top: 6px; }
    .title { font-weight: 700; font-size: 22px; color: #3a3a3a; letter-spacing: -0.01em; }
    .away { display: block; font-size: 12px; color: #5a5a5a; margin-top: 2px; }
    .points { margin: 2px 0 0; padding-left: 18px; }
    .points li { margin: 2px 0; }
    .quote { margin-top: 4px; font-style: italic; color: #4a4a4a; font-size: 12px; border-left: 3px solid #8a8a8a; padding-left: 8px; }
    .source { color: #2b2b2b; font-weight: 600; text-decoration: underline; word-break: break-word; }
    .close {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 50%;
      background: transparent;
      font-size: 20px;
      color: #555;
      cursor: pointer;
    }
    .close:hover { background: rgba(255, 255, 255, 0.5); }
    .row {
      width: 100%;
      box-sizing: border-box;
      margin: 0;
      padding: 8px 10px;
      background: rgba(255, 255, 255, 0.55);
      border-radius: 12px;
    }
    .label { font-weight: 700; color: #5a5a5a; font-size: 12px; margin-bottom: 2px; }
    .actions { width: 100%; margin-top: auto; display: flex; gap: 8px; } /* buttons sit at the bottom */
    .btn { border: none; border-radius: 10px; height: 36px; padding: 0 14px; cursor: pointer; font-size: 14px; font-weight: 600; font-family: inherit; }
    .primary { flex: 1; background: #3a3a3a; color: #fff; }
    .primary:hover { background: #2b2b2b; }
    .secondary { background: rgba(255, 255, 255, 0.7); color: #3a3a3a; }
    .secondary:hover { background: #fff; }
    button:focus-visible { outline: 2px solid #3a3a3a; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
  `;

  // Turns milliseconds into "45 seconds" or "4 minutes"
  function formatAway(ms) {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.round(seconds / 60);
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }

  // Removes the card if it's on the page
  function removeCard() {
    const existing = document.getElementById(CARD_ID);
    if (existing) existing.remove();
  }

  // Draws the card with the given summary
  function showCard({ doing, stoppedAt, nextStep, scroll, awayMs, keyPoints, sourceTitle, sourceUrl, stopQuote }) {
    removeCard();

    const host = document.createElement("div");
    host.id = CARD_ID;
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = STYLES;

    const card = document.createElement("div");
    card.className = "card";
    card.style.setProperty("--pattern", `url(${chrome.runtime.getURL("assets/QuestionMarks.jpg")})`);
    card.innerHTML = `
      <div class="header">
        <span class="title">Where Was I?</span>
        <span class="away"></span>
        <button class="close" aria-label="Dismiss">×</button>
      </div>
      <div class="row"><div class="label">You were</div><div class="doing"></div></div>
      <div class="row"><div class="label">You stopped at</div><div class="stopped"></div><div class="quote"></div></div>
      <div class="row key-row"><div class="label">Key points</div><ul class="points"></ul></div>
      <div class="row"><div class="label">Next step</div><div class="next"></div></div>
      <div class="row source-row"><div class="label">Page</div><a class="source"></a></div>
      <div class="actions">
        <button class="btn primary jump">Jump back</button>
        <button class="btn secondary dismiss">Got it</button>
      </div>
    `;

    // textContent, not innerHTML, so AI text can't inject HTML
    card.querySelector(".doing").textContent = doing || "";
    card.querySelector(".stopped").textContent = stoppedAt || "";
    card.querySelector(".next").textContent = nextStep || "";

    // Exact spot they stopped, as a short quote
    const quote = card.querySelector(".quote");
    if (stopQuote) quote.textContent = `"${stopQuote.length > 140 ? stopQuote.slice(0, 140) + "…" : stopQuote}"`;
    else quote.remove();

    // Time away under the title
    const away = card.querySelector(".away");
    if (typeof awayMs === "number") away.textContent = `Welcome back, you were away ${formatAway(awayMs)}`;
    else away.remove();

    // Key points (AI only)
    const points = card.querySelector(".points");
    if (Array.isArray(keyPoints) && keyPoints.length) {
      for (const point of keyPoints) {
        const li = document.createElement("li");
        li.textContent = point;
        points.append(li);
      }
    } else {
      card.querySelector(".key-row").remove();
    }

    // Link to the page they were on, only if it's a different page from this one
    const samePage = !sourceUrl || sourceUrl.split("#")[0] === location.href.split("#")[0];
    const source = card.querySelector(".source");
    if (!samePage) {
      source.textContent = sourceTitle || sourceUrl;
      source.href = sourceUrl;
    } else {
      card.querySelector(".source-row").remove();
    }

    const jumpBtn = card.querySelector(".jump");
    if (!samePage) {
      jumpBtn.textContent = "Go back";
      jumpBtn.addEventListener("click", () => { location.href = sourceUrl; });
    } else if (typeof scroll === "number") {
      jumpBtn.addEventListener("click", () => {
        window.scrollTo({ top: scroll, behavior: "smooth" });
        removeCard();
      });
    } else {
      jumpBtn.remove();
    }

    card.querySelector(".close").addEventListener("click", removeCard);
    card.querySelector(".dismiss").addEventListener("click", removeCard);

    shadow.append(style, card);
    document.documentElement.appendChild(host);

    requestAnimationFrame(() => card.classList.add("show"));

    let fadeTimer = setTimeout(removeCard, AUTO_FADE_MS);
    card.addEventListener("mouseenter", () => clearTimeout(fadeTimer));
    card.addEventListener("mouseleave", () => {
      fadeTimer = setTimeout(removeCard, AUTO_FADE_MS);
    });
  }

  // Listens for showCard from the background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.action === "showCard") showCard(msg);
  });

  // TEMP: run window.dispatchEvent(new Event("where-was-i-test")) in the page console
  window.addEventListener("where-was-i-test", () => {
    showCard({
      doing: "Researching the causes of WW1 for your essay.",
      stoppedAt: "The section on the Triple Entente.",
      nextStep: "Look into the July Crisis.",
      keyPoints: ["The Entente linked France, Russia and Britain.", "It was not a formal military alliance."],
      awayMs: 240000,
      stopQuote: "The Entente grew from the Franco-Russian Alliance of 1894 and the Entente Cordiale of 1904.",
      scroll: 0,
    });
  });
})();