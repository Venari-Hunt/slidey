import { markFor, presetDotColor } from "../src/obsidian/presetGutter";

describe("markFor (heading dot + pill)", () => {
    const known = {
        presets: ["cover", "quote"],
        layouts: ["title", "two-column"],
        styles: ["night", "paper"],
    };
    const look = (
        picks: Partial<Record<"preset" | "layout" | "style", string>>,
    ) => ({
        preset: "",
        layout: "",
        style: "",
        ...picks,
    });

    test("known preset: its name in its color", () => {
        expect(markFor(false, look({ preset: "quote" }), known)).toMatchObject({
            kind: "preset",
            text: "quote",
            color: presetDotColor(1),
        });
    });

    test("layout · style, colored by the style", () => {
        expect(
            markFor(
                false,
                look({ layout: "two-column", style: "paper" }),
                known,
            ),
        ).toMatchObject({
            kind: "preset",
            text: "two-column · paper",
            label: "Slide · layout: two-column, style: paper",
            color: presetDotColor(1),
        });
    });

    test("layout alone gets a neutral color", () => {
        expect(markFor(false, look({ layout: "title" }), known).color).toBe(
            "var(--text-muted)",
        );
    });

    test("nothing picked, or none", () => {
        expect(markFor(false, look({}), known).text).toBe("plain");
        expect(markFor(false, look({ preset: "None" }), known).kind).toBe(
            "none",
        );
    });

    test("unknown name is flagged", () => {
        expect(
            markFor(false, look({ layout: "title", style: "nigth" }), known),
        ).toMatchObject({
            kind: "unknown",
            text: "title · nigth?",
        });
    });

    test("noslide wins over the picks", () => {
        expect(markFor(true, look({ preset: "cover" }), known)).toMatchObject({
            kind: "skip",
            text: "not a slide",
        });
    });
});
