// Picks one of several looks for a slide whose layout is already known (see
// autoLayout.ts), from what the slide holds: a statement that starts with a
// number gets the huge counting number, three short items become numbered
// cards, and so on. Plain rules, no DOM. Owner-approved mock:
// Global Management design-system/dist/tool/mock-slidey-looks.html (2026-11-25).
//
// Order of say: a `%% look=x %%` on the slide, then the content rules (shaped
// by the deck style, `slideLooks: auto | calm | bold`), then "neighbors
// differ": two slides of the same layout in a row avoid the same look when
// another one fits.

import {
    HEADING,
    IMAGE_ONLY,
    LIST_ITEM,
    QUOTE,
    visibleLines,
    words,
} from "./autoLayout";

export type DeckStyle = "auto" | "calm" | "bold";

/** Looks per layout; the first one is the default (today's look). */
export const LOOKS: Record<string, readonly string[]> = {
    title: ["center", "left", "kicker"],
    section: ["block", "number", "rule"],
    statement: ["plain", "number", "rule"],
    bullets: ["markers", "cards", "steps", "compare"],
    "two-column": ["cols", "compare"],
    quote: ["bar", "mark"],
    "image-side": ["card", "bleed", "photo"],
};

/** Friendly names, for the `/` menu. */
export const LOOK_LABELS: Record<string, string> = {
    center: "Centered",
    left: "Big left",
    kicker: "Kicker",
    block: "Amber block",
    number: "Big number",
    rule: "Rule",
    plain: "Plain",
    markers: "Markers",
    cards: "Numbered cards",
    steps: "Steps",
    compare: "Compare",
    cols: "Columns",
    bar: "Bar",
    mark: "Big quote mark",
    card: "Rounded card",
    bleed: "Bleed to edge",
    photo: "Photo behind",
};

/** Title: a heading longer than this goes big and left. */
const TITLE_LEFT_MIN_WORDS = 5;
/** Title: a line under it this short reads as a kicker (date, place, name). */
const KICKER_MAX_WORDS = 3;
/** Statement: longer than this gets the amber rule. */
const STATEMENT_RULE_MIN_WORDS = 13;
/** Cards: this many items at most, each this short. */
const CARDS_MAX_ITEMS = 4;
const CARD_MAX_WORDS = 6;
/** Quote: this short gets the big quote mark. */
const QUOTE_MARK_MAX_WORDS = 20;
/** Picture beside text: text this short lets the picture bleed. */
const BLEED_MAX_WORDS = 12;
/** Section: this many sections in the deck earn a number. */
const SECTION_NUMBER_MIN = 3;

/** A statement that opens with a number: `73%`, `3x`, `$40`, `1,200`. */
export const LEADING_NUMBER =
    /^(\s*)((?:R\$|[$€£])?\d[\d.,]*(?:%|x|×|k|K|M)?)(?=\s|$)/;
const ORDERED_ITEM = /^\s*\d+[.)]\s+\S/;
const BOLD_LINE = /^\s*(?:\*\*|__)[^*_]+(?:\*\*|__):?\s*$/;

export interface LookContext {
    style?: DeckStyle;
    /** Layout and look of the slide before, for "neighbors differ". */
    prev?: { layout: string; look: string };
    /** How many section slides the deck has. */
    sections?: number;
    /** A `%% look=x %%` written on the slide. */
    chosen?: string;
}

export function deckStyle(value: unknown): DeckStyle {
    const v = typeof value === "string" ? value.trim().toLowerCase() : "";
    return v === "calm" || v === "bold" ? v : "auto";
}

