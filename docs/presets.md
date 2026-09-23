# Slide presets

Code: `src/presets.ts`, `src/obsidian/processors/presetProcessor.ts`, settings UI in `src/slidesExtended-SettingTab.ts` (`drawPresets`).

## How a preset reaches a slide

A preset = a named look a slide opts into via `preset:` in the note frontmatter (deck default) or `<!-- slide preset="x" -->` per slide (`preset: none` opts out).

- `PresetProcessor` (phase 2, after `defaultBackgroundProcessor`) stamps a `slidey-preset-<name>` class onto the slide annotation and routes any preset `background` through the `bg` attribute (→ `data-background-color`, so reveal's background layer paints it).
- `buildPresetCss(presets, selectorFor?)` turns each preset's structured fields (background/color/accent/fontScale/align) + raw `css` (with `&` = the slide selector) into CSS scoped to `.reveal .slides section.slidey-preset-<name>`. `revealRenderer` injects it as `<style id="slidey-presets">` in both templates (cascades below the theme, above user CSS).
- Presets live in plugin settings (`settings.presets`), seeded from `STARTER_PRESETS` (7 starters), edited in Settings → Slide presets.

## Deck DOM — what `&` actually wraps

Slide content is **not** a direct child of `<section>`: it sits inside an absolutely-positioned, full-size (960×700) flex `<div absolute>` wrapper. Images are direct children of that wrapper (not wrapped in `<p>`). Any preset CSS that lays out content must target the wrapper — e.g. `image-left` uses `&:has(> img), & > div:has(> img)` with a column flex-wrap (image = first column, the rest flows to the second). Verified 2026-09-23 (0.3.1).

## Changing a starter preset

Stored presets are *copies* of the starters, so editing `STARTER_PRESETS` doesn't reach existing installs. Add the old CSS to `RETIRED_STARTER_CSS` in `presets.ts`; `upgradeStarterPresets()` (called from `loadSettings`) swaps it for the new CSS only where the user never edited it.

## Preview swatches (0.3.0)

Settings shows a mini sample slide per preset: one `<style>` with `buildPresetCss(presets, (_, i) => '.slidey-preset-swatch[data-swatch="i"]')`, regenerated on every field `onChange`. Base swatch styles in `src/scss/styles.scss` (black-theme defaults; font-size = `var(--r-main-font-size,42px)/3`; `height:auto!important` keeps 16:9 when a preset sets `height:100%`). Obsidian hides `.vertical-tab-content h1`, so the swatch forces `h1{display:block}`. A placeholder SVG image is added when the preset's CSS mentions `img`.

## Gotchas

- Tests: `CommentParser.parseLine` returns null unless `YamlStore.getInstance().options` is set — `test/presets.unit.test.ts` has a `beforeEach` for it.
- Literal `<!-- slide ... -->` text anywhere in slide content (inline code included) is parsed as a real annotation — inherited footgun; `protectFencedCode` only shields fenced blocks.
- `image-bg` needs a real image on the slide to look like anything.

**Test note:** `C:\Claude\Vault Claude\02 - Projetos\Slidey\_slidey-smoke-test.md` exercises all presets, including two `image-left` slides (markdown + wiki-embed image syntax) using `_slidey-test-image.svg`.
