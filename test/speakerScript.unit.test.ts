import { OVERVIEW_SCRIPT } from "../src/reveal/overviewScript";
import { MIRROR_QUERY, SPEAKER_SCRIPT } from "../src/reveal/speakerScript";

describe("deck-side scripts", () => {
    test("are valid JavaScript", () => {
        expect(() => new Function(SPEAKER_SCRIPT)).not.toThrow();
        expect(() => new Function(OVERVIEW_SCRIPT)).not.toThrow();
    });

    test("mirror copies can't be driven by the keyboard or show controls", () => {
        const query = new URLSearchParams(MIRROR_QUERY);
        expect(query.has("slidey-mirror")).toBe(true);
        expect(query.get("keyboard")).toBe("false");
        expect(query.get("controls")).toBe("false");
        expect(query.get("transition")).toBe("none");
    });
});
