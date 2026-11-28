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
    /** Part of a cover picture kept in frame, as a CSS position ("left top"). */
    focus?: string;
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
    if (overrides.focus) {
        decls.push(`--slidey-focus:${clean(overrides.focus)}`);
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
        accent: "#e0b84c",
        align: "center",
        css: `& h1{font-size:2.4em;margin-bottom:.2em}
& > *:not(h1){opacity:.85;font-size:.9em}`,
    },
    {
        name: "section",
        label: "Section divider",
        background: "#3a2f12",
        color: "#ffd45c",
        accent: "#ffd45c",
        align: "center",
        css: "& h1,& h2{font-size:2.6em;letter-spacing:.02em}",
    },
    {
        name: "quote",
        label: "Quote",
        align: "left",
        fontScale: 1.15,
        css: `&{font-style:italic}
& blockquote,& p{border-left:.15em solid var(--r-link-color,#e0b84c);padding-left:.6em}`,
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
& li::marker{color:var(--r-link-color,#e0b84c)}`,
    },
    {
        name: "code",
        label: "Code focus",
        background: "#1b1b1f",
        color: "#ece9e2",
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

// The auto-deck fonts, bundled (see reveal/houseFont.ts): Poppins for headings
// and one-line statements, Inter for body text. Title cards (a picture with a
// line over it) use Poppins ExtraBold, or Rustica when installed.
export const HOUSE_FONT_NAME = "Slidey Poppins";
export const BODY_FONT_NAME = "Slidey Inter";
const HOUSE_FONT = `"${HOUSE_FONT_NAME}","Poppins","Segoe UI",system-ui,sans-serif`;
const BODY_FONT = `"${BODY_FONT_NAME}","Inter","Segoe UI",system-ui,sans-serif`;
const TITLE_CARD_FONT = `"Rustica",${HOUSE_FONT}`;

// Inline modifiers in an auto deck, all plain markdown Obsidian already shows
// (owner-approved mock-slidey-looks, 2026-11-25): `*x*` amber, `**x**` brighter,
// `==x==` an amber marker that sweeps in, `~~x~~` dimmed with an amber strike,
// `` `x` `` a small chip. Quotes keep their italics.
const AMBER_45 = "rgba(224,184,76,.45)";
const MODIFIERS_CSS = `.reveal .slides section:not([class*="layout-image-full"]) :is(p,li) > :is(em,i){font-style:normal;color:var(--r-link-color)}
.reveal .slides section blockquote :is(em,i){font-style:italic;color:inherit}
.reveal .slides section strong{color:var(--r-heading-color)}
.reveal .slides section mark{color:var(--r-heading-color);background:linear-gradient(${AMBER_45},${AMBER_45}) no-repeat 0 88%/100% 42%;padding:0 .08em}
.reveal .slides section.present mark{animation:slidey-sweep .7s cubic-bezier(.2,.8,.2,1) .2s both}
@keyframes slidey-sweep{from{background-size:0% 42%}}
.reveal .slides section del{color:#a3a09a;text-decoration-color:var(--r-link-color);text-decoration-thickness:.08em}
.reveal .slides section :not(pre) > code{font-size:.8em;padding:.08em .3em;border-radius:.2em;background:#1b1b1f;color:var(--r-main-color)}`;

// Looks per layout (domain/slideLook.ts stamps `slidey-look-<layout>-<look>`).
// The first look of each layout is today's look and has no rules here.
const LOOK = (layout: string, look: string) =>
    `.reveal .slides section.slidey-look-${layout}-${look}`;
const LOOKS_CSS = [
    // Title: big left, with a short amber bar over the subtitle.
    `${LOOK("title", "left")} > div{align-items:flex-start!important;justify-content:flex-end!important;text-align:left;padding-bottom:1.2em;box-sizing:border-box}
${LOOK("title", "left")} h1{font-size:2.7em;max-width:92%;text-align:left}
${LOOK("title", "left")} h1 ~ p{opacity:1;color:#a3a09a;text-align:left}
${LOOK("title", "left")} h1 ~ p::before{content:"";display:block;width:1.9em;height:.16em;border-radius:.08em;background:var(--r-link-color);margin-bottom:.6em}`,
    // Title: a 1-3 word line becomes an amber kicker above the heading.
    `${LOOK("title", "kicker")} h1 ~ p{order:-1;opacity:1;font:700 .63em/1 ${BODY_FONT};letter-spacing:.16em;text-transform:uppercase;color:var(--r-link-color);margin-bottom:.6em}`,
    // Section: big dim number beside the heading, or a "2 / 3" kicker and a progress rule.
    `.reveal-viewport:has(.slides section.present:is(.slidey-look-section-number,.slidey-look-section-rule)){background:var(--r-background-color)}
.reveal .slides section:is(.slidey-look-section-number,.slidey-look-section-rule) :is(h1,h2,h3,p){color:var(--r-heading-color)}
${LOOK("section", "number")} > div{flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:.9em}
${LOOK("section", "number")} > div > *{margin:0;text-align:left}
${LOOK("section", "number")} .slidey-n{font:800 6em/1 ${HOUSE_FONT};letter-spacing:-.04em;color:color-mix(in srgb,var(--r-link-color) 38%,var(--r-background-color))}
${LOOK("section", "rule")} > div{align-items:flex-start!important;justify-content:flex-end!important;text-align:left;padding-bottom:2.2em;box-sizing:border-box}
${LOOK("section", "rule")} > div > *{margin:0}
${LOOK("section", "rule")} .slidey-kick{font:700 .63em/1 ${BODY_FONT};letter-spacing:.16em;text-transform:uppercase;color:var(--r-link-color)!important;opacity:1;margin-bottom:.5em}
${LOOK("section", "rule")}::after{content:"";position:absolute;left:0;right:0;bottom:1.2em;height:.1em;border-radius:.05em;background:linear-gradient(90deg,var(--r-link-color) var(--slidey-p,30%),#1b1b1f 0)}`,
    // Statement: the number counts up on arrival; or an amber rule for longer lines.
    `@property --slidey-n{syntax:"<integer>";initial-value:0;inherits:false}
${LOOK("statement", "number")} p:has(.slidey-big){font-size:1em;margin:0 auto;max-width:none}
${LOOK("statement", "number")} .slidey-big{display:block;font:800 5em/1 ${HOUSE_FONT};letter-spacing:-.04em;color:var(--r-link-color);font-variant-numeric:tabular-nums}
${LOOK("statement", "number")} p:not(:has(.slidey-big)){font-family:${BODY_FONT};font-size:1.15em;font-weight:400;color:var(--r-main-color);margin-top:.2em;text-wrap:balance}
.reveal .slides section .slidey-count{--slidey-n:var(--slidey-to);counter-reset:slidey-n var(--slidey-n)}
.reveal .slides section .slidey-count::after{content:counter(slidey-n)}
.reveal .slides section .slidey-count > span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.reveal .slides section.present .slidey-count{animation:slidey-count .9s cubic-bezier(.2,.8,.2,1) .15s both}
@keyframes slidey-count{from{--slidey-n:0}}
${LOOK("statement", "rule")} > div{align-items:flex-start!important}
${LOOK("statement", "rule")} p{text-align:left;padding-left:.6em;border-left:.15em solid var(--r-link-color);max-width:90%;margin:0}`,
    // Bullets: numbered cards in a row, or steps with numbered circles.
    `${LOOK("bullets", "cards")} ul{list-style:none;margin:0!important;padding:0;display:grid!important;grid-auto-flow:column;grid-auto-columns:1fr;gap:.5em;width:100%;counter-reset:slidey-c}
${LOOK("bullets", "cards")} li{display:block;margin:0;padding:.7em;border-radius:.42em;background:#1b1b1f;font-size:.9em;line-height:1.25;min-height:5em}
${LOOK("bullets", "cards")} li::before{counter-increment:slidey-c;content:counter(slidey-c,decimal-leading-zero);display:block;margin-bottom:.45em;font:800 1.1em/1 ${HOUSE_FONT};color:var(--r-link-color)}
${LOOK("bullets", "steps")} ol{list-style:none;margin:0!important;padding:0;display:flex!important;flex-direction:column;gap:.55em;counter-reset:slidey-s}
${LOOK("bullets", "steps")} li{position:relative;display:flex;align-items:center;gap:.7em;margin:0}
${LOOK("bullets", "steps")} li::before{counter-increment:slidey-s;content:counter(slidey-s);flex:none;width:1.7em;height:1.7em;border-radius:50%;display:grid;place-items:center;background:#3a2f12;color:#ffd45c;font:700 .85em/1 ${HOUSE_FONT}}
${LOOK("bullets", "steps")} li:not(:last-child)::after{content:"";position:absolute;left:.72em;top:1.5em;width:.06em;height:.55em;background:#3a2f12}`,
    // Compare: two short lists, each under a bold line, as two cards.
    `.reveal .slides section:is(.slidey-look-bullets-compare,.slidey-look-two-column-compare) > div{display:grid!important;column-count:auto;grid-template-columns:1fr 1fr;grid-template-rows:auto auto auto;grid-auto-flow:column;column-gap:.5em;align-content:center;align-items:stretch!important;text-align:left}
.reveal .slides section:is(.slidey-look-bullets-compare,.slidey-look-two-column-compare) > div > :is(h1,h2,h3){grid-column:1/-1;grid-row:1;margin-bottom:.4em}
.reveal .slides section:is(.slidey-look-bullets-compare,.slidey-look-two-column-compare) > div > p{margin:0;padding:.6em .8em .2em;border-radius:.42em .42em 0 0;background:#1b1b1f;font:700 .85em/1.2 ${HOUSE_FONT}}
.reveal .slides section:is(.slidey-look-bullets-compare,.slidey-look-two-column-compare) > div > p:first-of-type strong{color:var(--r-link-color)}
.reveal .slides section:is(.slidey-look-bullets-compare,.slidey-look-two-column-compare) > div > :is(ul,ol){display:block;column-count:1;margin:0!important;padding:.2em .8em .7em 1.8em;border-radius:0 0 .42em .42em;background:#1b1b1f;font-size:.85em}
.reveal .slides section:is(.slidey-look-bullets-compare,.slidey-look-two-column-compare) > div > :is(ul,ol):last-of-type li::marker{color:#a3a09a}`,
    // Quote: a big amber quote mark over the quote, in the heading font.
    `${LOOK("quote", "mark")} blockquote{background:none;box-shadow:none;border-left:0!important;padding-left:0!important;font:700 1.45em/1.2 ${HOUSE_FONT};font-style:normal!important;color:var(--r-heading-color);text-wrap:balance}
${LOOK("quote", "mark")} blockquote::before{content:"\\201C";display:block;font:800 3.4em/.7 ${HOUSE_FONT};color:var(--r-link-color);margin-bottom:.05em}
${LOOK("quote", "mark")} blockquote p:last-child:not(:first-child){font-family:${BODY_FONT};font-weight:400}`,
    // Picture beside text: the picture is the slide background (LookProcessor moves it there), so it reaches the screen edge: cropped to the right 46% (bleed) or darkened at the bottom under a quote (photo). reveal puts the slide's data-state on the viewport.
    `.reveal-viewport.slidey-full .backgrounds .slide-background.present .slide-background-content{filter:brightness(.7)}
.reveal-viewport.slidey-full .backgrounds .slide-background.present .slide-background-content::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 35%,rgba(0,0,0,.55) 75%,rgba(0,0,0,.9) 100%)}
.reveal .slides section[data-state="slidey-full"] > div::after{display:none}
.reveal-viewport.slidey-bleed .backgrounds .slide-background.present .slide-background-content{left:54%;right:0;width:auto}
.reveal-viewport.slidey-photo .backgrounds .slide-background.present .slide-background-content::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 25%,rgba(10,10,12,.9))}
${LOOK("image-side", "photo")} > div{display:flex!important;flex-direction:column;justify-content:flex-end!important;align-items:flex-start!important;padding-bottom:1.2em;box-sizing:border-box}
${LOOK("image-side", "photo")} blockquote{background:none;box-shadow:none;position:relative;z-index:2;width:90%;margin:0;border:0!important;padding:0!important;font:700 1.35em/1.2 ${HOUSE_FONT};font-style:normal;color:#fff;text-wrap:balance}
${LOOK("image-side", "photo")} blockquote p:last-child:not(:first-child){font-family:${BODY_FONT};font-weight:400;color:rgba(255,255,255,.75)}`,
    // Code, line focus: lines marked in the fence (```js [2-3], reveal.js highlight) stay lit on an amber tint, the rest dims; no line-number gutter.
    `${LOOK("code", "focus")} pre code .hljs-ln-numbers{display:none}
${LOOK("code", "focus")} pre code table{width:100%}
${LOOK("code", "focus")} pre code.has-highlights tr:not(.highlight-line){opacity:.35}
${LOOK("code", "focus")} pre code.has-highlights tr.highlight-line td{background:#3a2f12;border-radius:.3em}`,
].join("\n");

// The one look of an auto deck (see domain/autoLayout.ts): the design system's tool dark look
// (owner approved mock-slidey-house, 2026-11-25): graphite ground, warm-white text, one amber accent, bundled Poppins + Inter so nothing has to be installed. Overrides the
// reveal theme's variables; `:root:root` outranks the theme's `:root`.
export const HOUSE_THEME_CSS = `:root:root{--r-background-color:#141417;--r-main-color:#ece9e2;--r-heading-color:#f6f3ec;--r-link-color:#e0b84c;--r-link-color-hover:#ffd45c;--r-selection-background-color:#3a2f12;--r-main-font:${BODY_FONT};--r-heading-font:${HOUSE_FONT};--r-main-font-size:38px;--r-heading-font-weight:700;--r-heading-text-transform:none;--r-heading-letter-spacing:-.02em;--r-heading-text-shadow:none;--r-heading-line-height:1.1}
.reveal-viewport{background:var(--r-background-color)}
.reveal .slides section > div{box-sizing:border-box;padding:56px 80px}
.reveal .slides section :is(h1,h2,h3){color:var(--r-heading-color)}
.reveal .slides section:not([class*="layout-image-full"]) :is(h1,h2,h3) :is(em,i){font-style:normal;color:var(--r-link-color)}
.reveal .slides section h2{font-size:1.6em}
.reveal .slides section h3{font-size:1.2em}
.reveal .slides section[class*="layout-image-full"] :is(h1,h2,h3){color:#fff}
.reveal .slides section[class*="layout-statement"] p{font-family:${HOUSE_FONT}}
.reveal .slides section[class*="layout-image-full"] :is(h1,h2,h3,p){font-family:${TITLE_CARD_FONT};font-weight:800;letter-spacing:-.025em;line-height:1.1;text-wrap:balance}
.reveal .slides section[class*="layout-image-full"] p:not(:has(img)){max-width:85%;margin-inline:auto}
.reveal .slides section[class*="layout-image-full"] > div:not(:has(> :is(h1,h2,h3))) > p:not(:has(img)){font-size:2em}
.reveal .slides section:not([class*="layout-"]){text-align:left}
.reveal .slides section:not([class*="layout-"]) > div{align-items:flex-start!important}
.reveal .slides section[class*="layout-two-column"] > div{display:flex!important;column-count:1;align-items:flex-start!important}
.reveal .slides section[class*="layout-two-column"] :is(ul,ol){column-count:2;column-gap:1.5em;align-self:stretch;width:auto}
.reveal .slides section li::marker{color:var(--r-link-color)}
.reveal .slides section blockquote{color:var(--r-main-color)}
.reveal .slides section blockquote p:last-child:not(:first-child){font-style:normal;font-size:.65em;opacity:.7;margin-top:.8em}
.reveal .controls,.reveal .progress{color:var(--r-link-color)}
.reveal .slides section .callout{margin:.5em 0;max-width:85%;text-align:left;background:#1b1b1f;border:0;border-radius:.42em}
.reveal .slides section .callout-title{padding:.5em .9em .15em;background:none;border:0;color:var(--r-link-color);font-family:${HOUSE_FONT}}
.reveal .slides section .callout-content{padding:.1em .9em .6em;overflow:visible}
.reveal .slides section .callout-content > *{margin:.2em 0}
.reveal .slides section > div:has(> .callout:only-child){align-items:center!important}
.reveal .slides section > div > .callout:only-child{font-size:1.3em;min-width:50%}
.reveal-viewport:has(.slides section.present[class*="layout-section"]){background:#3a2f12}
.reveal .slides section[class*="layout-section"] :is(h1,h2,h3,p){color:#ffd45c}
.reveal .slides section[class*="layout-section"] p{opacity:.8}
.reveal-viewport:has(.slides section.present[class*="layout-code"]){background:#1b1b1f}
.reveal .slides section[class*="layout-code"] pre{background:#141417;border-radius:.42em;box-shadow:none}
.reveal .slides section:is([class*="layout-image-side"],[class*="layout-image-left"],[class*="layout-image-right"]) img{border-radius:.42em}
${MODIFIERS_CSS}
${LOOKS_CSS}`;

// Images on every slide: shrink to fit the 960×700 slide instead of spilling
// off it, and 2+ pictures side by side as a row with any text above/below.
// Layout and preset rules (`section.slidey-…`) are more specific, so they win.
export const IMAGE_FIT_CSS = `.reveal .slides section > div > img,.reveal .slides section > img{flex:0 1 auto;min-height:0;min-width:0;max-width:100%;max-height:100%;object-fit:contain}
.reveal .slides section:not([class*="image-"]) > div:has(> img ~ img){flex-flow:row wrap!important;align-content:center;align-items:center;column-gap:.5em}
.reveal .slides section:not([class*="image-"]) > div:has(> img ~ img) > :not(img){flex:0 0 100%}
.reveal .slides section:not([class*="image-"]) > div:has(> img ~ img) > img{flex:1 1 0;width:0;height:auto;max-height:60%}
.reveal .slides section img{object-position:var(--slidey-focus,center)}`;

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
        name: "statement",
        label: "One big statement",
        css: `&{text-align:center}
& p{font-size:1.7em;line-height:1.25;font-weight:600;max-width:85%;margin:0 auto}`,
    },
    {
        name: "bullets",
        label: "Heading and list",
        css: `&{text-align:left}
&:not(:has(> div)),& > div{align-items:flex-start!important}
& :is(ul,ol){display:block;margin-left:1em}
& li{margin:.3em 0}`,
    },
    {
        name: "image-side",
        label: "Text left, picture right",
        css: `&:not(:has(> div)),& > div{display:grid!important;grid-template-columns:1fr 45%;grid-auto-rows:min-content;column-gap:1.5em;align-content:center;text-align:left}
& > div > :not(img):not(p:has(> img)){grid-column:1;margin-left:0;margin-right:0}
& > div > img,& > div > p:has(> img){grid-column:2;grid-row:1 / span 12;align-self:center;width:100%;max-width:100%;max-height:600px;margin:0;object-fit:contain!important}
& > div > p:has(> img) img{width:100%;max-height:600px;object-fit:contain}
& :is(ul,ol){display:block;margin-left:1em}`,
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
& img{position:absolute;inset:0;width:100%;height:100%;max-width:none;max-height:none;object-fit:cover!important;margin:0;border:0;box-shadow:none;filter:brightness(.7)}
&:not(:has(> div))::after,& > div::after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 35%,rgba(0,0,0,.55) 75%,rgba(0,0,0,.9) 100%)}
& :is(h1,h2,h3,h4,ul,ol,blockquote),& p:not(:has(img)){position:relative;z-index:1;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.6)}`,
    },
    {
        name: "quote",
        label: "Quote",
        css: `&{text-align:left}
& blockquote{width:85%;font-size:1.25em;font-style:italic;background:none;box-shadow:none;border-left:.15em solid var(--r-link-color,#e0b84c);padding-left:.6em}`,
    },
    {
        name: "code",
        label: "Code focus",
        css: `&{text-align:left}
& pre{width:100%;font-size:.8em}
& pre code{max-height:70vh;padding:1em}`,
    },
];
