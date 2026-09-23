import type { Options } from "../@types";

// How a note is cut into slides, picked by the `slides:` frontmatter key.
// "separators" is upstream's `---` / `--` behaviour and the default when the
// key is absent. "headings" makes every heading start a slide, with the
// heading level choosing a preset (Settings → Heading levels).
export type SlidesMode = "separators" | "headings";

// Heading-mode decks are joined with sentinels that can't collide with prose,
// so a `---` horizontal rule or a `--` line in a normal note stays text.
// No regex metacharacters: processors split on these as regexes and join on
// them as literal strings. Must not start with "slide" (CommentParser would
// read it as a slide annotation).
export const HEADING_SLIDE_SEPARATOR = "\n<!-- @slidey:slide -->\n";
export const HEADING_VERTICAL_SEPARATOR = "\n<!-- @slidey:vertical -->\n";

const HEADING = /^(#{1,6})[ \t]+\S/;
const FENCE = /^[ \t]{0,3}(`{3,}|~{3,})/;
const MARKER = /^\s*%%\s*(.*?)\s*%%\s*$/;
const SLIDE_COMMENT = /<!--\s*\.?slide\b/;

export function slidesMode(options: Partial<Options>): SlidesMode {
    const value =
        typeof options.slides === "string"
            ? options.slides.trim().toLowerCase()
            : "";
    return value === "headings" ? "headings" : "separators";
}

/**
 * Rewrites the note into the form the rest of the pipeline expects, and points
 * `options` at the matching separators. Must run before the slidify options
 * are read from `options`.
 */
export function applySlidesMode(markdown: string, options: Options): string {
    if (slidesMode(options) !== "headings") {
        return markdown;
    }
    options.separator = HEADING_SLIDE_SEPARATOR;
    options.verticalSeparator = HEADING_VERTICAL_SEPARATOR;
    const levelPresets = Array.isArray(options.headingPresets)
        ? (options.headingPresets as string[])
        : [];
    return headingsToSlides(markdown, levelPresets).markdown;
}

interface Section {
    start: number;
    level: number;
    lines: string[];
}

/**
 * Splits a note at every heading (outside fenced code). Text before the first
 * heading becomes its own slide when non-blank. `%% … %%` lines directly under
 * a heading configure that slide and are removed:
 *   `%% noslide %%`        — leave this section out of the deck
 *   `%% preset=quote %%`   — use this preset instead of the level's one
 *
 * Returns the deck markdown plus, per slide, the source line it starts on
 * (used by the preview to follow the editor cursor).
 */
export function headingsToSlides(
    markdown: string,
    levelPresets: string[],
): { markdown: string; starts: number[] } {
    const sections: Section[] = [{ start: 0, level: 0, lines: [] }];
    let fence: string | null = null;

    markdown.split(/\r?\n/).forEach((line, index) => {
        const fenceMatch = FENCE.exec(line);
        if (fence) {
            if (
                fenceMatch &&
                fenceMatch[1][0] === fence[0] &&
                fenceMatch[1].length >= fence.length
            ) {
                fence = null;
            }
        } else if (fenceMatch) {
            fence = fenceMatch[1];
        } else {
            const heading = HEADING.exec(line);
            if (heading) {
                sections.push({
                    start: index,
                    level: heading[1].length,
                    lines: [],
                });
            }
        }
        sections[sections.length - 1].lines.push(line);
    });

    const slides: string[] = [];
    const starts: number[] = [];
    for (const section of sections) {
        if (section.level === 0) {
            if (section.lines.join("").trim()) {
                slides.push(section.lines.join("\n"));
                starts.push(section.start);
            }
            continue;
        }
        const { lines, skip, preset } = readMarkers(section.lines);
        if (skip) {
            continue;
        }
        const name = preset ?? levelPresets[section.level - 1]?.trim() ?? "";
        slides.push(withPreset(lines.join("\n"), name));
        starts.push(section.start);
    }

    return { markdown: slides.join(HEADING_SLIDE_SEPARATOR), starts };
}

// Consumes the `%% … %%` lines (and blank lines between them) right under the
// heading. Other `%%` comments are left for the format processor to strip.
function readMarkers(lines: string[]): {
    lines: string[];
    skip: boolean;
    preset?: string;
} {
    let skip = false;
    let preset: string | undefined;
    const kept = [lines[0]];
    let index = 1;
    for (; index < lines.length; index++) {
        const line = lines[index];
        if (!line.trim()) {
            kept.push(line);
            continue;
        }
        const marker = MARKER.exec(line);
        if (!marker) {
            break;
        }
        const body = marker[1];
        if (/^noslide$/i.test(body)) {
            skip = true;
            continue;
        }
        const presetMatch = /^(?:slide\s+)?preset\s*=\s*"?([^"\s]+)"?$/i.exec(
            body,
        );
        if (presetMatch) {
            preset = presetMatch[1];
            continue;
        }
        kept.push(line);
    }
    return { lines: kept.concat(lines.slice(index)), skip, preset };
}

// Hands the preset to PresetProcessor via the slide comment it already reads.
// An explicit `preset=` on an existing slide comment wins.
function withPreset(slide: string, name: string): string {
    if (!name) {
        return slide;
    }
    const attr = `preset="${name.replace(/"/g, "")}"`;
    const comment = SLIDE_COMMENT.exec(slide);
    if (!comment) {
        return `<!-- slide ${attr} -->\n${slide}`;
    }
    const end = slide.indexOf("-->", comment.index);
    if (/\bpreset\s*=/.test(slide.substring(comment.index, end))) {
        return slide;
    }
    const at = comment.index + comment[0].length;
    return `${slide.substring(0, at)} ${attr}${slide.substring(at)}`;
}