function stripMarkup(line: string): string {
    return line.replace(/^\s*(?:#{1,6}|>|[-*+]|\d+[.)])\s*/, "");
}

/** Looks the content calls for, best first; never includes the default. */
function contentLooks(
    layout: string,
    slide: string,
    ctx: LookContext,
): string[] {
    const lines = visibleLines(slide);
    const headings = lines.filter((l) => HEADING.test(l));
    const body = lines.filter((l) => !HEADING.test(l) && !IMAGE_ONLY.test(l));
    const items = body.filter((l) => LIST_ITEM.test(l));
    const text = body.map(stripMarkup).join(" ");
    switch (layout) {
        case "title": {
            const out: string[] = [];
            if (body.length === 1 && words(body[0]) <= KICKER_MAX_WORDS) {
                out.push("kicker");
            }
            if (
                headings[0] &&
                words(stripMarkup(headings[0])) >= TITLE_LEFT_MIN_WORDS
            ) {
                out.push("left");
            }
            return out;
        }
        case "section":
            return (ctx.sections ?? 0) >= SECTION_NUMBER_MIN
                ? ["number", "rule"]
                : [];
        case "statement": {
            const out: string[] = [];
            if (LEADING_NUMBER.test(text)) {
                out.push("number");
            }
            if (words(text) >= STATEMENT_RULE_MIN_WORDS) {
                out.push("rule");
            }
            return out;
        }
        case "bullets":
        case "two-column": {
            const bold = body.filter((l) => BOLD_LINE.test(l));
            if (
                bold.length === 2 &&
                body.length === bold.length + items.length
            ) {
                return ["compare"];
            }
            if (layout === "two-column") {
                return [];
            }
            if (items.length > 0 && items.every((l) => ORDERED_ITEM.test(l))) {
                return ["steps"];
            }
            if (
                items.length >= 2 &&
                items.length <= CARDS_MAX_ITEMS &&
                items.length === body.length &&
                items.every((l) => words(stripMarkup(l)) <= CARD_MAX_WORDS)
            ) {
                return ["cards"];
            }
            return [];
        }
        case "quote":
            return words(
                body
                    .filter((l) => !/^\s*>\s*(?:—|–|--)\s/.test(l))
                    .map(stripMarkup)
                    .join(" "),
            ) <= QUOTE_MARK_MAX_WORDS
                ? ["mark"]
                : [];
        case "image-side": {
            if (body.length > 0 && body.every((l) => QUOTE.test(l))) {
                return ["photo"];
            }
            return words(text) <= BLEED_MAX_WORDS ? ["bleed"] : [];
        }
        default:
            return [];
    }
}

// Calm keeps the default unless the content leaves no choice (a numbered list
// is steps, a quote with a photo is the photo);
// Bold prefers the loud looks.
const CALM_KEEPS = new Set(["steps", "photo", "compare", "rule"]);
const BOLD_EXTRA: Record<string, string> = { title: "left", quote: "mark" };

/** The look for one slide, or "" when the layout has no looks. */
export function pickLook(
    layout: string,
    slide: string,
    ctx: LookContext = {},
): string {
    const looks = LOOKS[layout];
    if (!looks) {
        return "";
    }
    const chosen = ctx.chosen?.trim().toLowerCase();
    if (chosen && looks.includes(chosen)) {
        return chosen;
    }
    const style = ctx.style ?? "auto";
    let fits = contentLooks(layout, slide, ctx);
    if (style === "calm") {
        fits = fits.filter(
            (l) =>
                CALM_KEEPS.has(l) && !(layout === "statement" && l === "rule"),
        );
        if (layout === "section") {
            fits = ["rule"];
        }
    } else if (style === "bold") {
        const extra = BOLD_EXTRA[layout];
        if (extra && !fits.includes(extra)) {
            fits.push(extra);
        }
        if (layout === "section") {
            fits = fits.filter((l) => l !== "rule");
        }
    } else if (layout === "section") {
        fits = fits.filter((l) => l !== "rule");
    }
    const options = [...fits, looks[0]].filter(
        (l, i, all) => all.indexOf(l) === i,
    );
    const prev = ctx.prev;
    if (
        prev &&
        prev.layout === layout &&
        options[0] === prev.look &&
        options.length > 1
    ) {
        return options[1];
    }
    return options[0];
}

/** Looks that fit this slide, for the `/` menu (default first). */
export function lookChoices(
    layout: string,
    slide: string,
    sections = 0,
): string[] {
    const looks = LOOKS[layout];
    if (!looks) {
        return [];
    }
    const fits = contentLooks(layout, slide, { sections });
    return looks.filter((l, i) => i === 0 || fits.includes(l));
}
