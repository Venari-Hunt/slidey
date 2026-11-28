import { readFileSync } from "node:fs";
import { join } from "node:path";
import { protectFencedCode } from "../src/obsidian/fencedCode";

// The browser-side plugin turns a placeholder into reveal's code block; line
// marks in the fence's info string must reach reveal's renderer as `[2-3]`.
type Plugin = {
    lineMarks(fenceText: string): string;
    fencedCodePlaceholderRegex: RegExp;
    processFencedCodePlaceholder(
        marked: unknown,
        self: Plugin,
        token: { text: string },
    ): { meta: { text: string; lang: string } } | undefined;
    base64ToUtf8(b64: string): string;
    fenceContent(text: string): string;
};

function loadPlugin(): Plugin {
    const source = readFileSync(
        join(__dirname, "../reveal-dist/plugin/obsidian-markdown.js"),
        "utf8",
    );
    const win: Record<string, unknown> = {};
    new Function("window", source)(win);
    return win.ObsidianMarkdown as Plugin;
}

describe("Code line marks", () => {
    const plugin = loadPlugin();

    test.each([
        ["```js [2-3]\nx\n```", " [2-3]"],
        ["```js [2,4-5]\nx\n```", " [2,4-5]"],
        ["```js [25: 1,4-8]\nx\n```", " [25: 1,4-8]"],
        ["~~~py [1|3]\nx\n~~~", " [1|3]"],
        ["```js\nx\n```", ""],
        ["```js []\nx\n```", ""],
        ["```js\n[2]\n```", ""],
    ])("%j → %j", (fence, marks) => {
        expect(plugin.lineMarks(fence)).toBe(marks);
    });

    test("a protected fence decodes with its marks in the language", () => {
        const placeholder = protectFencedCode("```js [2-3]\na()\nb()\n```").trim();
        const token = { text: placeholder };
        const out = plugin.processFencedCodePlaceholder({}, plugin, token);
        expect(out?.meta.lang).toBe("js [2-3]");
        expect(out?.meta.text).toBe("a()\nb()\n");
    });
});
