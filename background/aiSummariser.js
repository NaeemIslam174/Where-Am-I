// background/aiSummariser.js
import { GEMINI_API_KEY } from "./secrets.js";

const MODEL = "gemini-2.5-flash-lite"; // free model, check AI Studio if it errors
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_TEXT_CHARS = 1500; // per page, keeps the prompt small

// Sends recent work to Gemini and returns { doing, stoppedAt, nextStep } or null
export async function summarise(workEvents) {
  if (!GEMINI_API_KEY || !workEvents || workEvents.length === 0) return null;

  const prompt = buildPrompt(workEvents);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: 200,
        },
      }),
    });

    if (!res.ok) {
      console.warn("Gemini error", res.status, await res.text());
      return null; // bad key, rate limit, etc.
    }

    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (!parsed.doing || !parsed.stoppedAt || !parsed.nextStep) return null;
    return {
      doing: String(parsed.doing),
      stoppedAt: String(parsed.stoppedAt),
      nextStep: String(parsed.nextStep),
    };
  } catch (err) {
    console.warn("Summariser failed", err);
    return null; // offline, bad JSON, etc.
  }
}

// Turns the work events into the text prompt for Gemini
function buildPrompt(workEvents) {
  const recent = workEvents.slice(-10); // last 10 is plenty

  const lines = recent.map((e) => {
    const parts = [`- "${e.title}" (${e.url})`];
    const query = getSearchQuery(e.url);
    if (query) parts.push(`  searched for: "${query}"`);
    if (e.section) parts.push(`  section on screen when they left: "${e.section}"`);
    if (e.text) parts.push(`  page text: ${e.text.slice(0, MAX_TEXT_CHARS)}`);
    return parts.join("\n");
  });

  return `You help someone get back on track after a distraction.
Below is what they were working on in their browser, oldest first.

${lines.join("\n")}

Reply ONLY with JSON in this exact shape, no other text:
{"doing": "...", "stoppedAt": "...", "nextStep": "..."}

Rules:
- Each value is ONE short sentence, under 15 words.
- "doing": the task or topic they were working on, e.g. "Researching the causes of WW1 for an essay." (the card already shows the label "You were", so don't start with it).
- "stoppedAt": the specific page or section they were last on.
- "nextStep": the most likely next thing they were about to do, based on their searches and reading.
- Be specific (name the topic), never generic.`;
}

// Gets the search text from a Google search URL, or null
function getSearchQuery(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("google.") && u.pathname === "/search") return u.searchParams.get("q");
  } catch {}
  return null;
}