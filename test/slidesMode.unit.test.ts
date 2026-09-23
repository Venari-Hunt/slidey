import type { Options } from "../src/@types";
import { PresetProcessor } from "../src/obsidian/processors/presetProcessor";
import {
    applySlidesMode,
    HEADING_SLIDE_SEPARATOR,
    headingOutline,
    headingsToSlides,
    slidesMode,
} from "../src/obsidian/slidesMode";
import { YamlStore } from "../src/yaml/yamlStore";
import { getSlideOptions } from "./testUtils";

beforeEach(() => {
    YamlStore.getInstance().options = getSlideOptions({});
});

const slidesOf = (markdown: string) => markdown.split(HEADING_SLIDE_SEPARATOR);

describe("slidesMode", () => {
    it("defaults to separators", () => {
        expect(slidesMode({})).toBe("separators");
        expect(slidesMode({ slides: "separators" })).toBe("separators");
        expect(slidesMode({ slides: "nonsense" })).toBe("separators");
    });

    it("reads headings case-insensitively", () => {
        expect(slidesMode({ slides: " Headings " })).toBe("headings");
    });
});

describe("applySlidesMode", () => {
    it("leaves separator decks untouched", () => {
        const options = getSlideOptions({});
        const md = "# A\n\n---\n\n# B";
        expect(applySlidesMode(md, options)).toBe(md);
        expect(options.separator).toBe("\r?\n---\r?\n");
    });

    it("switches separators and applies level presets", () => {
        const options = getSlideOptions({
            slides: "headings",
            headingPresets: ["cover", "bullets"],
        });
        const out = applySlidesMode("# T\n\n## A\n- x", options);
        expect(options.separator).toBe(HEADING_SLIDE_SEPARATOR);
        expect(slidesOf(out)).toEqual([
            '<!-- slide preset="cover" -->\n# T\n',
            '<!-- slide preset="bullets" -->\n## A\n- x',
        ]);
    });
});

describe("headingsToSlides", () => {
    it("starts a slide at every heading and keeps --- as text", () => {
        const { markdown, starts } = headingsToSlides(
            "# One\ntext\n---\nmore\n## Two\n### Three",
            [],
        );
        expect(slidesOf(markdown)).toEqual([
            "# One\ntext\n---\nmore",
            "## Two",
            "### Three",
        ]);
        expect(starts).toEqual([0, 4, 5]);
    });

    it("keeps non-blank text before the first heading as a slide", () => {
        expect(slidesOf(headingsToSlides("intro\n\n# A", []).markdown)).toEqual(
            ["intro\n", "# A"],
        );
        expect(headingsToSlides("\n\n# A", []).starts).toEqual([2]);
    });

    it("ignores headings inside fenced code", () => {
        const md = "# A\n```bash\n# comment\n```\n~~~\n## no\n~~~";
        expect(slidesOf(headingsToSlides(md, []).markdown)).toEqual([md]);
    });

    it("drops %% noslide %% sections", () => {
        const { markdown, starts } = headingsToSlides(
            "# A\n## Notes\n%% noslide %%\nprivate\n## B",
            [],
        );
        expect(slidesOf(markdown)).toEqual(["# A", "## B"]);
        expect(starts).toEqual([0, 4]);
    });

    it("lets %% preset=x %% override the level preset", () => {
        const { markdown } = headingsToSlides(
            "## Q\n\n%% preset=quote %%\n> hi",
            ["cover", "bullets"],
        );
        expect(markdown).toBe('<!-- slide preset="quote" -->\n## Q\n\n> hi');
    });

    it("leaves other %% comments and later markers in place", () => {
        const { markdown } = headingsToSlides(
            "## Q\n%% todo %%\ntext\n%% noslide %%",
            [],
        );
        expect(markdown).toBe("## Q\n%% todo %%\ntext\n%% noslide %%");
    });

    it("merges into an existing slide comment, explicit preset wins", () => {
        expect(
            headingsToSlides('## A\n<!-- slide bg="red" -->', ["", "cover"])
                .markdown,
        ).toBe('## A\n<!-- slide preset="cover" bg="red" -->');
        expect(
            headingsToSlides('## A\n<!-- slide preset="quote" -->', [
                "",
                "cover",
            ]).markdown,
        ).toBe('## A\n<!-- slide preset="quote" -->');
    });
});

describe("headings mode through PresetProcessor", () => {
    it("stamps the preset class on each slide", () => {
        const options = getSlideOptions({
            slides: "headings",
            headingPresets: ["cover"],
            presets: [{ name: "cover" }],
        }) as Options;
        const deck = applySlidesMode("# Title\n## Plain", options);
        const out = new PresetProcessor().process(deck, options);
        const [first, second] = slidesOf(out);
        expect(first).toContain('class="slidey-preset-cover"');
        expect(second).toBe("## Plain");
    });
});

describe("headingOutline", () => {
    it("resolves each heading's preset, override and skip", () => {
        const note = [
            "intro",
            "# Title",
            "## Plain",
            "## Quote",
            "",
            "%% preset=quote %%",
            "```",
            "# not a heading",
            "```",
            "### Hidden",
            "%% noslide %%",
        ].join("\n");
        expect(headingOutline(note, ["cover", "", "bullets"])).toEqual([
            { line: 1, level: 1, preset: "cover", skip: false },
            { line: 2, level: 2, preset: "", skip: false },
            { line: 3, level: 2, preset: "quote", skip: false },
            { line: 9, level: 3, preset: "bullets", skip: true },
        ]);
    });
});
