import { markFor, presetDotColor } from "../src/obsidian/presetGutter";

describe("markFor (heading dot + pill)", () => {
    const presets = ["cover", "quote"];

    test("known preset: its name in its color", () => {
        expect(markFor(false, "quote", presets)).toMatchObject({
            kind: "preset",
            text: "quote",
            color: presetDotColor(1),
        });
    });

    test("no preset or none", () => {
        expect(markFor(false, "", presets).text).toBe("no preset");
        expect(markFor(false, "None", presets).kind).toBe("none");
    });

    test("unknown preset is flagged", () => {
        expect(markFor(false, "qoute", presets)).toMatchObject({
            kind: "unknown",
            text: "qoute?",
        });
    });

    test("noslide wins over the preset", () => {
        expect(markFor(true, "cover", presets)).toMatchObject({
            kind: "skip",
            text: "not a slide",
        });
    });
});
