import {
    autoDeckSize,
    guessLayout,
    isAutoDeck,
    separateQuoteCredit,
} from "../src/domain/autoLayout";

describe("guessLayout", () => {
    test.each([
        ["# Q3 Plan", "title"],
        ["# Q3 Plan\n\nWhere we go next quarter", "title"],
        ["## Why now", "section"],
        ["## Three bets\n\n- Onboarding\n- Pricing\n- Mobile", "bullets"],
        ["## Steps\n\n1. One\n2. Two", "bullets"],
        ["## Many\n\n- a\n- b\n- c\n- d\n- e\n- f\n- g\n- h", "two-column"],
        ["> I'd pay double for this\n> — Ana", "quote"],
        ["## They said\n\n> Ship it", "quote"],
        ["![[team.jpg]]", "image-full"],
        ["## Demo\n\n![](demo.png)", "image-full"],
        ["## Demo\n\n![[demo.png]]\n\n- fast\n- simple", "image-side"],
        ["![[sea.jpg]]\n\nIntention is everything.", "image-full"],
        ["# North\n\n![[sea.jpg]]\n\nWhere we go next", "image-full"],
        ["![[sea.jpg]]\n\n> Ship it", "image-side"],
        ["![[sea.jpg]]\n\nOne line.\nAnother line.", "image-side"],
        ["```js\nlet a = 1;\n```", "code"],
        ["Nobody reads slides with 40 words on them.", "statement"],
        ["## Context\n\nA paragraph of text.", ""],
        ["", ""],
    ])("%j → %s", (slide, layout) => {
        expect(guessLayout(slide)).toBe(layout);
    });

    test("ignores comments, markers and speaker notes", () => {
        expect(
            guessLayout(
                '<!-- slide bg="red" -->\n%% x %%\n# Hello\n\nnote:\n- a\n- b',
            ),
        ).toBe("title");
    });
});

describe("isAutoDeck", () => {
    test("on when the setting is on", () => {
        expect(isAutoDeck({ autoSlides: true })).toBe(true);
        expect(isAutoDeck({})).toBe(false);
        expect(isAutoDeck({ autoSlides: true, style: "", preset: " " })).toBe(
            true,
        );
    });
    test("off when the note picks a look or turns it off", () => {
        expect(isAutoDeck({ autoSlides: true, style: "night" })).toBe(false);
        expect(isAutoDeck({ autoSlides: true, preset: "cover" })).toBe(false);
        expect(isAutoDeck({ autoSlides: true, layout: "title" })).toBe(false);
        expect(isAutoDeck({ autoSlides: false })).toBe(false);
    });
});

describe("separateQuoteCredit", () => {
    test("splits a credit line off the quote", () => {
        expect(separateQuoteCredit("> Ship it\n> — Ana")).toBe(
            "> Ship it\n>\n> — Ana",
        );
    });
    test("leaves other quotes alone", () => {
        expect(separateQuoteCredit("> one\n> two")).toBe("> one\n> two");
    });
});

describe("autoDeckSize", () => {
    test("16:9 for auto decks", () => {
        expect(autoDeckSize({ autoSlides: true }, {})).toEqual({
            width: 1280,
            height: 720,
        });
    });
    test("keeps the note's own size, and old decks", () => {
        expect(autoDeckSize({ autoSlides: true }, { width: 960 })).toEqual({});
        expect(autoDeckSize({ autoSlides: true, style: "x" }, {})).toEqual({});
    });
});
