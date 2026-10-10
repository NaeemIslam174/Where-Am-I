/* popup/popup.css — matches the card (grey gradient, question mark pattern) */
:root {
  --navy: #3a3a3a; /* dark grey accent, same as the card */
  --ink: #1a1a2e;
  --muted: #5b6170;
  --soft: rgba(255, 255, 255, 0.7);
  --panel: rgba(255, 255, 255, 0.55);
  --line: rgba(255, 255, 255, 0.7);
  --red: #b3261e;
  --green: #1e8a4c;
}

* { box-sizing: border-box; }

html { background: #ececec; } /* shows around the rounded edges */

body {
  width: 340px;
  margin: 6px;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  color: var(--ink);
  background: linear-gradient(180deg, #fff 0%, #999 100%);
  border: 2px solid #fff;
  border-radius: 16px; /* same as the card */
  overflow: hidden;
  position: relative;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}

body::before { /* faint question mark pattern, same as the card */
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("../assets/QuestionMarks.jpg");
  background-size: 260px auto;
  opacity: 0.1;
  mix-blend-mode: multiply; /* only the dark marks show, white parts disappear */
  pointer-events: none;
}

header, main, footer { position: relative; } /* keep content above the pattern */

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}

.logo { width: 36px; height: 36px; flex-shrink: 0; }

h1 { margin: 0; font-size: 17px; font-weight: 700; color: #3a3a3a; }
h2 { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #4a4a4a; }

.status { margin: 2px 0 0; font-size: 12px; color: #4a4a4a; display: flex; align-items: center; gap: 6px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); }
.dot.paused { background: #9aa0ad; }

main { padding: 18px 20px; display: flex; flex-direction: column; gap: 20px; }

.pause-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--panel);
  border-radius: 12px;
}
.row-title { font-weight: 600; }
.hint { margin: 2px 0 0; font-size: 12px; color: #4a4a4a; }

/* Toggle switch */
.switch {
  position: relative;
  width: 44px;
  height: 26px;
  border: none;
  border-radius: 13px;
  background: #c5c9d6;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: background 0.2s;
}
.knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}
.switch[aria-checked="true"] { background: var(--navy); }
.switch[aria-checked="true"] .knob { transform: translateX(18px); }

/* Site chips */
.chips { list-style: none; margin: 0 0 10px; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 28px;
  padding: 0 4px 0 12px;
  border-radius: 14px;
  background: var(--soft);
  font-size: 13px;
}
.chip button {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--muted);
  font-size: 15px;
  cursor: pointer;
}
.chip button:hover { background: #fff; }
.empty { font-size: 13px; color: var(--muted); }

.add-row { display: flex; gap: 8px; }
input {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 12px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.85);
  font: inherit;
  font-size: 13px;
}
.btn-secondary {
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: 10px;
  background: var(--soft);
  color: var(--navy);
  font-weight: 600;
  cursor: pointer;
}
.error { margin: 6px 0 0; font-size: 12px; color: var(--red); min-height: 1em; }

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--line);
}
.btn-danger {
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--red);
  font-weight: 600;
  cursor: pointer;
}
.btn-danger:hover { background: rgba(255, 255, 255, 0.6); }

button:focus-visible, input:focus-visible { outline: 2px solid var(--navy); outline-offset: 2px; }

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (prefers-reduced-motion: reduce) {
  .switch, .knob { transition: none; }
}