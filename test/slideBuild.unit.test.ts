import type { Options } from "../src/@types";
import { guessLayout } from "../src/domain/autoLayout";
import { focusPosition, stepLists } from "../src/domain/slideBuild";
import {
    blocksToSlides,
    HEADING_SLIDE_SEPARATOR,
    headingsToSlides,
    separatorMarkers,
} from "../src/obsidian/slidesMode";
import { overrideStyle } from "../src/presets";
import { CLICKER_KEYS } from "../src/reveal/clickerKeys";

const deck = (extra: Partial<Options> = {}) =>
    ({
        separator: "\r?\n---\r?\n",
        verticalSeparator: "\r?\n--\r?\n",
        ...extra,
    }) as Options;

describe("stepLists", () => {
    it("turns top-level items into fragment syntax", () => {
        expect(
            stepLists(["# T", "- a", "* b", "1. c", "2) d", "  - nested"]),
        ).toEqual(["# T", "+ a", "+ b", "1) c", "2) d", "  - nested"]);
    });

    it("leaves code and speaker notes alone", () => {
        expect(
            stepLists(["```", "- code", "```", "- a", "note:", "- n"]),
        ).toEqual(["```", "- code", "```", "+ a", "note:", "- n"]);
    });
});

describe("step bullets", () => {
    it("steps every slide with stepBullets: true", () => {
        expect(
            separatorMarkers("- a\n---\n- b", deck({ stepBullets: true })),
        ).toBe("+ a\n---\n+ b");
    });

    it("%% step %% turns it on for one slide, step=off off", () => {
        expect(separatorMarkers("%% step %%\n- a\n---\n- b", deck())).toBe(
            "- a\n---\n- b".replace("- a", "+ a"),
        );
        expect(
            separatorMarkers(
                "%% step=off %%\n- a\n---\n- b",
                deck({ stepBullets: true }),
            ),
        ).toBe("- a\n---\n+ b");
    });

    it("works in headings and blocks mode", () => {
        expect(headingsToSlides("# A\n%% step %%\n- a", []).markdown).toBe(
            "# A\n+ a",
        );
        expect(
            blocksToSlides("%% slide %%\n- a\n%% endslide %%", true).markdown,
        ).toBe("+ a");
        expect(
            headingsToSlides("# A\n- a\n# B\n- b", [], {}, true).markdown,
        ).toBe(`# A\n+ a${HEADING_SLIDE_SEPARATOR}# B\n+ b`);
    });
});

describe("focusPosition", () => {
    it.each([
        ["top", "center top"],
        ["bot", "center bottom"],
        ["bottom", "center bottom"],
        ["left", "left center"],
        ["right", "right center"],
        ["center", "center center"],
        ["top-left", "left top"],
        ["left,bot", "left bottom"],
        ["right center", "right center"],
    ])("%s → %s", (value, css) => {
        expect(focusPosition(value)).toBe(css);
    });

    it.each(["up", "left-right", "top top", "left top center", ""])(
        "rejects %p",
        (value) => {
            expect(focusPosition(value)).toBeUndefined();
        },
    );

    it("reaches the slide as a CSS variable and background position", () => {
        expect(
            separatorMarkers("%% focus=left top %%\n![](a.jpg)", deck()),
        ).toBe(
            '<!-- slide data-background-position="left top" style="--slidey-focus:left top" -->\n![](a.jpg)',
        );
        expect(overrideStyle({ focus: "center bottom" })).toBe(
            "--slidey-focus:center bottom",
        );
    });

    it("keeps a marker with a focus it can't read", () => {
        expect(separatorMarkers("%% focus=up %%\n# A", deck())).toBe(
            "%% focus=up %%\n# A",
        );
    });
});

describe("callouts", () => {
    it("are not guessed as a quote slide", () => {
        expect(guessLayout("> [!tip] Key point\n> body")).toBe("");
        expect(guessLayout("> a quote")).toBe("quote");
    });
});

describe("clicker keys", () => {
    it("blank-screen buttons toggle the black screen", () => {
        expect(CLICKER_KEYS["."]).toBe("togglePause");
        expect(CLICKER_KEYS.b).toBe("togglePause");
        expect(CLICKER_KEYS.PageDown).toBe("next");
    });
});
