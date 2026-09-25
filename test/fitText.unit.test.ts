import type { SlidesExtendedSettings } from "../src/@types";
import { FIT_TEXT_SCRIPT, MIN_SCALE } from "../src/reveal/fitText";
import { DEFAULT_SETTINGS } from "../src/slidesExtended-constants";
import { YamlParser } from "../src/yaml/yamlParser";

describe("FIT_TEXT_SCRIPT", () => {
    test("is valid JavaScript", () => {
        expect(() => new Function(FIT_TEXT_SCRIPT)).not.toThrow();
    });

    test("never shrinks below MIN_SCALE", () => {
        expect(FIT_TEXT_SCRIPT).toContain(`var MIN_SCALE = ${MIN_SCALE};`);
        expect(MIN_SCALE).toBe(0.5);
    });
});

describe("fitText setting", () => {
    const parser = (fitText: boolean) =>
        new YamlParser({
            ...DEFAULT_SETTINGS,
            fitText,
        } as SlidesExtendedSettings);

    test("on by default", () => {
        expect(DEFAULT_SETTINGS.fitText).toBe(true);
        expect(parser(true).getTemplateSettings({}).fitText).toBe(true);
    });

    test("a note's fitText: false wins over the setting", () => {
        expect(
            parser(true).getTemplateSettings({ fitText: false }).fitText,
        ).toBe(false);
    });

    test("the setting turned off applies to every deck", () => {
        expect(parser(false).getTemplateSettings({}).fitText).toBe(false);
    });
});
