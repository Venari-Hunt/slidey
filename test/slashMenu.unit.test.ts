import {
    CURSOR,
    deckMode,
    filterSlashItems,
    inFencedCode,
    slashItems,
    slashQuery,
} from "../src/obsidian/slashMenu";

const looks = {
    styles: [{ name: "night", label: "Night" }],
    presets: [{ name: "quote", label: "Quote" }],
};

describe("deckMode", () => {
    test("no frontmatter or no deck key: not a deck", () => {
        expect(deckMode(null)).toBeNull();
        expect(deckMode({ tags: ["x"] })).toBeNull();
    });

    test("slides: picks the mode; other deck keys mean separators", () => {
        expect(deckMode({ slides: "headings" })).toBe("headings");
        expect(deckMode({ slides: "blocks" })).toBe("blocks");
        expect(deckMode({ style: "night" })).toBe("separators");
    });
});

describe("slashItems", () => {
    const titles = (mode: Parameters<typeof slashItems>[0]) =>
        slashItems(mode, looks).map((item) => item.title);

    test("new slide matches the mode", () => {
        const insertOf = (mode: Parameters<typeof slashItems>[0]) =>
            slashItems(mode, looks).find((item) => item.title === "New slide")
                ?.insert;
        expect(insertOf("headings")).toBe(`## ${CURSOR}`);
        expect(insertOf("separators")).toBe(`---\n${CURSOR}`);
        expect(insertOf("blocks")).toContain("%% endslide %%");
    });

    test("lists layouts, styles and presets from settings", () => {
        const all = titles("headings");
        expect(all).toContain("Layout: Two columns");
        expect(all).toContain("Style: Night");
        expect(all).toContain("Preset: Quote");
        expect(
            slashItems("headings", looks).find(
                (item) => item.title === "Style: Night",
            )?.insert,
        ).toBe("%% style=night %%");
    });

    test("mode-only items", () => {
        expect(titles("headings")).toContain("Leave this section out");
        expect(titles("separators")).toContain("New slide below (vertical)");
        expect(titles("separators")).not.toContain("Leave this section out");
        expect(titles("blocks")).toContain("End slide");
    });

    test("a non-deck note only offers to become a deck", () => {
        const items = slashItems(null, looks);
        expect(items.every((item) => item.makeDeck)).toBe(true);
    });
});

test("preview item shows the note instead of toggling the preview", () => {
    const item = slashItems("headings", looks).find(
        (i) => i.title === "Open slide preview",
    );
    expect(item?.showPreview).toBe(true);
    expect(item?.command).toBeUndefined();
});

describe("filterSlashItems", () => {
    const items = slashItems("headings", looks);

    test("empty query keeps everything", () => {
        expect(filterSlashItems(items, "")).toHaveLength(items.length);
    });

    test("matches word starts in title and keywords", () => {
        const found = filterSlashItems(items, "two").map((i) => i.title);
        expect(found).toEqual(["Layout: Two columns"]);
        expect(filterSlashItems(items, "bg").map((i) => i.title)).toContain(
            "Background color",
        );
    });

    test("hyphenated names match", () => {
        expect(
            filterSlashItems(items, "two-column").map((i) => i.title),
        ).toEqual(["Layout: Two columns"]);
    });

    test("titles starting with the query come first", () => {
        expect(filterSlashItems(items, "back")[0].title).toBe(
            "Background picture",
        );
    });

    test("nothing matches: empty, so other / menus take over", () => {
        expect(filterSlashItems(items, "table")).toEqual([]);
    });
});

describe("slashQuery", () => {
    test("at line start or after a space", () => {
        expect(slashQuery("/lay", 4)).toEqual({ start: 0, query: "lay" });
        expect(slashQuery("- item /frag", 12)).toEqual({
            start: 7,
            query: "frag",
        });
        expect(slashQuery("/", 1)).toEqual({ start: 0, query: "" });
    });

    test("not inside words, paths or after a space in the query", () => {
        expect(slashQuery("a/b", 3)).toBeNull();
        expect(slashQuery("https://x", 9)).toBeNull();
        expect(slashQuery("/two col", 8)).toBeNull();
    });
});

describe("inFencedCode", () => {
    const lines = ["text", "```js", "code", "```", "after", "~~~", "x"];
    test("inside and outside fences", () => {
        expect(inFencedCode(lines, 0)).toBe(false);
        expect(inFencedCode(lines, 2)).toBe(true);
        expect(inFencedCode(lines, 4)).toBe(false);
        expect(inFencedCode(lines, 6)).toBe(true);
    });
});
