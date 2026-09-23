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
    /** Text alignment for the slide body. */
    align?: "left" | "center" | "right";
    /** Raw CSS. `&` is replaced with the slide selector. */
    css?: string;
}

const BASE_FONT_PX = 42;

export function presetClass(name: string): string {
    return `slidey-preset-${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}`;
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
            decls.push(
                `--r-main-font-size:${Math.round(BASE_FONT_PX * preset.fontScale)}px`,
            );
        }
        if (preset.align) {
            decls.push(`text-align:${cleanValue(preset.align)}`);
        }
        if (decls.length > 0) {
            blocks.push(`${sel}{${decls.join(";")};}`);
        }
        if (preset.accent) {
            const a = cleanValue(preset.accent);
            blocks.push(`${sel} h1,${sel} h2,${sel} h3,${sel} h4{color:${a};}`);
        }
        if (preset.css?.trim()) {
            blocks.push(cleanRawCss(preset.css).split("&").join(sel));
        }
    });
    return blocks.join("\n");
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
        css: `&{display:grid!important;grid-template-columns:40% 1fr;gap:1em;align-items:center;justify-items:start}
& img{width:100%;height:auto;grid-row:1/999;align-self:center}`,
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
