import type { SlidePreset } from "./presets";

/**
 * A miniature sample slide styled by a look's generated CSS (scoped to
 * `[data-swatch="id"]`). Unset fields fall back to the default (black)
 * theme's colors. The heading is a real <h1> because look CSS targets it.
 */
export function drawPresetSwatch(
    box: HTMLElement,
    preset: SlidePreset,
    id: string,
): void {
    const swatch = box.createDiv({
        cls: "slidey-preset-swatch",
        attr: { "data-swatch": id, "aria-hidden": "true" },
    });
    if (/\bimg\b/.test(preset.css ?? "")) {
        swatch.createEl("img", { attr: { src: SWATCH_IMAGE, alt: "" } });
    }
    swatch.createEl("h1", { text: preset.label || preset.name || "Title" });
    swatch.createEl("p", { text: "Body text looks like this." });
    const list = swatch.createEl("ul");
    list.createEl("li", { text: "A bullet point" });
    list.createEl("li", { text: "Another one" });
}

/**
 * Holds the swatches' CSS in one constructed stylesheet adopted by the
 * settings window's document (the settings can open in a popout window, so
 * the sheet is rebuilt whenever the document changes). Obsidian's review
 * rules forbid <style> elements; user-written look CSS can't be expressed
 * as CSS properties on the swatch.
 */
export class SwatchStylesheet {
    private parts = new Map<string, string>();
    private sheet: CSSStyleSheet | null = null;
    private doc: Document | null = null;

    /** Replace the CSS for one group of swatches and re-apply. */
    set(el: HTMLElement, key: string, css: string): void {
        this.parts.set(key, css);
        const doc = el.ownerDocument;
        if (doc !== this.doc) {
            this.detach();
            const win = doc.defaultView;
            if (!win) {
                return;
            }
            this.doc = doc;
            this.sheet = new win.CSSStyleSheet();
            doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, this.sheet];
        }
        this.sheet?.replaceSync([...this.parts.values()].join("\n"));
    }

    /** Remove the sheet from its document and forget all CSS. */
    detach(): void {
        if (this.doc && this.sheet) {
            const sheet = this.sheet;
            this.doc.adoptedStyleSheets = this.doc.adoptedStyleSheets.filter(
                (s) => s !== sheet,
            );
        }
        this.doc = null;
        this.sheet = null;
    }

    clear(): void {
        this.detach();
        this.parts.clear();
    }
}

/** Placeholder picture for presets whose CSS styles images. */
const SWATCH_IMAGE =
    "data:image/svg+xml," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90">' +
            '<rect width="160" height="90" fill="#5c7cfa"/>' +
            '<circle cx="120" cy="25" r="12" fill="#ffd43b"/>' +
            '<path d="M0 90 50 40 90 75 115 55 160 90Z" fill="#2b8a3e"/></svg>',
    );
