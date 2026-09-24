// Slide presets — a named bundle of look-and-feel a slide can opt into, either
// as a deck-wide default (`preset:` in the note frontmatter) or per slide
// (`<!-- slide preset="quote" -->`). A preset resolves to a single CSS class on
// the <section>, plus generated CSS: the common knobs (background, text colour,
// accent, font scale, alignment) are structured fields so they can be edited in
// the settings UI without writing CSS; `css` is a raw escape hatch where `&`
// stands for the slide selector.

export interface SlidePreset {
    /** Identifier used in `preset:` / `preset="..."`, and as the CSS class suffix. */
    name: string;
    /** Optional friendly name for the settings UI. */
    label?: string;
    /** Slide background colour (any CSS colour). */
    background?: string;
    /** Main text colour. */
    color?: string;
    /** Accent colour — headings, links, rules. */
    accent?: string;
    /** Body font size multiplier (1 = theme default). */
    fontScale?: number;
    /** Heading font family (fonts installed on this computer). */
    headingFont?: string;
    /** Body text font family. */
    bodyFont?: string;
    /** Text alignment for the slide body. */
    align?: "left" | "center" | "right";
    /** Raw CSS. `&` is replaced with the slide selector. */
    css?: string;
}

const BASE_FONT_PX = 42;

export function presetClass(name: string): string {
    return `slidey-preset-${slug(name)}`;
}

export function styleClass(name: string): string {
    return `slidey-style-${slug(name)}`;
}

export function layoutClass(name: string): string {
    return `slidey-layout-${slug(name)}`;
}

function slug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

