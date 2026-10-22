import { pickLang, SHORTCUT_GROUPS, t } from "../src/domain/strings";

describe("strings", () => {
    test("language follows Obsidian's setting, English by default", () => {
        expect(pickLang("pt-BR")).toBe("pt-BR");
        expect(pickLang("pt")).toBe("pt-BR");
        expect(pickLang("fr")).toBe("en");
        expect(pickLang(null)).toBe("en");
    });

    test("every shortcut row has text in both languages", () => {
        for (const group of SHORTCUT_GROUPS) {
            expect(t(group.title, "pt-BR")).not.toBe("");
            for (const row of group.rows) {
                expect(t(row.label, "en")).not.toBe("");
                expect(t(row.label, "pt-BR")).not.toBe(t(row.label, "en"));
            }
        }
    });
});
