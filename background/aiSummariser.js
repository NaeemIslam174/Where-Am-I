// background/aiSummariser.js
import { GEMINI_API_KEY } from "./secrets.js";

const MODEL = "gemini-3.5-flash-lite"; // free model, check AI Studio if it errors
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_TEXT_CHARS = 1500; // per page, keeps the prompt small

// The exact shape we want back from Gemini
const SCHEMA = {
  type: "OBJECT",
  properties: {
    doing: { type: "STRING" },
    stoppedAt: { type: "STRING" },
    nextStep: { type: "STRING" },
    keyPoints: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["doing", "stoppedAt", "nextStep", "keyPoints"],
};

// Sends recent work to Gemini and returns { doing, stoppedAt, nextStep, keyPoints } or null
export async function summarise(workEvents) {
  if (!GEMINI_API_KEY || !workEvents || workEvents.length === 0) return null;

  const prompt = buildPrompt(workEvents);

  try {
    let res = await callGemini(prompt);
    if (res.status === 503 || res.status === 500) {
      await new Promise((r) => setTimeout(r, 1500)); // server busy, wait and retry once
      res = await callGemini(prompt);
    }

    if (!res.ok) {
      console.warn("Gemini error", res.status, await res.text());
      return null; // bad key, rate limit, etc.
    }

    const data = await res.json();
    const parsed = extractJson(data);
    if (!parsed) return null;

    if (!parsed.doing || !parsed.stoppedAt || !parsed.nextStep) return null;
    return {
      doing: String(parsed.doing),
      stoppedAt: String(parsed.stoppedAt),
      nextStep: String(parsed.nextStep),
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 2).map(String) : [],
    };
  } catch (err) {
    console.warn("Summariser failed", err);
    return null; // offline, bad JSON, etc.
  }
}

// Sends the prompt to Gemini and returns the raw response
function callGemini(prompt, schema = SCHEMA) {
  return fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema, // forces the exact JSON shape
        temperature: 0.3,
        maxOutputTokens: 1000, // room for the model's thinking too
      },
    }),
  });
}

const POINTS_SCHEMA = {
  type: "OBJECT",
  properties: { points: { type: "ARRAY", items: { type: "STRING" } } },
  required: ["points"],
};

// Gives 5 detailed points about one page, for the card's "Expand points" button
export async function expandPoints(event) {
  if (!GEMINI_API_KEY || !event) return null;

  const prompt = `Someone was reading this page and got distracted. Help them remember it.

Page: "${event.title}" (${event.url})
${event.section ? `Section they were in: "${event.section}"\n` : ""}${event.lastParagraph ? `Paragraph they stopped at: "${event.lastParagraph}"\n` : ""}
What they read just before leaving:
${event.readText || (event.text || "").slice(0, MAX_TEXT_CHARS * 2)}

Reply ONLY with JSON: {"points": ["...", "..."]}
Rules:
- 5 points, each one clear sentence under 25 words.
- Focus on what they read just before leaving, especially near where they stopped.
- Use specific facts, names and numbers from the text. Never invent anything.`;

  try {
    let res = await callGemini(prompt, POINTS_SCHEMA);
    if (res.status === 503 || res.status === 500) {
      await new Promise((r) => setTimeout(r, 1500));
      res = await callGemini(prompt, POINTS_SCHEMA);
    }
    if (!res.ok) {
      console.warn("Gemini error", res.status, await res.text());
      return null;
    }
    const parsed = extractJson(await res.json());
    return Array.isArray(parsed?.points) ? parsed.points.slice(0, 5).map(String) : null;
  } catch (err) {
    console.warn("Expand points failed", err);
    return null;
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
    if (e.lastParagraph) parts.push(`  exact paragraph they stopped at: "${e.lastParagraph}"`);
    if (e.readText) parts.push(`  what they read just before leaving (last 3 screens):\n${e.readText}`);
    else if (e.text) parts.push(`  page text: ${e.text.slice(0, MAX_TEXT_CHARS)}`);
    return parts.join("\n");
  });

  return `You help someone get back on track after a distraction.
Below is what they were working on in their browser, oldest first.

${lines.join("\n")}

Reply ONLY with JSON in this exact shape, no other text:
{"doing": "...", "stoppedAt": "...", "nextStep": "...", "keyPoints": ["...", "..."]}

Rules:
- Each value is ONE short sentence, under 15 words.
- "doing": the task or topic they were working on, e.g. "Researching the causes of WW1 for an essay." (the card already shows the label "You were", so don't start with it).
- "stoppedAt": exactly where they stopped, using the section and the paragraph they stopped at.
- "nextStep": the most likely next thing they were about to do, based on their searches and reading.
- "keyPoints": exactly 2 key facts from what they read just before leaving, each under 12 words, to jog their memory.
- Be specific (name the topic), never generic.`;
}

// Pulls the JSON object out of Gemini's reply, or null
function extractJson(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((p) => !p.thought) // skip thinking parts
    .map((p) => p.text || "")
    .join("");

  const match = text.match(/\{[\s\S]*\}/); // first { to last }
  if (!match) {
    console.warn("No JSON in Gemini reply:", text);
    return null;
  }

  try {
    return JSON.parse(match[0]);
  } catch {
    console.warn("Bad JSON in Gemini reply:", text);
    return null;
  }
}

// Gets the search text from a Google search URL, or null
function getSearchQuery(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("google.") && u.pathname === "/search") return u.searchParams.get("q");
  } catch {}
  return null;
}