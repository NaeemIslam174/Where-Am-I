import { DEFAULT_DISTRACTIONS } from "../shared/constants.js";

export function classifyPage(url) {
    try {
        const hostname = new URL(url).hostname;

        const isDistraction = DEFAULT_DISTRACTIONS.some(domain =>
            hostname === domain || hostname.endsWith("." + domain)
        );

        return isDistraction ? "distraction" : "work";
    } catch {
        return "work";
    }
}

