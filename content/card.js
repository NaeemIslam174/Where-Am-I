// content/card.js — the "Where Was I?" card
// Styles live inside the Shadow DOM so website CSS can't break the card.

(function () {
  const CARD_ID = "where-was-i-card-host";
  const AUTO_FADE_MS = 15000;

  const STYLES = `
    .card {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 320px;
      background: #ffffff;
      color: #1a1a2e;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      padding: 16px 18px;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      z-index: 2147483647;
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .card.show { opacity: 1; transform: translateY(0); }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .title { font-weight: 700; font-size: 15px; color: #1f2a6b; }
    .close { background: none; border: none; font-size: 18px; cursor: pointer; color: #666; }
    .row { margin: 6px 0; }
    .label { font-weight: 600; color: #555; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .actions { margin-top: 12px; display: flex; gap: 8px; }
    .btn { border: none; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 13px; }
    .primary { background: #1f2a6b; color: #fff; }
    .secondary { background: #eef0f8; color: #1f2a6b; }
  `;

  function removeCard() {
    const existing = document.getElementById(CARD_ID);
    if (existing) existing.remove();
  }

  function showCard({ doing, stoppedAt, nextStep, scroll }) {
    removeCard();

    const host = document.createElement("div");
    host.id = CARD_ID;
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = STYLES;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="header">
        <span class="title">Where was I?</span>
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

    // textContent (not innerHTML) so AI output can't inject HTML into the page
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

  // Background → content: { action: "showCard", doing, stoppedAt, nextStep, scroll }
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.action === "showCard") showCard(msg);
  });

  // TEMP for testing: in the page's DevTools console, run:
  //   window.dispatchEvent(new Event("where-was-i-test"))
  // (Content scripts run in an isolated world, so a DOM event is the way in.)
  window.addEventListener("where-was-i-test", () => {
    showCard({
      doing: "Researching the causes of WW1 for your essay.",
      stoppedAt: "The section on the Triple Entente.",
      nextStep: "Look into the July Crisis.",
      scroll: 0,
    });
  });
})();