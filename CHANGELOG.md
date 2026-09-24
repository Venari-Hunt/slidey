# Changelog

All notable changes to Slidey are documented here. Newest first.
Upstream (Slides Extended) history is frozen in `CHANGELOG-upstream-slides-extended.md`.

## [Unreleased]

### Known gaps

- Preset tuning (the 7 starters are a first cut).
- `image-bg` needs a real image on the slide to look like anything.
- PPTX export (PDF export is in).
- Rebrand of internal TypeScript identifiers (`SlidesExtendedPlugin`, `slidesExtended-*.ts`) — cosmetic, deferred.
- Literal `<!-- slide ... -->` text in slide content (even inside inline code) is still interpreted as a real annotation — a pre-existing footgun shared with the upstream processors.

## 0.16.1 — 2026-09-24

- Fix: picking **Open slide preview** from the `/` menu closed the preview when it was already open. It now always shows the current note's slides.

## 0.16.0 — 2026-09-24

- **Type `/` for a slide menu.** In a slide note, type `/` to pick from a list: a new slide, a layout, a style, a background picture (plain, darkened, or whole), speaker notes, text color, font and size, step-by-step bullets, and more. Keep typing to filter (`/two`, `/bg`). The menu also opens the preview, starts presenting, or saves a PDF.
- **Turn any note into slides with `/slides`.** In a note that isn't slides yet, type `/slides` and pick how it should be split.
- Works alongside Slash Commander: when nothing in the slide menu matches what you type (like `/table`), your usual `/` menu shows instead. You can turn the slide menu off in Settings → Slide menu (/).

## 0.15.1 — 2026-09-24

- **Fixed: the slide preview could go black and stay black.** If a PDF export got stuck, its hidden window kept running and blocked every preview until Obsidian restarted. Each export step now has a 30-second limit, the hidden window always closes afterward, and any stuck window left from an earlier export closes when Slidey starts.

## 0.15.0 — 2026-09-24

