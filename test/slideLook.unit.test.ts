import { deckStyle, lookChoices, pickLook } from "../src/domain/slideLook";
import { LookProcessor } from "../src/obsidian/processors/lookProcessor";
import { YamlStore } from "../src/yaml/yamlStore";
import { getSlideOptions } from "./testUtils";

// The comment transformers read YamlStore options.
beforeEach(() => {
    YamlStore.getInstance().options = getSlideOptions({});
});

describe("pickLook", () => {
    test.each([
        [
            "title",
            "# A Light at *Night*\n\nHow Slidey turns notes into slides",
            "center",
        ],
        [
            "title",
            "# Why we sleep better with rain\n\nNotes from a month",
            "left",
        ],
        ["title", "# Night sounds\n\nLisbon · 2026", "kicker"],
        ["statement", "Quiet is not silence.", "plain"],
        [
            "statement",
            "73% of people fall asleep faster with steady noise",
            "number",
        ],
        [
            "statement",
            "The best sound is the one you stop hearing after a minute or two.",
            "rule",
        ],
        [
            "bullets",
            "## Rules\n\n- Keep it low\n- No lyrics\n- Fade out by morning",
            "cards",
        ],
        [
            "bullets",
            "## Why\n\n- Steady, wide-band sound across the whole night\n- Masks sudden noises",
            "markers",
        ],
        ["bullets", "## Setup\n\n1. Pick a sound\n2. Set the timer", "steps"],
        [
            "bullets",
            "## Good and bad\n\n**Helps**\n- Rain\n- Fan\n**Wakes you**\n- Sirens",
            "compare",
        ],
        ["quote", "> Silence is loud at 3 a.m.\n> — Ana", "mark"],
        ["image-side", "![[a.jpg]]\n\n> Rain on the roof\n> — Survey", "photo"],
        [
            "image-side",
            "## Evening\n\n![[a.jpg]]\n\nStart at 22:30\n\n- one\n- two",
            "bleed",
        ],
        ["plain", "anything", ""],
    ])("%s %j → %s", (layout, slide, look) => {
        expect(pickLook(layout, slide)).toBe(look);
    });

    test("sections get a number only in decks with 3 or more", () => {
        expect(pickLook("section", "## Part", { sections: 2 })).toBe("block");
        expect(pickLook("section", "## Part", { sections: 3 })).toBe("number");
    });

    test("neighbors of the same layout differ when another look fits", () => {
        const slide = "## Avoid\n\n- Sirens\n- Talk radio\n- Songs you know";
        expect(pickLook("bullets", slide)).toBe("cards");
        expect(
            pickLook("bullets", slide, {
                prev: { layout: "bullets", look: "cards" },
            }),
        ).toBe("markers");
        expect(
            pickLook("bullets", slide, {
                prev: { layout: "title", look: "cards" },
            }),
        ).toBe("cards");
    });

    test("a look written on the slide wins when the layout has it", () => {
        expect(
            pickLook("bullets", "## A\n\n- x\n- y", { chosen: "steps" }),
        ).toBe("steps");
        expect(
            pickLook("bullets", "## A\n\n- x\n- y", { chosen: "nope" }),
        ).toBe("cards");
    });

    test("calm keeps defaults; bold prefers loud looks", () => {
        expect(pickLook("statement", "73% of people", { style: "calm" })).toBe(
            "plain",
        );
        expect(pickLook("bullets", "## A\n\n- x\n- y", { style: "calm" })).toBe(
            "markers",
        );
        expect(
            pickLook("bullets", "## A\n\n1. x\n2. y", { style: "calm" }),
        ).toBe("steps");
        expect(pickLook("section", "## A", { style: "calm" })).toBe("rule");
        expect(pickLook("title", "# Short", { style: "bold" })).toBe("left");
        expect(pickLook("quote", "> Hi", { style: "bold" })).toBe("mark");
    });

    test("deckStyle reads frontmatter", () => {
        expect(deckStyle("Bold")).toBe("bold");
        expect(deckStyle(undefined)).toBe("auto");
        expect(deckStyle("loud")).toBe("auto");
    });

    test("lookChoices lists the default and the looks that fit", () => {
        expect(lookChoices("bullets", "## A\n\n- x\n- y")).toEqual([
            "markers",
            "cards",
        ]);
        expect(lookChoices("nope", "x")).toEqual([]);
    });
});

describe("LookProcessor", () => {
    const options = {
        autoSlides: true,
        separator: "^\\r?\\n---\\r?\\n$",
        verticalSeparator: "^\\r?\\n--\\r?\\n$",
    } as never;
    const run = (md: string, extra = {}) =>
        new LookProcessor().process(md, {
            ...(options as object),
            ...extra,
        } as never);

    test("stamps the look class and leaves non-auto decks alone", () => {
        const md =
            '<!-- slide class="slidey-layout-bullets" -->\n## A\n\n- x\n- y';
        expect(run(md)).toContain("slidey-look-bullets-cards");
        expect(run(md, { autoSlides: false })).toBe(md);
    });

    test("a statement number becomes a counting number", () => {
        const out = run(
            '<!-- slide class="slidey-layout-statement" -->\n73% of people sleep',
        );
        expect(out).toContain(
            '<span class="slidey-big"><span class="slidey-count" style="--slidey-to:73"><span>73</span></span>%</span>',
        );
        expect(out).toContain("\nof people sleep");
    });

    test("sections are numbered across the deck", () => {
        const s = (t: string) =>
            `<!-- slide class="slidey-layout-section" -->\n## ${t}`;
        const out = run([s("One"), s("Two"), s("Three")].join("\n\n---\n\n"));
        expect(out).toContain('<span class="slidey-n">01</span>');
        expect(out).toContain('<span class="slidey-n">03</span>');
    });

    test("%% look %% (as slidey-look) wins and is removed", () => {
        const out = run(
            '<!-- slide class="slidey-layout-quote" slidey-look="bar" -->\n> Hi',
        );
        expect(out).toContain("slidey-look-quote-bar");
        expect(out).not.toContain('slidey-look="bar"');
    });
});

import { slashItems, slideAround } from "../src/obsidian/slashMenu";

describe("slash menu Look items", () => {
    test("slideAround takes the slide between separators, minus the cursor line", () => {
        const lines = [
            "# A",
            "",
            "---",
            "## Rules",
            "/lo",
            "- x",
            "- y",
            "---",
            "Next",
        ];
        expect(slideAround(lines, 4, "separators")).toBe("## Rules\n- x\n- y");
        expect(slideAround(["# A", "/l", "- x", "# B"], 1, "headings")).toBe(
            "# A\n- x",
        );
    });

    test("only the looks that fit, and only when a slide is given", () => {
        const titles = (slide?: string) =>
            slashItems("separators", {}, slide)
                .filter((i) => i.title.startsWith("Look:"))
                .map((i) => i.hint);
        expect(titles("## Rules\n- x\n- y")).toEqual([
            "%% look=markers %%",
            "%% look=cards %%",
        ]);
        expect(titles()).toEqual([]);
        expect(
            titles(
                "Just a paragraph of plain text that is long enough not to be a statement at all, really.",
            ),
        ).toEqual([]);
    });
});
