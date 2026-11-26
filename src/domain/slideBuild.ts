// Per-slide extras read from `%% … %%` markers that need text rules, not DOM:
// lists revealed one item per click (`%% step %%`) and the part of a cover
// picture to keep in frame (`%% focus=left top %%`).

const FENCE = /^\s*(?:`{3,}|~{3,})/;
// A top-level list item: `- x`, `* x`, `+ x`, `1. x`, `1) x`, also inside `>`.
const TOP_LIST_ITEM = /^(>\s*)?(?:[-*+]|(\d+)[.)])\s+(?=\S)/;
// Where speaker notes start (upstream's `note:`, Slidey's sentinel or marker).
const NOTES_START =
    /^\s*(?:note:|<!-- @slidey:notes -->|%%\s*notes?\s*%%\s*$)/i;

/**
 * Turns top-level list items into upstream's fragment syntax (`+ x`,
 * `1) x`), so each click shows the next item. Nested items arrive with
 * their parent; code and speaker notes are left alone.
 */
export function stepLists(lines: string[]): string[] {
    let inCode = false;
    let inNotes = false;
    return lines.map((line) => {
        if (FENCE.test(line)) {
            inCode = !inCode;
            return line;
        }
        if (NOTES_START.test(line)) {
            inNotes = true;
        }
        if (inCode || inNotes) {
            return line;
        }
        return line.replace(TOP_LIST_ITEM, (_, quote = "", num?: string) =>
            num ? `${quote}${num}) ` : `${quote}+ `,
        );
    });
}

/** `on`/`yes`/`true` (or a bare `%% step %%`) → true, `off`/`no`/`false` → false. */
export function stepValue(value: string): boolean | undefined {
    const v = value.trim().toLowerCase();
    if (v === "" || v === "on" || v === "yes" || v === "true") {
        return true;
    }
    if (v === "off" || v === "no" || v === "false") {
        return false;
    }
    return undefined;
}

const HORIZONTAL: Record<string, string> = { left: "left", right: "right" };
const VERTICAL: Record<string, string> = {
    top: "top",
    bot: "bottom",
    bottom: "bottom",
};
const CENTER = new Set(["center", "centre", "middle", "mid"]);

/** Words `focus=` accepts, for joining `focus=left top` into one value. */
export const FOCUS_WORD =
    "(?:left|right|top|bot|bottom|center|centre|middle|mid)";

/**
 * A CSS position ("left top", "center bottom") from `top`, `left`,
 * `left-top`, `top,right`, `bot` and the like, or undefined when the value
 * isn't one. Word order doesn't matter; a missing axis is centered.
 */
export function focusPosition(value: string): string | undefined {
    const parts = value
        .trim()
        .toLowerCase()
        .split(/[\s,\-_/]+/)
        .filter(Boolean);
    if (parts.length === 0 || parts.length > 2) {
        return undefined;
    }
    let x = "";
    let y = "";
    for (const part of parts) {
        if (HORIZONTAL[part] && !x) {
            x = HORIZONTAL[part];
        } else if (VERTICAL[part] && !y) {
            y = VERTICAL[part];
        } else if (CENTER.has(part)) {
            // an explicit center: that axis stays centered
        } else {
            return undefined;
        }
    }
    return `${x || "center"} ${y || "center"}`;
}