- **Save your slides as a PDF in one step.** Run **Export active presentation as PDF** from the command palette (or the preview pane's `⋯` menu → Export as PDF). Slidey saves one page per slide, with backgrounds, styles and layouts, to the `export` folder in your vault as `<note name>.pdf`, then opens it. No browser print dialog, no margin or background settings to fix.
- The old **Print active presentation** still opens the print view in your browser, if you prefer printing by hand.

## 0.14.0 — 2026-09-24

- **Pictures always fit on the slide.** A big or tall picture under a heading used to run off the bottom; now it shrinks to fit, keeping its shape.
- **Several pictures on one slide sit side by side** in a row, instead of stacking off the slide. Text and headings stay above or below the row. Layouts like `image-left` keep their own arrangement.
- **Background pictures can be fitted and dimmed.** Next to `bg=`, add `fit=contain` to show the whole picture instead of filling the slide (`cover`, the default, fills and crops), and `dim=40%` to darken it so text on top stays readable: `%% bg=photo.jpg fit=contain dim=40% %%`. Works in all three modes.

## 0.13.0 — 2026-09-24

- **The colored labels beside your slides now show layout and style.** The pill at the end of a slide's line reads like `two-column · night`, and the dot takes the style's color. A misspelled name shows up red with a `?` (`nigth?`).
- **Plain `---` notes get the labels too**, on the first line of each slide, once the note's properties include `theme:`, `style:`, `layout:`, `preset:` or `slides:`. Before, only headings and blocks notes had them.
- `preset=` keeps working as before, alone or next to `layout=` / `style=`.
- Settings → Slide styles shows each style's dot color, like Slide presets does.

## 0.12.0 — 2026-09-23

- **One-off changes on a single slide.** Change one slide without making a new style: put `%% font="Open Sans" color=#eeeeee accent=red size=1.4 %%` at the top of a slide. `font` sets the font for headings and text, `color` the text color, `accent` the heading and link color, `size` the text size (`1.4` = 1.4 times bigger, or `36px`). These always win over the slide's style and preset. Works in all three modes and on the same line as `layout=` / `style=`.
- Fix: a style's or preset's text size (like the quote preset's) had no effect on the slide itself, only on the settings preview. It now really enlarges the text.

## 0.11.0 — 2026-09-23

- **Slide layouts: where things go on a slide, apart from its look.** Eight layouts ship with the plugin: `title`, `section`, `two-column`, `image-left`, `image-right`, `image-full` (picture fills the slide, text on top), `quote`, `code`. Pick one with `%% layout=two-column %%` at the top of a slide, or `layout: title` in the note's properties for the whole deck. Combine it with a style: `%% layout=image-left style=paper %%`. Layouts never change colors or fonts, so any layout works with any style.
- **Heading levels pick a layout and a style too.** Settings → Heading levels now has three dropdowns per level: layout, style and preset. New installs start with `#` → `title` layout.
- Fix: a font name was put in quotes whenever it contained the letter "s", not only when it had a space. Harmless, but now correct.

## 0.10.0 — 2026-09-23

- **Slide styles: the look of a slide, apart from its layout.** A style is a set of colors and fonts: background, text color, accent color, heading font, body font, text size, alignment. Put `style: paper` in a note's properties to style the whole deck, or `%% style=night %%` at the top of one slide (headings and blocks mode too). It combines with a preset: `%% preset=cover style=bold %%` takes the preset's layout and the style's look. Five starters (night, paper, clean, bold, ocean) live in Settings → Slide styles, where you can edit them, add your own, and see a live preview of each. Fonts must be installed on your computer.

## 0.9.0 — 2026-09-23

- **Slide markers in ordinary `---` notes.** The same `%% … %%` lines that headings and blocks mode use now work in a plain note split by `---`: put them at the top of a slide, e.g. `%% preset=quote bg=#224466 %%`, to pick its preset and background. A `%% notes %%` line starts the slide's speaker notes. Markers further down a slide are left alone. First step of splitting presets into layouts and styles.

## 0.8.0 — 2026-09-23

- **Speaker notes and slide backgrounds in headings and blocks mode.** A `%% notes %%` line starts the slide's speaker notes: everything after it, up to the next slide, is shown in the speaker view (press `S`), not on the slide. `%% bg=photo.jpg %%` under a heading (or `%% slide bg=photo.jpg %%` in blocks mode) puts a picture from your vault behind the slide. `[[Photo name.png]]`, a web address, or a color like `#224466` also work. Combine with a preset: `%% preset=quote bg=#224466 %%`. In these two modes a line that happens to start with `note:` no longer starts notes by accident.

## 0.7.0 — 2026-09-23

- **Blocks mode** — put `slides: blocks` in a note's properties and keep writing a normal note. Only the parts you wrap become slides: a `%% slide %%` line starts one, `%% endslide %%` ends it (or the next `%% slide %%`, or the end of the note). `%% slide preset=quote %%` picks the preset. Everything else — research, outline, notes — stays out of the deck. Marker lines get the same colored dot and preset pill as headings. The preview follows the cursor. A note with no slides yet shows a short hint slide.

## 0.6.0 — 2026-09-23

- **Preset pill on each heading** — in `slides: headings` notes, every heading line ends with a small label naming the preset that slide will use, in the same color as its gutter dot. `no preset`, `name?` (red, dashed: preset doesn't exist) and a struck-through `not a slide` (`%% noslide %%`) cover the other cases. Editor only; reading view and the deck are unchanged.

## 0.5.0 — 2026-09-23

- **Preset dots in the editor** — in `slides: headings` notes, a colored dot sits in the gutter beside every heading, showing which preset that slide will use (hover for the name). A hollow ring = no preset, a dashed red ring = a preset name that doesn't exist, a short dash = `%% noslide %%`. Settings → Slide presets shows the same dot next to each preset as the color legend. Notes without `slides: headings` show no gutter.

## 0.4.0 — 2026-09-23

- **Headings mode** — put `slides: headings` in a note's frontmatter and write a normal note: every heading starts a slide, and the heading level picks the preset (Settings → Heading levels; `#` → `cover` by default). `%% preset=quote %%` under a heading picks any other preset for that slide; `%% noslide %%` leaves a section out. `---` stays an ordinary horizontal rule. Notes without the key work exactly as before. The preview follows the editor cursor in both modes.

## 0.3.2 — 2026-09-23

- **Preset auto-upgrades now tell you** — when Slidey swaps an unedited starter preset for its newer version on load, a notice names which preset(s) changed. Edited presets are still never touched.

## 0.3.1 — 2026-09-23

- **`image-left` preset fixed** — the image now actually sits in a left column (≈42% wide, full slide height, never cropped) with the heading, text and bullets stacked in the right column. The old CSS targeted the `<section>`, but Slidey renders slide content inside a full-size wrapper `<div>`, so the layout never applied. The new rule lays out whichever element directly holds the image (also handles an image wrapped alone in a `<p>`). Works for both `![](img)` and `![[img]]`.
- **Existing settings are upgraded automatically** — if your saved `image-left` still has the old starter CSS (unedited), it is replaced on load. If you edited it, it's left alone.
- The preview swatch now stays 16:9 even when a preset sets `height:100%`.

## 0.3.0 — 2026-09-23

- **Preset preview swatches** — Settings → Slide presets now shows a miniature sample slide above each preset, styled by the exact CSS the deck uses (`buildPresetCss` gained a selector override). It updates live as you edit the fields or custom CSS. Presets whose CSS styles images get a placeholder picture. Unset fields show the default black theme. Verified live over CDP for all 7 starters.

## 0.2.0 — 2026-09-23

- **Present mode** — a "Present slides (fullscreen)" command (bind it a hotkey in Settings → Hotkeys) puts the deck into true fullscreen, hiding all Obsidian chrome. Moving the mouse fades in a small "Exit presentation" button (top-right); it fades back out after 2s idle, or press Escape. Exiting returns the pane to its normal split/tab/sidebar layout — nothing is torn down. Confirmed working live.
- **Slide presets** — a named look a slide opts into with `preset: <name>` in the note frontmatter (deck default) or `<!-- slide preset="quote" -->` per slide (`preset: none` opts a slide out). Ships 7 starters: `cover`, `section`, `quote`, `image-left`, `bullets`, `code`, `image-bg` (full-bleed). Each preset has structured fields — background, text/accent color, font scale, alignment — plus a raw-CSS escape hatch (`&` = the slide selector); all editable in Settings → Slide presets. Verified live.
- **Presentation-clicker robustness** — the preview view now grabs keyboard focus for the deck iframe on load and on any click in the pane, and forwards PageUp/PageDown/arrows/Space to reveal.js over `postMessage` when focus is on the Obsidian chrome instead of the slides. A physical clicker (or the arrow keys) now drives the deck without having to click the slides first. Verified live: every nav key navigates correctly, including through vertical slide stacks.
- First release to exercise the reworked `release.yml` end to end (0.1.0 was cut locally).

## 0.1.0 — 2026-09-07

First release. A hard fork of **Slides Extended v2.4.3** (MIT) — at this point functionally identical, with a new identity.

- Hard-forked into `joaovenari/slidey`. Rebranded: plugin id/name → `slidey`, version reset to `0.1.0`, plugin directory → `plugins/slidey/`, runtime distribution-zip download → this repo's releases (`slidey.zip`), user-facing strings → "Slidey". `LICENSE` keeps both upstream copyright lines plus ours.
- Dropped the `docs` submodule; flattened `reveal-dist` from a submodule to a plain directory. Normalized all line endings to LF (`.gitattributes`).
- Added `scripts/sync-reveal-assets.mjs` + `scripts/dev.mjs` and `pnpm dev:vault` / `pnpm reveal:build` — one-command dev loop that assembles a complete plugin folder into `se-test-vault/` (no GitHub release needed for local dev).
- Reworked `release.yml` and `build.yml` for the flattened repo (no submodules); `codeql.yml` de-referenced the removed `reveal-dist` branch.
- Build verified: `reveal-dist` build + 57 tests; plugin build + 138 tests / 90 snapshots; Biome clean.
- **Smoke-tested live in Obsidian** (over CDP): loads clean, renders the test deck (black theme, syntax highlighting, KaTeX, controls, progress bar), and all presentation-clicker keys — PageDown, PageUp, Space, ArrowRight/Left/Down — navigate correctly, including into and out of vertical slide stacks.
- Research pass on existing markdown-to-slides tools and Obsidian slide plugins (see Claude memory `slidey-research-markdown-slides`).
