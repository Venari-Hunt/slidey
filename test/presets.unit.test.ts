import type { Options } from "../src/@types";
import {
    LAYOUTS_KIND,
    PresetProcessor,
    STYLES,
} from "../src/obsidian/processors/presetProcessor";
import {
    buildLayoutCss,
    buildPresetCss,
    buildStyleCss,
    LAYOUTS,
    layoutClass,
    presetClass,
    STARTER_PRESETS,
    STARTER_STYLES,
    styleClass,
    upgradeStarterPresets,
} from "../src/presets";
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
        expect(out).toMatch(/<!-- \.?slide:? class="slidey-preset-cover" -->/);
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

describe("upgradeStarterPresets", () => {
    const oldImageLeft = `&{display:grid!important;grid-template-columns:40% 1fr;gap:1em;align-items:center;justify-items:start}
& img{width:100%;height:auto;grid-row:1/999;align-self:center}`;

    it("replaces unedited retired starter CSS", () => {
        const presets = [{ name: "image-left", css: oldImageLeft }];
        expect(upgradeStarterPresets(presets)).toEqual(["image-left"]);
        expect(presets[0].css).toBe(
            STARTER_PRESETS.find((p) => p.name === "image-left")?.css,
        );
    });

    it("leaves user-edited CSS alone", () => {
        const presets = [
            { name: "image-left", css: `${oldImageLeft}\n& h2{}` },
        ];
        expect(upgradeStarterPresets(presets)).toEqual([]);
        expect(presets[0].css).toContain("& h2{}");
    });
});

describe("styles", () => {
    const styleOptions = (over: Partial<Options>): Options =>
        baseOptions({
            styles: [
                { name: "night", background: "#0f172a" },
                { name: "paper", headingFont: "Open Sans" },
            ],
            ...over,
        });
    const styles = new PresetProcessor(STYLES);

    it("builds font CSS, quoting names with spaces", () => {
        const css = buildStyleCss([
            {
                name: "paper",
                headingFont: "Open Sans",
                bodyFont: "Georgia, serif",
            },
        ]);
        expect(css).toContain(".reveal .slides section.slidey-style-paper{");
        expect(css).toContain("--r-main-font:Georgia, serif");
        expect(css).toContain('--r-heading-font:"Open Sans"');
        expect(css).toContain(
            ".reveal .slides section.slidey-style-paper h1,.reveal .slides section.slidey-style-paper h2,.reveal .slides section.slidey-style-paper h3,.reveal .slides section.slidey-style-paper h4{font-family:var(--r-heading-font);}",
        );
    });

    it("applies the frontmatter default style with its background", () => {
        const out = styles.process("# A", styleOptions({ style: "night" }));
        expect(out).toContain(styleClass("night"));
        expect(out).toContain('data-background-color="#0f172a"');
    });

    it("per-slide slidey-style wins and is removed from the comment", () => {
        const out = styles.process(
            '<!-- slide slidey-style="paper" -->\n# A',
            styleOptions({ style: "night" }),
        );
        expect(out).toContain(styleClass("paper"));
        expect(out).not.toContain("slidey-style=");
        expect(out).not.toContain(styleClass("night"));
    });

    it("leaves a preset alone and runs beside it", () => {
        const options = styleOptions({});
        const out = new PresetProcessor().process(
            styles.process(
                '<!-- slide preset="cover" slidey-style="night" -->\n# A',
                options,
            ),
            options,
        );
        expect(out).toContain(presetClass("cover"));
        expect(out).toContain(styleClass("night"));
    });

    it("ships starter styles with unique names", () => {
        const names = STARTER_STYLES.map((s) => s.name);
        expect(new Set(names).size).toBe(names.length);
        expect(names.length).toBeGreaterThan(0);
    });
});

describe("layouts", () => {
    const layouts = new PresetProcessor(LAYOUTS_KIND);

    it("builds CSS for every layout, scoped to its class", () => {
        const css = buildLayoutCss();
        for (const layout of LAYOUTS) {
            expect(css).toContain(
                `.reveal .slides section.${layoutClass(layout.name)}`,
            );
        }
        expect(css).not.toContain("&");
    });

    it("ships layouts with unique names", () => {
        const names = LAYOUTS.map((l) => l.name);
        expect(new Set(names).size).toBe(names.length);
        expect(names).toEqual(
            expect.arrayContaining(["title", "two-column", "image-left"]),
        );
    });

    it("applies the frontmatter layout without needing settings", () => {
        const out = layouts.process("# A", baseOptions({ layout: "title" }));
        expect(out).toContain(layoutClass("title"));
        expect(out).not.toContain("data-background-color");
    });

    it("per-slide layout wins and is removed from the comment", () => {
        const out = layouts.process(
            '<!-- slide layout="two-column" -->\n# A',
            baseOptions({ layout: "title" }),
        );
        expect(out).toContain(layoutClass("two-column"));
        expect(out).not.toContain(layoutClass("title"));
        expect(out).not.toContain("layout=");
    });

    it("leaves an unknown layout name alone", () => {
        const slide = '<!-- slide layout="nope" -->\n# A';
        expect(layouts.process(slide, baseOptions({}))).toBe(slide);
    });
});

describe("fonts", () => {
    it("quotes only font names with spaces", () => {
        const css = buildStyleCss([
            { name: "a", bodyFont: "Consolas", headingFont: "Open Sans" },
        ]);
        expect(css).toContain("--r-main-font:Consolas;");
        expect(css).toContain('--r-heading-font:"Open Sans"');
    });
});
