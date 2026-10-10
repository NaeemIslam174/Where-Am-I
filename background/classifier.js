import { DISTRACTION_DOMAINS } from "../shared/constants.js";

export function classifyPage(url) {
    try {
        const hostname = new URL(url).hostname;

        const isDistraction = DISTRACTION_DOMAINS.some(domain =>
            hostname === domain || hostname.endsWith("." + domain)
        );

        return isDistraction ? "distraction" : "work";
    } catch {
        return "work";
    }
}