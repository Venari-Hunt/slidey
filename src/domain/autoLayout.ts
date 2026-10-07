// Picks a slide's layout from what is written on it, so a deck needs no
// per-slide setup: a lone heading is a title, a list is bullets, a picture is
// an image slide, and so on. Plain rules, no DOM — the same text always gets
// the same layout. A `%% layout=x %%` line on the slide still wins.

/** Layout names this module can return; all exist in `LAYOUTS`. */
export type AutoLayout =
    | "title"
    | "section"
    | "statement"
    | "bullets"
    | "two-column"
    | "quote"
    | "image-full"
    | "image-side"
    | "code";

/** Longest one-line slide (in words) still shown big as a statement. */
const STATEMENT_MAX_WORDS = 14;
/** Longest subtitle (in words) under a `#` heading on a title slide. */
const SUBTITLE_MAX_WORDS = 16;
/** More list items than this split into two columns. */
const TWO_COLUMN_MIN_ITEMS = 8;

const HEADING = /^(#{1,6})\s+\S/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+\S/;
const QUOTE = /^\s*>/;
const FENCE = /^\s*(?:`{3,}|~{3,})/;
const IMAGE_ONLY =
    /^\s*(?:!\[[^\]]*\]\([^)]*\)|!\[\[[^\]]+\]\]|<img\b[^>]*>|<p>\s*<img\b[^>]*>\s*<\/p>)\s*$/i;
const COMMENT_LINE = /^\s*<!--.*-->\s*$/;
const OBSIDIAN_COMMENT_LINE = /^\s*%%.*%%\s*$/;
// Where speaker notes start: upstream's `note:` or Slidey's notes sentinel.
const NOTES_START = /^\s*(?:note:|<!-- @slidey:notes -->)/i;

/** The lines the audience will see: no comments, notes or blank lines. */
function visibleLines(slide: string): string[] {
    const lines: string[] = [];
    for (const line of slide.split(/\r?\n/)) {
        if (NOTES_START.test(line)) {
            break;
        }
        if (
            !line.trim() ||
            COMMENT_LINE.test(line) ||
            OBSIDIAN_COMMENT_LINE.test(line)
        ) {
            continue;
        }
        lines.push(line);
    }
    return lines;
}

function words(line: string): number {
    return line.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * The layout a slide's content calls for, or "" for a plain text slide (the
 * theme's default look).
 */
export function guessLayout(slide: string): AutoLayout | "" {
    const lines = visibleLines(slide);
    if (lines.length === 0) {
        return "";
    }
    if (lines.some((l) => FENCE.test(l))) {
        return "code";
    }

    const headings = lines.filter((l) => HEADING.test(l));
    const images = lines.filter((l) => IMAGE_ONLY.test(l));
    const body = lines.filter((l) => !HEADING.test(l) && !IMAGE_ONLY.test(l));

    if (images.length > 0) {
        // A picture with at most a heading over it fills the slide.
        return body.length === 0 && images.length === 1
            ? "image-full"
            : body.length === 0
              ? ""
              : "image-side";
    }

    if (body.length > 0 && body.every((l) => QUOTE.test(l))) {
        return "quote";
    }

    if (body.length === 0) {
        const level = HEADING.exec(headings[0])?.[1].length ?? 1;
        return level === 1 ? "title" : "section";
    }

    const items = body.filter((l) => LIST_ITEM.test(l));
    if (items.length > 0) {
        return items.length >= TWO_COLUMN_MIN_ITEMS ? "two-column" : "bullets";
    }

    if (body.length === 1) {
        const level = headings.length
            ? (HEADING.exec(headings[0])?.[1].length ?? 0)
            : 0;
        if (level === 1 && words(body[0]) <= SUBTITLE_MAX_WORDS) {
            return "title";
        }
        if (headings.length === 0 && words(body[0]) <= STATEMENT_MAX_WORDS) {
            return "statement";
        }
    }
    return "";
}

/**
 * A `> — Name` line right under a quote becomes its own paragraph, so the
 * theme can show it as the credit instead of running it into the quote.
 */
export function separateQuoteCredit(slide: string): string {
    return slide.replace(
        /^(\s*>[^\n]*\S[^\n]*\r?\n)(\s*>\s*(?:—|–|--)\s)/gm,
        "$1>\n$2",
    );
}

/** Options keys that, set in a note's frontmatter, opt it out of auto mode. */
interface DeckLooks {
    preset?: unknown;
    style?: unknown;
    layout?: unknown;
    autoSlides?: unknown;
}

/**
 * Auto mode needs `autoSlides` (a setting, on by default; note frontmatter
 * `autoSlides:` overrides it) and is skipped when the note picks its own look
 * the old way (`preset:`, `style:` or `layout:` frontmatter), so decks written
 * for the old system keep looking the same.
 */
export function isAutoDeck(options: DeckLooks): boolean {
    if (options.autoSlides !== true) {
        return false;
    }
    const set = (v: unknown) => typeof v === "string" && v.trim() !== "";
    return !set(options.preset) && !set(options.style) && !set(options.layout);
}

/**
 * Auto decks are 16:9 (1280×720) so they fill today's screens, unless the
 * note's frontmatter sets its own `width:` / `height:`.
 */
export function autoDeckSize(
    options: DeckLooks,
    frontmatter: unknown,
): { width?: number; height?: number } {
    const own = (frontmatter ?? {}) as Record<string, unknown>;
    if (!isAutoDeck(options) || own.width != null || own.height != null) {
        return {};
    }
    return { width: 1280, height: 720 };
}
