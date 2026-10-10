// content/card.js — the "Where Was I?" card

(function () {
  const CARD_ID = "where-was-i-card-host";
  const AUTO_FADE_MS = 15000; // card disappears after 15s

  const STYLES = `
    .card {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 320px;
      box-sizing: border-box;
      overflow: hidden;
      background: linear-gradient(180deg, #e4e4e4 0%, #c6c6c6 100%);
      color: #2b2b2b;
      border: 4px solid #f4f4f4;
      border-radius: 24px;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25);
      padding: 22px 22px 20px;
      font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
      font-size: 14px;
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
      opacity: 0.07;
      pointer-events: none;
    }
    .card > * { position: relative; } /* keep content above the pattern */
    .card.show { opacity: 1; transform: translateY(0); }
    .header { text-align: center; margin-bottom: 14px; }
    .title { font-weight: 700; font-size: 24px; color: #3a3a3a; letter-spacing: -0.01em; }
    .close {
      position: absolute;
      top: -10px;
      right: -10px;
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
      margin: 8px 0;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.55);
      border-radius: 12px;
    }
    .label { font-weight: 700; color: #5a5a5a; font-size: 12px; margin-bottom: 2px; }
    .actions { margin-top: 14px; display: flex; gap: 8px; }
    .btn { border: none; border-radius: 12px; height: 38px; padding: 0 16px; cursor: pointer; font-size: 14px; font-weight: 600; font-family: inherit; }
    .primary { flex: 1; background: #3a3a3a; color: #fff; }
    .primary:hover { background: #2b2b2b; }
    .secondary { background: rgba(255, 255, 255, 0.7); color: #3a3a3a; }
    .secondary:hover { background: #fff; }
    button:focus-visible { outline: 2px solid #3a3a3a; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
  `;

  // Removes the card if it's on the page
  function removeCard() {
    const existing = document.getElementById(CARD_ID);
    if (existing) existing.remove();
  }

  // Draws the card with the given summary
  function showCard({ doing, stoppedAt, nextStep, scroll }) {
    removeCard();

    const host = document.createElement("div");
    host.id = CARD_ID;
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = STYLES;

    const card = document.createElement("div");
    card.className = "card";
    card.style.setProperty("--pattern", `url(${chrome.runtime.getURL("assets/question-marks.jpg")})`);
    card.innerHTML = `
      <div class="header">
        <span class="title">Where Was I?</span>
        <button class="close" aria-label="Dismiss">×</button>
      </div>
      <div class="row"><div class="label">You were</div><div class="doing"></div></div>
      <div class="row"><div class="label">You stopped at</div><div class="stopped"></div></div>
      <div class="row"><div class="label">Next step</div><div class="next"></div></div>
      <div class="actions">
        <button class="btn primary jump">Jump back</button>
        <button class="btn secondary dismiss">Got it</button>
      </div>
    `;

    // textContent, not innerHTML, so AI text can't inject HTML
    card.querySelector(".doing").textContent = doing || "";
    card.querySelector(".stopped").textContent = stoppedAt || "";
    card.querySelector(".next").textContent = nextStep || "";

    const jumpBtn = card.querySelector(".jump");
    if (typeof scroll === "number") {
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
      scroll: 0,
    });
  });
})();