import type { Options } from "../src/@types";
import { PresetProcessor } from "../src/obsidian/processors/presetProcessor";
import { buildPresetCss, presetClass, STARTER_PRESETS } from "../src/presets";
import { YamlStore } from "../src/yaml/yamlStore";
import { getSlideOptions } from "./testUtils";

// The comment transformers read YamlStore.getInstance().options; MarkdownProcessor
// sets it for real, so mirror that here before exercising the processor directly.
beforeEach(() => {
    YamlStore.getInstance().options = getSlideOptions({});
});

const baseOptions = (over: Partial<Options>): Options =>
    ({
        separator: "\r?\n---\r?\n",
        verticalSeparator: "\r?\n--\r?\n",
        presets: [
            { name: "cover", accent: "#fff" },
            { name: "image-bg", css: "&{padding:0}" },
        ],
        ...over,
    }) as Options;

describe("presetClass", () => {
    it("slugifies the name", () => {
        expect(presetClass("image-bg")).toBe("slidey-preset-image-bg");
        expect(presetClass("My Cover!")).toBe("slidey-preset-my-cover");
    });
});

describe("buildPresetCss", () => {
    it("returns empty string for no presets", () => {
        expect(buildPresetCss(undefined)).toBe("");
        expect(buildPresetCss([])).toBe("");
    });

    it("scopes structured fields to the slide class", () => {
        const css = buildPresetCss([
            { name: "section", background: "#4dabf7", accent: "#fff" },
        ]);
        expect(css).toContain(".reveal .slides section.slidey-preset-section{");
        expect(css).toContain("--r-background-color:#4dabf7");
        expect(css).toContain(
            ".reveal .slides section.slidey-preset-section h1",
        );
    });

    it("substitutes & in raw css with the slide selector", () => {
        const css = buildPresetCss([{ name: "x", css: "& h1{color:red}" }]);
        expect(css).toBe(
            ".reveal .slides section.slidey-preset-x h1{color:red}",
        );
    });

    it("accepts a selector override (settings preview swatches)", () => {
        const css = buildPresetCss(
            [
                { name: "a", css: "& h1{color:red}" },
                { name: "b", align: "left" },
            ],
            (_, i) => `.swatch[data-swatch="${i}"]`,
        );
        expect(css).toContain('.swatch[data-swatch="0"] h1{color:red}');
        expect(css).toContain('.swatch[data-swatch="1"]{text-align:left;}');
        expect(css).not.toContain(".reveal");
    });

    it("neutralises attempts to close the style element", () => {
        const css = buildPresetCss([
            { name: "x", css: "&{}</style><script>alert(1)" },
        ]);
        expect(css).not.toContain("</style");
        expect(css).not.toContain("<script");
    });

    it("values cannot break out of the declaration block", () => {
        const css = buildPresetCss([
            { name: "x", background: "red;} body{display:none" },
        ]);
        // no stray braces or semicolons from the value -> only the one rule
        const braces = (css.match(/[{}]/g) ?? []).join("");
        expect(braces).toBe("{}");
    });

    it("every starter preset produces scoped css", () => {
        for (const preset of STARTER_PRESETS) {
            const css = buildPresetCss([preset]);
            expect(css).toContain(`section.${presetClass(preset.name)}`);
            expect(css).not.toContain("\n&");
        }
    });
});

describe("PresetProcessor", () => {
    const run = (markdown: string, over: Partial<Options> = {}) =>
        new PresetProcessor().process(markdown, baseOptions(over));

    it("is a no-op when no preset applies", () => {
        const md = "# Hello\n\n---\n\n# World";
        expect(run(md)).toBe(md);
    });

    it("applies the deck-wide preset to every slide", () => {
        const out = run("# One\n\n---\n\n# Two", { preset: "cover" });
        const matches = out.match(/slidey-preset-cover/g) ?? [];
        expect(matches).toHaveLength(2);
        expect(out).toMatch(
            /<!-- \.?slide:? class="slidey-preset-cover" -->/,
        );
    });

    it("lets a per-slide preset override the deck default", () => {
        const out = run(
            '# One\n\n---\n\n<!-- slide preset="image-bg" -->\n# Two',
            { preset: "cover" },
        );
        expect(out).toContain("slidey-preset-cover");
        expect(out).toContain("slidey-preset-image-bg");
        // the raw preset="" attribute is consumed
        expect(out).not.toContain('preset="image-bg"');
    });

    it('"preset: none" opts a slide out of the deck default', () => {
        const out = run('# One\n\n---\n\n<!-- slide preset="none" -->\n# Two', {
            preset: "cover",
        });
        const first = out.split("---")[0];
        const second = out.split("---")[1];
        expect(first).toContain("slidey-preset-cover");
        expect(second).not.toContain("slidey-preset-cover");
        // the preset="none" marker is scrubbed from the annotation
        expect(out).not.toContain('preset="none"');
    });

    it("ignores an unknown preset name", () => {
        const md = '<!-- slide preset="bogus" -->\n# One';
        expect(run(md)).toBe(md);
    });

    it("merges the preset class into an existing slide annotation", () => {
        const out = run('<!-- slide class="foo" -->\n# One', {
            preset: "cover",
        });
        expect(out).toMatch(
            /class="foo slidey-preset-cover"|class="slidey-preset-cover foo"/,
        );
    });
});
