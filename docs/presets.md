# Slide presets, styles and layouts

Code: `src/presets.ts`, `src/obsidian/processors/presetProcessor.ts`, settings UI in `src/slidesExtended-SettingTab.ts` (`drawPresets`).

## How a preset reaches a slide

A preset = a named look a slide opts into via `preset:` in the note frontmatter (deck default) or `<!-- slide preset="x" -->` per slide (`preset: none` opts out).

- `PresetProcessor` (phase 2, after `defaultBackgroundProcessor`) stamps a `slidey-preset-<name>` class onto the slide annotation and routes any preset `background` through the `bg` attribute (→ `data-background-color`, so reveal's background layer paints it).
- `buildPresetCss(presets, selectorFor?)` turns each preset's structured fields (background/color/accent/fontScale/align) + raw `css` (with `&` = the slide selector) into CSS scoped to `.reveal .slides section.slidey-preset-<name>`. `revealRenderer` injects it as `<style id="slidey-presets">` in both templates (cascades below the theme, above user CSS).
- Presets live in plugin settings (`settings.presets`), seeded from `STARTER_PRESETS` (7 starters), edited in Settings → Slide presets.

## Slide styles (0.10.0)

A style is the look half of a slide (colors, fonts, size, align, raw css), split from presets so layout and look change independently. `SlideStyle` is the same shape as `SlidePreset` (both have `headingFont` / `bodyFont`; only the styles editor shows them).

- Picked with `style:` frontmatter (deck default) or `%% style=x %%` on a slide. `readAttrs` reads `style=`; `withAttrs` writes it to the slide comment as **`slidey-style="x"`**, because `style=` on a slide comment is upstream's inline CSS.
- `PresetProcessor` is shared: `new PresetProcessor(STYLES)` resolves `slidey-style` / `options.style` / `options.styles` → class `slidey-style-<name>`. It runs **before** the preset processor, so a style's background wins the `bg` attribute.
- CSS: `buildStyleCss()` = `buildPresetCss` scoped to `section.slidey-style-<name>`, appended after preset CSS in the same `presetStyles` template slot (so no `slidey.zip` template change was needed). Same specificity, later wins → style beats preset on color/font.
- Fonts: `bodyFont` → `--r-main-font` + `font-family`; `headingFont` → `--r-heading-font` + `font-family` on h1–h4. A bare name with spaces gets quoted. No web-font loading: the font must be installed.
- Settings: `drawLooks(containerEl, STYLE_LIST | PRESET_LIST)` draws both editors; swatch ids are `<list>-<index>`. `settings.styles` seeded from `STARTER_STYLES`.

## Slide layouts (0.11.0)

A layout is the structure half of a slide: where the title, text and image go. Unlike presets and styles, layouts are a **fixed set in code** (`LAYOUTS` in `presets.ts`: title, section, two-column, image-left, image-right, image-full, quote, code), not settings, so fixing one reaches every install with no migration.

- Picked with `layout:` frontmatter or `%% layout=x %%`; the slide comment carries `layout="x"` (no upstream attribute of that name).
- `new PresetProcessor(LAYOUTS_KIND)` — `LookKind.fixed` supplies the list instead of an options key. Runs before the style and preset processors.
- CSS: `buildLayoutCss()` goes **first** in the `presetStyles` slot, so presets and styles override it. Layout CSS must never set colors or fonts (image-full's white text over the dimmed picture is the one exception).
- Heading levels: `settings.headingLayouts` / `headingStyles` (index 0 = `#`), beside `headingPresets`.
- Gotchas found live: reveal.js makes `ul`/`ol` `inline-block`, which can't split across CSS columns (two-column sets them `block`); images carry an inline `object-fit: scale-down`, so image-full needs `object-fit:cover!important`.

**Test note:** `_slidey-layouts-test.md` (all 8 layouts, `style: night` deck default, one `style=paper` override).

## Per-slide overrides (0.12.0)

`%% font="Open Sans" color=#eee accent=red size=1.4 %%` changes one slide without a new style. `readAttrs` reads them (`SlideAttrs extends SlideOverrides`); `withAttrs` turns them into inline CSS with `overrideStyle()` (presets.ts) and writes it to the slide comment's upstream `style="…"` attribute, in front of any inline CSS already there (which wins).

- Declarations are the variables styles set (`--r-main-color`, `--r-heading-color`, `--r-link-color`, `--r-main-font` / `--r-heading-font`, `--r-main-font-size`) plus `color` / `font-family` / `font-size`. Inline beats the stylesheet on the same `<section>`.
- So that reaches headings, `buildPresetCss` heading rules read `var(--r-heading-color)` / `var(--r-heading-font)` instead of fixed values.
- `size`: a bare number = × 42px; `px/em/rem/%/pt/vw/vh` pass through; anything else is dropped. Fonts are single-quoted (the value sits inside `style="…"`).
- Fixed alongside: the theme reads `--r-main-font-size` only on `.reveal`, so a look's `fontScale` now also sets `font-size`. The swatch keeps its third-size with `font-size … !important` in styles.scss.

**Test note:** `_slidey-overrides-test.md` (night style; accent + color, font + size, quote preset).

## Deck DOM — what `&` actually wraps

Slide content is **not** a direct child of `<section>`: it sits inside an absolutely-positioned, full-size (960×700) flex `<div absolute>` wrapper. Images are direct children of that wrapper (not wrapped in `<p>`). Any preset CSS that lays out content must target the wrapper — e.g. `image-left` uses `&:has(> img), & > div:has(> img)` with a column flex-wrap (image = first column, the rest flows to the second). Verified 2026-09-23 (0.3.1).

## Image fit and gallery rows (0.14.0)

`IMAGE_FIT_CSS` in `presets.ts`, injected first in the `presetStyles` slot (before layouts, presets, styles). Images that are direct children of the drop wrapper (or the section) get `flex:0 1 auto; min-height:0; max-height:100%; object-fit:contain`, so a heading + tall picture shrinks the picture instead of overflowing the 700 px slide. A wrapper with 2+ direct `img` switches to `flex-flow:row wrap`: non-images take a full row, images share one row (`flex:1 1 0`, max 60% of the slide height). Images on one line and on separate lines are indistinguishable after DropProcessor, so both become a row. Selectors are `.reveal .slides section > div > img` (0,2,3), which loses to layout/preset rules (`section.slidey-… img`, 0,3,2); the gallery row also skips sections whose class contains `image-`. Live test note: `02 - Projetos/Slidey/_slidey-images-test.md`.

## Changing a starter preset

Stored presets are *copies* of the starters, so editing `STARTER_PRESETS` doesn't reach existing installs. Add the old CSS to `RETIRED_STARTER_CSS` in `presets.ts`; `upgradeStarterPresets()` (called from `loadSettings`) swaps it for the new CSS only where the user never edited it, and returns the upgraded names so `loadSettings` shows a Notice (no silent changes).

## Preview swatches (0.3.0)

Settings shows a mini sample slide per preset: one `<style>` with `buildPresetCss(presets, (_, i) => '.slidey-preset-swatch[data-swatch="i"]')`, regenerated on every field `onChange`. Base swatch styles in `src/scss/styles.scss` (black-theme defaults; font-size = `var(--r-main-font-size,42px)/3`; `height:auto!important` keeps 16:9 when a preset sets `height:100%`). Obsidian hides `.vertical-tab-content h1`, so the swatch forces `h1{display:block}`. A placeholder SVG image is added when the preset's CSS mentions `img`.

## Gotchas

- Tests: `CommentParser.parseLine` returns null unless `YamlStore.getInstance().options` is set — `test/presets.unit.test.ts` has a `beforeEach` for it.
- Literal `<!-- slide ... -->` text anywhere in slide content (inline code included) is parsed as a real annotation — inherited footgun; `protectFencedCode` only shields fenced blocks.
- `image-bg` needs a real image on the slide to look like anything.

**Test note:** `C:\Claude\Vault Claude\02 - Projetos\Slidey\Tests\_slidey-smoke-test.md` exercises all presets, including two `image-left` slides (markdown + wiki-embed image syntax) using `_slidey-test-image.svg`.
