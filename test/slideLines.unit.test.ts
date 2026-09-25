import type { SlidesExtendedSettings } from "../src/@types";
import { slideStartLines } from "../src/reveal/slideLines";
import { DEFAULT_SETTINGS } from "../src/slidesExtended-constants";
import { YamlParser } from "../src/yaml/yamlParser";

const yaml = new YamlParser({
    ...DEFAULT_SETTINGS,
    separator: "\r?\n---\r?\n",
    verticalSeparator: "\r?\n--\r?\n",
} as SlidesExtendedSettings);

describe("slideStartLines (note line of each slide, deck order)", () => {
    test("headings mode counts the frontmatter lines", () => {
        const note = [
            "---", // 0
            "slides: headings", // 1
            "---", // 2
            "# Title", // 3
            "", // 4
            "## Two", // 5
            "text", // 6
            "## Three", // 7
        ].join("\n");
        expect(slideStartLines(note, yaml)).toEqual([3, 5, 7]);
    });

    test("blocks mode: one entry per %% slide %% region", () => {
        const note = [
            "---",
            "slides: blocks",
            "---",
            "private", // 3
            "%% slide %%", // 4
            "# A",
            "%% endslide %%",
            "%% slide %%", // 7
            "# B",
        ].join("\n");
        expect(slideStartLines(note, yaml)).toHaveLength(2);
    });

    test("a note without frontmatter starts at line 0", () => {
        const note = ["# One", "", "---", "", "# Two"].join("\n");
        const lines = slideStartLines(note, yaml);
        expect(lines[0]).toBe(0);
        expect(lines).toHaveLength(2);
    });
});
