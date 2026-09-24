import type { Options } from "../@types";

// How a note is cut into slides, picked by the `slides:` frontmatter key.
// "separators" is upstream's `---` / `--` behaviour and the default when the
// key is absent. "headings" makes every heading start a slide, with the
// heading level choosing a preset (Settings → Heading levels). "blocks" keeps
// the note as prose and turns only the `%% slide %%` regions into slides.
export type SlidesMode = "separators" | "headings" | "blocks";

// Heading- and block-mode decks are joined with sentinels that can't collide with prose,
// so a `---` horizontal rule or a `--` line in a normal note stays text.
// No regex metacharacters: processors split on these as regexes and join on
// them as literal strings. Must not start with "slide" (CommentParser would
// read it as a slide annotation).
export const HEADING_SLIDE_SEPARATOR = "\n<!-- @slidey:slide -->\n";
export const HEADING_VERTICAL_SEPARATOR = "\n<!-- @slidey:vertical -->\n";
// Replaces a `%% notes %%` line; the rest of the slide is speaker notes. A
// sentinel rather than upstream's `note:` so prose can't start notes by accident.
export const HEADING_NOTES_SEPARATOR = "<!-- @slidey:notes -->";

const DEFAULT_SEPARATOR = "\r?\n---\r?\n";
const DEFAULT_VERTICAL_SEPARATOR = "\r?\n--\r?\n";
const SLIDE_COMMENT_LINE = /^\s*<!--\s*\.?slide\b.*-->\s*$/;
const HEADING = /^(#{1,6})[ \t]+\S/;
const FENCE = /^[ \t]{0,3}(`{3,}|~{3,})/;
const MARKER = /^\s*%%\s*(.*?)\s*%%\s*$/;
const NOTES_MARKER = /^\s*%%\s*notes?\s*%%\s*$/i;
const SLIDE_COMMENT = /<!--\s*\.?slide\b/;
const BLOCK_START = /^\s*%%\s*slide(?=\s|%)(.*?)%%\s*$/i;
const BLOCK_END = /^\s*%%\s*(?:end\s*slide|\/\s*slide)\s*%%\s*$/i;
const ATTR = /\b(\w+)\s*=\s*("[^"]*"|\[\[[^\]]*\]\]|[^\s"]+)/g;
const WIKILINK = /^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/;
const IMAGE_FILE = /\.(?:png|jpe?g|gif|webp|svg|bmp|avif)$/i;

// Shown when a blocks-mode note has no regions yet. Entities keep the markers
// from being read as Obsidian comments.
const NO_BLOCKS_HINT =
    "No slides yet. Put a line reading <code>&#37;&#37; slide &#37;&#37;</code> above the part of the note you want as a slide, and <code>&#37;&#37; endslide &#37;&#37;</code> after it.";

/** Per-slide settings read from `%% … %%` markers. */
interface SlideAttrs {
    preset?: string;
    bg?: string;
}

export function slidesMode(options: Partial<Options>): SlidesMode {
    const value =
        typeof options.slides === "string"
            ? options.slides.trim().toLowerCase()
            : "";
    if (value === "headings" || value === "blocks") {
        return value;
    }
    return "separators";
}

/**
 * Rewrites the note into the form the rest of the pipeline expects, and points
 * `options` at the matching separators. Must run before the slidify options
 * are read from `options`.
 */
export function applySlidesMode(markdown: string, options: Options): string {
    const mode = slidesMode(options);
    if (mode === "separators") {
        return separatorMarkers(markdown, options);
    }
    options.separator = HEADING_SLIDE_SEPARATOR;
    options.verticalSeparator = HEADING_VERTICAL_SEPARATOR;
    options.notesSeparator = HEADING_NOTES_SEPARATOR;
    if (mode === "blocks") {
        return blocksToSlides(markdown).markdown;
    }
    const levelPresets = Array.isArray(options.headingPresets)
        ? (options.headingPresets as string[])
        : [];
    return headingsToSlides(markdown, levelPresets).markdown;
}

/**
 * Separator mode: `%% … %%` lines at the top of each `---` / `--` slide
 * (blank lines and a `<!-- slide … -->` comment allowed between) configure
 * it and are removed, as under a heading:
 *   `%% preset=quote bg=photo.jpg %%`
 * A `%% notes %%` line starts the slide's speaker notes (it becomes the
 * deck's notes separator, `note:` by default). Slide count and order are
 * unchanged, so the editor → slide sync still lines up.
 */
export function separatorMarkers(markdown: string, options: Options): string {
    const separator = options.separator || DEFAULT_SEPARATOR;
    const vertical = options.verticalSeparator || DEFAULT_VERTICAL_SEPARATOR;
    const notes = options.notesSeparator || "note:";
    // A capture group keeps the separators in the split result (odd indexes).
    const parts = markdown.split(
        new RegExp(`(${separator}|${vertical})`, "gm"),
    );
    return parts
        .map((part, index) => {
            if (index % 2 || part === undefined) {
                return part ?? "";
            }
            const { lines, attrs } = readMarkers(part.split(/\r?\n/), 0);
            return withAttrs(withNotes(lines, notes).join("\n"), attrs);
        })
        .join("");
}

interface Section {
    start: number;
    level: number;
    lines: string[];
}

/** One heading (or `%% slide %%` line), as it will appear in the deck. */
export interface HeadingSlide {
    /** Source line of the heading (0-based, relative to the markdown given). */
    line: number;
    /** Heading level; 0 for a `%% slide %%` block. */
    level: number;
    /** Resolved preset name; "" means the deck default (`preset:` frontmatter). */
    preset: string;
    /** `%% noslide %%` — left out of the deck. */
    skip: boolean;
}

/**
 * Every heading of a headings-mode note with the preset it resolves to — what
 * the editor gutter shows. Mirrors `headingsToSlides`.
 */
export function headingOutline(
    markdown: string,
    levelPresets: string[],
): HeadingSlide[] {
    return splitSections(markdown)
        .filter((section) => section.level > 0)
        .map((section) => {
            const { skip, attrs } = readMarkers(section.lines);
            return {
                line: section.start,
                level: section.level,
                preset:
                    attrs.preset ?? levelPreset(levelPresets, section.level),
                skip,
            };
        });
}

/**
 * Splits a note at every heading (outside fenced code). Text before the first
 * heading becomes its own slide when non-blank. `%% … %%` lines directly under
 * a heading configure that slide and are removed:
 *   `%% noslide %%`        — leave this section out of the deck
 *   `%% preset=quote %%`   — use this preset instead of the level's one
 *   `%% bg=photo.jpg %%`   — background picture (or color) for this slide
 * A `%% notes %%` line anywhere in the section starts its speaker notes.
 *
 * Returns the deck markdown plus, per slide, the source line it starts on
 * (used by the preview to follow the editor cursor).
 */
export function headingsToSlides(
    markdown: string,
    levelPresets: string[],
): { markdown: string; starts: number[] } {
    const slides: string[] = [];
    const starts: number[] = [];
    for (const section of splitSections(markdown)) {
        if (section.level === 0) {
            if (section.lines.join("").trim()) {
                slides.push(withNotes(section.lines).join("\n"));
                starts.push(section.start);
            }
            continue;
        }
        const { lines, skip, attrs } = readMarkers(section.lines);
        if (skip) {
            continue;
        }
        slides.push(
            withAttrs(withNotes(lines).join("\n"), {
                ...attrs,
                preset:
                    attrs.preset ?? levelPreset(levelPresets, section.level),
            }),
        );
        starts.push(section.start);
    }

    return { markdown: slides.join(HEADING_SLIDE_SEPARATOR), starts };
}

interface Block {
    start: number;
    attrs: SlideAttrs;
    lines: string[];
}

/**
 * Blocks mode: only regions opened by a `%% slide %%` line become slides.
 * A region ends at `%% endslide %%` (or `%% /slide %%`), the next
 * `%% slide %%`, or the end of the note. `%% slide preset=quote bg=photo.jpg %%`
 * picks the preset and background; without a preset the deck default applies.
 * A `%% notes %%` line inside a region starts its speaker notes. Markers
 * inside fenced code are text.
 */
export function blocksToSlides(markdown: string): {
    markdown: string;
    starts: number[];
} {
    const blocks = splitBlocks(markdown);
    if (!blocks.length) {
        return { markdown: NO_BLOCKS_HINT, starts: [0] };
    }
    return {
        markdown: blocks
            .map((block) =>
                withAttrs(withNotes(block.lines).join("\n"), block.attrs),
            )
            .join(HEADING_SLIDE_SEPARATOR),
        starts: blocks.map((block) => block.start),
    };
}

/** Every `%% slide %%` line with its preset — what the editor gutter shows. */
export function blockOutline(markdown: string): HeadingSlide[] {
    return splitBlocks(markdown).map((block) => ({
        line: block.start,
        level: 0,
        preset: block.attrs.preset ?? "",
        skip: false,
    }));
}

function splitBlocks(markdown: string): Block[] {
    const blocks: Block[] = [];
    let current: Block | null = null;
    const inCode = fenceTracker();

    markdown.split(/\r?\n/).forEach((line, index) => {
        if (!inCode(line)) {
            const start = BLOCK_START.exec(line);
            if (start) {
                current = {
                    start: index,
                    attrs: readAttrs(start[1]).attrs,
                    lines: [],
                };
                blocks.push(current);
                return;
            }
            if (BLOCK_END.test(line)) {
                current = null;
                return;
            }
        }
        current?.lines.push(line);
    });
    return blocks;
}

function levelPreset(levelPresets: string[], level: number): string {
    return levelPresets[level - 1]?.trim() ?? "";
}

// Section 0 (level 0) holds whatever comes before the first heading.
function splitSections(markdown: string): Section[] {
    const sections: Section[] = [{ start: 0, level: 0, lines: [] }];
    const inCode = fenceTracker();

    markdown.split(/\r?\n/).forEach((line, index) => {
        const heading = !inCode(line) && HEADING.exec(line);
        if (heading) {
            sections.push({
                start: index,
                level: heading[1].length,
                lines: [],
            });
        }
        sections[sections.length - 1].lines.push(line);
    });
    return sections;
}

// Feed lines in order; answers whether each one is part of a fenced code
// block (fence lines included).
function fenceTracker(): (line: string) => boolean {
    let fence: string | null = null;
    return (line) => {
        const match = FENCE.exec(line);
        if (fence) {
            if (
                match &&
                match[1][0] === fence[0] &&
                match[1].length >= fence.length
            ) {
                fence = null;
            }
            return true;
        }
        if (match) {
            fence = match[1];
            return true;
        }
        return false;
    };
}

// Consumes the `%% … %%` lines (and blank lines between them) right under the
// heading. Other `%%` comments are left for the format processor to strip.
function readMarkers(
    lines: string[],
    from = 1,
): {
    lines: string[];
    skip: boolean;
    attrs: SlideAttrs;
} {
    let skip = false;
    const attrs: SlideAttrs = {};
    const kept = lines.slice(0, from);
    let index = from;
    for (; index < lines.length; index++) {
        const line = lines[index];
        if (!line.trim()) {
            kept.push(line);
            continue;
        }
        if (SLIDE_COMMENT_LINE.test(line)) {
            kept.push(line);
            continue;
        }
        const marker = MARKER.exec(line);
        if (!marker || NOTES_MARKER.test(line)) {
            break;
        }
        const body = marker[1];
        if (/^noslide$/i.test(body)) {
            skip = true;
            continue;
        }
        const read = readAttrs(body.replace(/^slide\s+/i, ""));
        if (!read.rest && (read.attrs.preset || read.attrs.bg)) {
            Object.assign(attrs, read.attrs);
            continue;
        }
        kept.push(line);
    }
    return { lines: kept.concat(lines.slice(index)), skip, attrs };
}

// Reads `preset=quote bg=[[My photo.jpg]]`. `rest` is whatever wasn't a known
// attribute, so a marker holding anything else can be left alone.
function readAttrs(text: string): { attrs: SlideAttrs; rest: string } {
    const attrs: SlideAttrs = {};
    const rest = text.replace(ATTR, (match, key: string, raw: string) => {
        const value = raw.replace(/^"|"$/g, "").trim();
        switch (key.toLowerCase()) {
            case "preset":
                attrs.preset = value;
                return "";
            case "bg":
                attrs.bg = bgValue(value);
                return "";
            default:
                return match;
        }
    });
    return { attrs, rest: rest.trim() };
}

// Picture files become `[[file]]`, which MediaProcessor resolves to the
// vault path; colors and URLs pass through.
function bgValue(value: string): string {
    const target = WIKILINK.exec(value)?.[1].trim() ?? value;
    return IMAGE_FILE.test(target) && !target.includes("://")
        ? `[[${target}]]`
        : target;
}

// The first `%% notes %%` line (outside code) becomes the notes separator;
// later ones are dropped, since reveal.js takes a single split.
function withNotes(
    lines: string[],
    separator = HEADING_NOTES_SEPARATOR,
): string[] {
    const inCode = fenceTracker();
    let found = false;
    const out: string[] = [];
    for (const line of lines) {
        if (!inCode(line) && NOTES_MARKER.test(line)) {
            if (!found) {
                out.push(separator);
            }
            found = true;
            continue;
        }
        out.push(line);
    }
    return out;
}

// Hands preset and background to the processors via the slide comment they
// already read. Attributes already on an existing slide comment win.
function withAttrs(slide: string, attrs: SlideAttrs): string {
    const owned: [keyof SlideAttrs, RegExp][] = [
        ["preset", /\bpreset\s*=/],
        ["bg", /\b(?:bg|data-background-\w+)\s*=/],
    ];
    const comment = SLIDE_COMMENT.exec(slide);
    const existing = comment
        ? slide.substring(comment.index, slide.indexOf("-->", comment.index))
        : "";
    const added = owned
        .filter(([key, taken]) => attrs[key] && !taken.test(existing))
        .map(([key]) => `${key}="${attrs[key]?.replace(/"/g, "")}"`)
        .join(" ");
    if (!added) {
        return slide;
    }
    if (!comment) {
        return `<!-- slide ${added} -->\n${slide}`;
    }
    const at = comment.index + comment[0].length;
    return `${slide.substring(0, at)} ${added}${slide.substring(at)}`;
}
