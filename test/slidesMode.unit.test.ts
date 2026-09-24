import type { Options } from "../src/@types";
import { PresetProcessor } from "../src/obsidian/processors/presetProcessor";
import {
    applySlidesMode,
    blockOutline,
    blocksToSlides,
    HEADING_NOTES_SEPARATOR,
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

describe("blocksToSlides", () => {
    it("reads blocks case-insensitively", () => {
        expect(slidesMode({ slides: "Blocks" })).toBe("blocks");
    });

    it("keeps only %% slide %% regions", () => {
        const { markdown, starts } = blocksToSlides(
            "research\n%% slide %%\n# One\n%% endslide %%\nprose\n%% slide preset=quote %%\n> Two\n%% /slide %%\nmore prose",
        );
        expect(slidesOf(markdown)).toEqual([
            "# One",
            '<!-- slide preset="quote" -->\n> Two',
        ]);
        expect(starts).toEqual([1, 5]);
    });

    it("ends a region at the next marker or the end of the note", () => {
        const { markdown } = blocksToSlides(
            "%% slide %%\nA\n%% slide %%\nB\n---\nC",
        );
        expect(slidesOf(markdown)).toEqual(["A", "B\n---\nC"]);
    });

    it("ignores markers inside fenced code", () => {
        const md = "%% slide %%\n```\n%% slide %%\n%% endslide %%\n```";
        expect(slidesOf(blocksToSlides(md).markdown)).toEqual([
            "```\n%% slide %%\n%% endslide %%\n```",
        ]);
    });

    it("does not treat other words as markers", () => {
        expect(blockOutline("%% slideshow %%\n%% slide-deck %%")).toEqual([]);
    });

    it("shows a hint when there are no blocks", () => {
        const { markdown, starts } = blocksToSlides("just a note");
        expect(markdown).toContain("No slides yet");
        expect(starts).toEqual([0]);
    });

    it("outlines each marker with its preset", () => {
        expect(
            blockOutline("x\n%% slide preset=cover %%\ny\n%% slide %%"),
        ).toEqual([
            { line: 1, level: 0, preset: "cover", skip: false },
            { line: 3, level: 0, preset: "", skip: false },
        ]);
    });

    it("applySlidesMode switches to sentinels", () => {
        const options = getSlideOptions({
            slides: "blocks",
        } as Partial<Options>);
        const out = applySlidesMode("%% slide %%\nA\n%% slide %%\nB", options);
        expect(options.separator).toBe(HEADING_SLIDE_SEPARATOR);
        expect(slidesOf(out)).toEqual(["A", "B"]);
    });
});

describe("speaker notes and backgrounds", () => {
    const N = HEADING_NOTES_SEPARATOR;

    it("turns %% notes %% into the notes sentinel (headings)", () => {
        const { markdown } = headingsToSlides(
            "# A\nshown\n%% notes %%\nsay this\n%% note %%\nand this",
            [],
        );
        expect(slidesOf(markdown)).toEqual([
            `# A\nshown\n${N}\nsay this\nand this`,
        ]);
    });

    it("turns %% notes %% into the notes sentinel (blocks), not in code", () => {
        const { markdown } = blocksToSlides(
            "%% slide %%\nA\n```\n%% notes %%\n```\n%% Notes %%\nhi",
        );
        expect(slidesOf(markdown)).toEqual([
            `A\n\`\`\`\n%% notes %%\n\`\`\`\n${N}\nhi`,
        ]);
    });

    it("reads bg under a heading, alone or with a preset", () => {
        const { markdown } = headingsToSlides(
            "# A\n%% bg=photo.jpg %%\nx\n# B\n%% preset=quote bg=[[My pic.png|alt]] %%\n# C\n%% bg=#112233 %%",
            [],
        );
        expect(slidesOf(markdown)).toEqual([
            '<!-- slide bg="[[photo.jpg]]" -->\n# A\nx',
            '<!-- slide preset="quote" bg="[[My pic.png]]" -->\n# B',
            '<!-- slide bg="#112233" -->\n# C',
        ]);
    });

    it("reads bg on the %% slide %% line and passes URLs through", () => {
        const { markdown } = blocksToSlides(
            '%% slide preset=cover bg="https://x.io/a.jpg" %%\nA',
        );
        expect(slidesOf(markdown)).toEqual([
            '<!-- slide preset="cover" bg="https://x.io/a.jpg" -->\nA',
        ]);
    });

    it("keeps markers with unknown keys, and an explicit bg wins", () => {
        const { markdown } = headingsToSlides(
            '# A\n%% bg=a.jpg foo=1 %%\n# B\n%% bg=a.jpg %%\n<!-- slide bg="red" -->',
            [],
        );
        expect(slidesOf(markdown)).toEqual([
            "# A\n%% bg=a.jpg foo=1 %%",
            '# B\n<!-- slide bg="red" -->',
        ]);
    });

    it("applySlidesMode points notesSeparator at the sentinel", () => {
        const options = getSlideOptions({ slides: "headings" });
        applySlidesMode("# A", options);
        expect(options.notesSeparator).toBe(N);
    });
});

describe("separator mode markers", () => {
    const deck = (markdown: string, extra: Partial<Options> = {}) => {
        const options = getSlideOptions(extra);
        return { markdown: applySlidesMode(markdown, options), options };
    };

    it("reads markers at the top of each slide and keeps the separators", () => {
        const { markdown, options } = deck(
            "%% preset=cover %%\n# Hi\n\n---\n\n%% preset=quote bg=#224466 %%\n> Q\n--\n%% bg=photo.jpg %%\nText",
        );
        expect(options.separator).toBe("\r?\n---\r?\n");
        expect(markdown).toBe(
            '<!-- slide preset="cover" -->\n# Hi\n\n---\n<!-- slide preset="quote" bg="#224466" -->\n\n> Q\n--\n<!-- slide bg="[[photo.jpg]]" -->\nText',
        );
    });

    it("leaves markers below slide content alone", () => {
        const { markdown } = deck("# Hi\n%% preset=quote %%");
        expect(markdown).toBe("# Hi\n%% preset=quote %%");
    });

    it("merges into an existing slide comment above the markers", () => {
        const { markdown } = deck(
            '<!-- slide class="x" -->\n%% preset=quote %%\n# Hi',
        );
        expect(markdown).toBe('<!-- slide preset="quote" class="x" -->\n# Hi');
    });

    it("turns %% notes %% into the deck's notes separator", () => {
        expect(deck("# A\n%% notes %%\nsay this").markdown).toBe(
            "# A\nnote:\nsay this",
        );
        expect(
            deck("# A\n%% notes %%\nsay this", { notesSeparator: "Notes:" })
                .markdown,
        ).toBe("# A\nNotes:\nsay this");
    });

    it("leaves a note without markers unchanged", () => {
        const note = "# A\n\n---\n\n## B\n--\nC\n%% just a comment %%";
        expect(deck(note).markdown).toBe(note);
    });
});

describe("style markers", () => {
    it("hands style= to the processors as slidey-style", () => {
        const options = getSlideOptions({});
        expect(
            applySlidesMode("%% preset=cover style=night %%\n# Hi", options),
        ).toBe('<!-- slide preset="cover" slidey-style="night" -->\n# Hi');
    });

    it("works under a heading and in a block", () => {
        expect(
            headingsToSlides("# A\n%% style=paper %%\nText", []).markdown,
        ).toBe('<!-- slide slidey-style="paper" -->\n# A\nText');
        expect(blocksToSlides("%% slide style=bold %%\nB").markdown).toBe(
            '<!-- slide slidey-style="bold" -->\nB',
        );
    });

    it("keeps an inline style= on an existing slide comment", () => {
        const options = getSlideOptions({});
        expect(
            applySlidesMode(
                '<!-- slide style="color:red" -->\n%% style=night %%\n# Hi',
                options,
            ),
        ).toBe('<!-- slide slidey-style="night" style="color:red" -->\n# Hi');
    });
});

describe("layout markers", () => {
    it("hands layout= to the processors", () => {
        const options = getSlideOptions({});
        expect(
            applySlidesMode(
                "%% layout=two-column style=night %%\n# Hi",
                options,
            ),
        ).toBe('<!-- slide layout="two-column" slidey-style="night" -->\n# Hi');
    });

    it("heading levels pick layout and style; a marker wins", () => {
        const levels = {
            layouts: ["title", "two-column"],
            styles: ["", "paper"],
        };
        const note = "# A\n## B\n## C\n%% layout=quote %%";
        expect(slidesOf(headingsToSlides(note, [], levels).markdown)).toEqual([
            '<!-- slide layout="title" -->\n# A',
            '<!-- slide layout="two-column" slidey-style="paper" -->\n## B',
            '<!-- slide layout="quote" slidey-style="paper" -->\n## C',
        ]);
    });

    it("works in a block", () => {
        expect(
            blocksToSlides("%% slide layout=image-left %%\nB").markdown,
        ).toBe('<!-- slide layout="image-left" -->\nB');
    });
});

describe("per-slide overrides", () => {
    it("turns font/color/accent/size into inline CSS", () => {
        const options = getSlideOptions({});
        expect(
            applySlidesMode(
                '%% style=night font="Open Sans" color=#eee accent=red size=1.5 %%\n# Hi',
                options,
            ),
        ).toBe(
            "<!-- slide slidey-style=\"night\" style=\"--r-main-color:#eee; color:#eee; --r-heading-color:red; --r-link-color:red; --r-link-color-hover:red; --r-main-font:'Open Sans'; --r-heading-font:'Open Sans'; font-family:'Open Sans'; --r-main-font-size:63px; font-size:63px\" -->\n# Hi",
        );
    });

    it("merges with inline CSS already on the slide comment, which wins", () => {
        expect(
            headingsToSlides(
                '# A\n<!-- slide style="color:blue" -->\n%% color=red %%',
                [],
            ).markdown,
        ).toBe(
            '# A\n<!-- slide style="--r-main-color:red; color:red; color:blue" -->',
        );
    });

    it("works in a block; bad sizes are dropped", () => {
        expect(blocksToSlides("%% slide size=36px %%\nB").markdown).toBe(
            '<!-- slide style="--r-main-font-size:36px; font-size:36px" -->\nB',
        );
        expect(blocksToSlides("%% slide size=huge %%\nB").markdown).toBe("B");
    });

    it("can't break out of the attribute or the style", () => {
        expect(
            blocksToSlides("%% slide color=red;background:url(x)> %%\nB")
                .markdown,
        ).toBe(
            '<!-- slide style="--r-main-color:redbackground:url(x); color:redbackground:url(x)" -->\nB',
        );
    });
});
