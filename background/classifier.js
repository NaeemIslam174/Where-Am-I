import { DEFAULT_DISTRACTIONS } from "../shared/constants.js";

// Labels a URL as "work", "distraction", or "other" (non-web pages like chrome://)
export function classifyPage(url, distractions = DEFAULT_DISTRACTIONS) {
    try {
        const { protocol, hostname } = new URL(url);
        if (protocol !== "http:" && protocol !== "https:") return "other";

        const isDistraction = distractions.some(domain =>
            hostname === domain || hostname.endsWith("." + domain)
        );

        return isDistraction ? "distraction" : "work";
    } catch {
        return "other"; // empty or invalid URL
    }
}