// `Open Sans` → `"Open Sans"`; lists and quoted names pass through.
function fontValue(value: string): string {
    const font = cleanValue(value);
    return /\s/.test(font) && !/[,"']/.test(font) ? `"${font}"` : font;
}

/** Strip characters that could break out of a value or the surrounding <style>. */
function cleanValue(value: string): string {
    return value.replace(/[<>{};]/g, "").trim();
}

function cleanRawCss(css: string): string {
    // Drop the "<" from anything that could end the surrounding <style> element
    // or open a <script>. `&` -> slide selector substitution is in the caller.
    return css.replace(/<(\s*\/?\s*(?:style|script))/gi, "$1");
}

/** One-off per-slide changes from `%% font=… color=… accent=… size=… %%`. */
export interface SlideOverrides {
    font?: string;
    color?: string;
    accent?: string;
    size?: string;
}

// `1.2` → 1.2 × the theme size; `36px`, `1.5em`, `120%` pass through.
function sizeValue(value: string): string {
    const size = value.trim();
    if (/^\d*\.?\d+$/.test(size)) {
        return Number(size) > 0
            ? `${Math.round(BASE_FONT_PX * Number(size))}px`
            : "";
    }
    return /^\d*\.?\d+(?:px|em|rem|%|pt|vw|vh)$/i.test(size) ? size : "";
}

/**
 * Inline CSS for a slide's one-off overrides, written into the slide
 * comment's `style` attribute. Inline custom properties beat the ones a
 * style or preset sets on the same <section>, and headings read them
 * through `var()`, so an override always wins. Single quotes only: the
 * result sits inside `style="…"`.
 */
export function overrideStyle(overrides: SlideOverrides): string {
    const clean = (value: string) => cleanValue(value).replace(/"/g, "");
    const decls: string[] = [];
    if (overrides.color) {
        const c = clean(overrides.color);
        decls.push(`--r-main-color:${c}`, `color:${c}`);
    }
    if (overrides.accent) {
        const a = clean(overrides.accent);
        decls.push(
            `--r-heading-color:${a}`,
            `--r-link-color:${a}`,
            `--r-link-color-hover:${a}`,
        );
    }
    if (overrides.font) {
        const font = clean(overrides.font).replace(/'/g, "");
        const f = /\s/.test(font) && !font.includes(",") ? `'${font}'` : font;
        decls.push(
            `--r-main-font:${f}`,
            `--r-heading-font:${f}`,
            `font-family:${f}`,
        );
    }
    const size = overrides.size ? sizeValue(overrides.size) : "";
    if (size) {
        decls.push(`--r-main-font-size:${size}`, `font-size:${size}`);
    }
    return decls.join("; ");
}

/**
 * Build the scoped CSS for every preset. `selectorFor` overrides the slide
 * selector (default: the reveal <section> carrying the preset class) — the
 * settings UI uses it to render live preview swatches from the same rules.
 */
export function buildPresetCss(
    presets: SlidePreset[] | undefined,
    selectorFor: (preset: SlidePreset, index: number) => string = (p) =>
        `.reveal .slides section.${presetClass(p.name)}`,
): string {
    if (!presets || presets.length === 0) {
        return "";
    }
    const blocks: string[] = [];
    presets.forEach((preset, index) => {
        if (!preset?.name) {
            return;
        }
        const sel = selectorFor(preset, index);
        const decls: string[] = [];
        if (preset.background) {
            const bg = cleanValue(preset.background);
            decls.push(`--r-background-color:${bg}`, `background-color:${bg}`);
        }
        if (preset.color) {
            const c = cleanValue(preset.color);
            decls.push(`--r-main-color:${c}`, `color:${c}`);
        }
        if (preset.accent) {
            const a = cleanValue(preset.accent);
            decls.push(
                `--r-heading-color:${a}`,
                `--r-link-color:${a}`,
                `--r-link-color-hover:${a}`,
            );
        }
        if (
            preset.fontScale &&
            preset.fontScale > 0 &&
            preset.fontScale !== 1
        ) {
            // The theme reads the variable on .reveal only, so set the size too.
            const size = `${Math.round(BASE_FONT_PX * preset.fontScale)}px`;
            decls.push(`--r-main-font-size:${size}`, `font-size:${size}`);
        }
        if (preset.bodyFont) {
            const f = fontValue(preset.bodyFont);
            decls.push(`--r-main-font:${f}`, `font-family:${f}`);
        }
        if (preset.headingFont) {
            decls.push(`--r-heading-font:${fontValue(preset.headingFont)}`);
        }
        if (preset.align) {
            decls.push(`text-align:${cleanValue(preset.align)}`);
        }
        if (decls.length > 0) {
            blocks.push(`${sel}{${decls.join(";")};}`);
        }
        // Headings read the variables set above rather than a fixed value,
        // so a per-slide override (inline, see overrideStyle) still wins.
        if (preset.accent) {
            blocks.push(
                `${sel} h1,${sel} h2,${sel} h3,${sel} h4{color:var(--r-heading-color);}`,
            );
        }
        if (preset.headingFont) {
            blocks.push(
                `${sel} h1,${sel} h2,${sel} h3,${sel} h4{font-family:var(--r-heading-font);}`,
            );
        }
        if (preset.css?.trim()) {
            blocks.push(cleanRawCss(preset.css).split("&").join(sel));
        }
    });
    return blocks.join("\n");
}

const IMAGE_LEFT_CSS = `&:has(> img, > p > img:only-child),& > div:has(> img, > p > img:only-child){display:flex!important;flex-flow:column wrap!important;justify-content:center!important;align-content:center!important;align-items:flex-start!important;column-gap:1.2em;height:100%;text-align:left}
& img,& p:has(> img:only-child){order:-1;flex:0 0 100%;width:42%;max-width:42%;height:100%;max-height:100%;object-fit:contain!important;margin:0}
& p:has(> img:only-child) img{width:100%;max-width:100%}
& > :not(img):not(p:has(> img:only-child)),& > div > :not(img):not(p:has(> img:only-child)){max-width:52%;margin-left:0;margin-right:0}`;

/** Starter CSS from earlier releases, upgraded in place if still unedited. */
const RETIRED_STARTER_CSS: Record<string, { from: string; to: string }> = {
    "image-left": {
        from: `&{display:grid!important;grid-template-columns:40% 1fr;gap:1em;align-items:center;justify-items:start}
& img{width:100%;height:auto;grid-row:1/999;align-self:center}`,
        to: IMAGE_LEFT_CSS,
    },
};

/**
 * Presets are copied into settings, so starter fixes don't reach existing
 * installs on their own. Swap in the new CSS only where the user never
 * edited the old starter CSS. Returns the names of upgraded presets.
 */
export function upgradeStarterPresets(
    presets: SlidePreset[] | undefined,
): string[] {
    const upgraded: string[] = [];
    for (const preset of presets ?? []) {
        const retired = RETIRED_STARTER_CSS[preset?.name];
        if (retired && preset.css === retired.from) {
            preset.css = retired.to;
            upgraded.push(preset.name);
        }
    }
    return upgraded;
}

export const STARTER_PRESETS: SlidePreset[] = [
    {
        name: "cover",
        label: "Cover / title",
        accent: "#4dabf7",
        align: "center",
        css: `& h1{font-size:2.4em;margin-bottom:.2em}
& > *:not(h1){opacity:.85;font-size:.9em}`,
    },
    {
        name: "section",
        label: "Section divider",
        background: "#4dabf7",
        color: "#ffffff",
        accent: "#ffffff",
        align: "center",
        css: "& h1,& h2{font-size:2.6em;letter-spacing:.02em}",
    },
    {
        name: "quote",
        label: "Quote",
        align: "left",
        fontScale: 1.15,
        css: `&{font-style:italic}
& blockquote,& p{border-left:.15em solid var(--r-link-color,#4dabf7);padding-left:.6em}`,
    },
    {
        name: "image-left",
        label: "Image left, text right",
        align: "left",
        // Slide content usually sits in a full-size flex wrapper <div>, so the
        // layout goes on whichever element directly holds the image: a column
        // flex-wrap where the image fills the first column and the rest flows
        // into the second.
        css: IMAGE_LEFT_CSS,
    },
    {
        name: "bullets",
        label: "Bullet list",
        align: "left",
        css: `& ul,& ol{line-height:1.5}
& li{margin:.25em 0}
& li::marker{color:var(--r-link-color,#4dabf7)}`,
    },
    {
        name: "code",
        label: "Code focus",
        background: "#1e1e2e",
        color: "#e6e6e6",
        align: "left",
        css: `& pre{width:100%;font-size:.8em}
& pre code{max-height:70vh;padding:1em}`,
    },
    {
        name: "image-bg",
        label: "Full-bleed image background",
        align: "center",
        color: "#ffffff",
        css: `&{padding:0}
& img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;margin:0;border:0;box-shadow:none}
& > *:not(img){position:relative;z-index:1;text-shadow:0 2px 12px rgba(0,0,0,.6)}
&::after{content:"";position:absolute;inset:0;background:rgba(0,0,0,.35);z-index:0}`,
    },
];

// Slide styles — the look half of a slide (colors, fonts, sizes), kept apart
// from its layout so either can change on its own. Same fields and CSS
// generation as presets; picked with `style:` in the frontmatter or
// `%% style=night %%` on a slide, and stamped as `slidey-style-<name>`.
export type SlideStyle = SlidePreset;

export function buildStyleCss(styles: SlideStyle[] | undefined): string {
    return buildPresetCss(
        styles,
        (s) => `.reveal .slides section.${styleClass(s.name)}`,
    );
}

export const STARTER_STYLES: SlideStyle[] = [
    {
        name: "night",
        label: "Night",
        background: "#0f172a",
        color: "#e2e8f0",
        accent: "#38bdf8",
    },
    {
        name: "paper",
        label: "Paper",
        background: "#fbf8f1",
        color: "#2b2b2b",
        accent: "#b5542d",
        headingFont: "Georgia, serif",
        bodyFont: "Georgia, serif",
    },
    {
        name: "clean",
        label: "Clean white",
        background: "#ffffff",
        color: "#222222",
        accent: "#1c7ed6",
        headingFont: "Helvetica, Arial, sans-serif",
        bodyFont: "Helvetica, Arial, sans-serif",
    },
    {
        name: "bold",
        label: "Bold",
        background: "#111111",
        color: "#ffffff",
        accent: "#ffd43b",
        headingFont: '"Arial Black", Arial, sans-serif',
        fontScale: 1.1,
    },
    {
        name: "ocean",
        label: "Ocean",
        background: "#0b3954",
        color: "#e0fbfc",
        accent: "#7bdff2",
    },
];

// Slide layouts — the structure half of a slide (where the title, text and
// image go), a fixed set shipped with the plugin rather than edited in
// Settings. Picked with `layout:` in the frontmatter or `%% layout=two-column %%`
// on a slide, and stamped as `slidey-layout-<name>`. Layouts leave colors and
// fonts to styles. Content usually sits in a full-size wrapper <div> inside the
// <section> (see docs/presets.md), so rules reach through it.
export type SlideLayout = Pick<SlidePreset, "name" | "label" | "css">;

export function buildLayoutCss(): string {
    return buildPresetCss(
        LAYOUTS,
        (l) => `.reveal .slides section.${layoutClass(l.name)}`,
    );
}

// Images on every slide: shrink to fit the 960×700 slide instead of spilling
// off it, and 2+ pictures side by side as a row with any text above/below.
// Layout and preset rules (`section.slidey-…`) are more specific, so they win.
export const IMAGE_FIT_CSS = `.reveal .slides section > div > img,.reveal .slides section > img{flex:0 1 auto;min-height:0;min-width:0;max-width:100%;max-height:100%;object-fit:contain}
.reveal .slides section:not([class*="image-"]) > div:has(> img ~ img){flex-flow:row wrap!important;align-content:center;align-items:center;column-gap:.5em}
.reveal .slides section:not([class*="image-"]) > div:has(> img ~ img) > :not(img){flex:0 0 100%}
.reveal .slides section:not([class*="image-"]) > div:has(> img ~ img) > img{flex:1 1 0;width:0;height:auto;max-height:60%}`;

// Headings span both columns; everything after flows down one, then the other.
const TWO_COLUMN_CSS = `&:not(:has(> div)),& > div{display:block!important;column-count:2;column-gap:1.5em;column-fill:balance;text-align:left}
& :is(h1,h2,h3){column-span:all}
& :is(ul,ol){display:block}
& :is(p,li,img,pre,blockquote){break-inside:avoid}`;

const IMAGE_RIGHT_CSS = IMAGE_LEFT_CSS.replace("order:-1", "order:99");

export const LAYOUTS: SlideLayout[] = [
    {
        name: "title",
        label: "Title",
        css: `&{text-align:center}
& h1{font-size:2.4em;margin-bottom:.2em}
& h1 ~ *{opacity:.85;font-size:.9em}`,
    },
    {
        name: "section",
        label: "Section divider",
        css: `&{text-align:center}
& h1,& h2{font-size:2.6em;letter-spacing:.02em}`,
    },
    {
        name: "two-column",
        label: "Two columns",
        css: TWO_COLUMN_CSS,
    },
    {
        name: "image-left",
        label: "Image left, text right",
        css: IMAGE_LEFT_CSS,
    },
    {
        name: "image-right",
        label: "Text left, image right",
        css: IMAGE_RIGHT_CSS,
    },
    {
        name: "image-full",
        label: "Full-slide image, text on top",
        css: `&{text-align:center}
& img{position:absolute;inset:0;width:100%;height:100%;max-width:none;max-height:none;object-fit:cover!important;margin:0;border:0;box-shadow:none;filter:brightness(.6)}
& :is(h1,h2,h3,h4,ul,ol,blockquote),& p:not(:has(img)){position:relative;z-index:1;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.6)}`,
    },
    {
        name: "quote",
        label: "Quote",
        css: `&{text-align:left}
& blockquote{width:85%;font-size:1.25em;font-style:italic;background:none;box-shadow:none;border-left:.15em solid var(--r-link-color,#4dabf7);padding-left:.6em}`,
    },
    {
        name: "code",
        label: "Code focus",
        css: `&{text-align:left}
& pre{width:100%;font-size:.8em}
& pre code{max-height:70vh;padding:1em}`,
    },
];
