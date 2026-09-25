import type { Options } from "../@types";
import {
    blocksToSlides,
    headingsToSlides,
    slidesMode,
} from "../obsidian/slidesMode";
import type { YamlParser } from "../yaml/yamlParser";

// Where each slide starts in a note, shared by the preview's cursor sync and
// the slide overview panel.

/**
 * Slide position ("h,v") → line where that slide starts, counted in the
 * note's body (after the frontmatter). Entries are in note order.
 */
export function getSlideLines(
    source: string,
    separators: Options,
): Map<string, number> {
    const mode = slidesMode(separators);
    if (mode !== "separators") {
        const { starts } =
            mode === "blocks"
                ? blocksToSlides(source)
                : headingsToSlides(source, []);
        return new Map(starts.map((line, i) => [`${i},0`, line]));
    }

    let store = new Map<number, string>();

    const l = getIdxOfRegex(/^/gm, source);
    const h = getIdxOfRegex(RegExp(separators.separator, "gm"), source);

    for (const item of h) {
        for (let index = 0; index < l.length; index++) {
            const line = l[index];
            if (line > item) {
                store.set(index, "h");
                break;
            }
        }
    }

    const v = getIdxOfRegex(RegExp(separators.verticalSeparator, "gm"), source);

    for (const item of v) {
        for (let index = 0; index < l.length; index++) {
            const line = l[index];
            if (line > item) {
                store.set(index, "v");
                break;
            }
        }
    }

    store.set(0, "h");

    store = new Map(
        [...store].sort((a, b) => {
            return a[0] - b[0];
        }),
    );

    const result = new Map<string, number>();

    let hV = -1;
    let vV = 0;
    for (const [key, value] of store.entries()) {
        if (value === "h") {
            hV++;
            vV = 0;
        }

        if (value === "v") {
            vV++;
        }

        result.set([hV, vV].join(","), key);
    }
    return result;
}

function getIdxOfRegex(regex: RegExp, source: string): number[] {
    const idxs: Array<number> = [] as number[];
    let m: RegExpExecArray | null;
    do {
        m = regex.exec(source);
        if (m) {
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            idxs.push(m.index);
        }
    } while (m);
    return idxs;
}

/**
 * The note line (0-based, frontmatter included) where each slide starts, in
 * deck order: entry i is the i-th slide as reveal lays them out for print.
 */
export function slideStartLines(source: string, yaml: YamlParser): number[] {
    const { yamlOptions, markdown } = yaml.parseYamlFrontMatter(source);
    const separators = yaml.getSlideOptions(yamlOptions);
    // Lines before the body = newlines before it (0 without frontmatter).
    const offset =
        source.substring(0, source.indexOf(markdown)).split("\n").length - 1;
    return [...getSlideLines(markdown, separators).values()].map(
        (line) => line + offset,
    );
}
