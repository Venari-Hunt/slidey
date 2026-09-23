# Slidey

Obsidian community plugin: a markdown note → a controllable, preset-styled reveal.js slide deck. Works with USB presentation clickers; optional PDF/HTML export. Hard fork of Slides Extended v2.4.3 (MIT). The owner is **not a developer** — explain setup/toolchain steps plainly.

`@AGENTS.md` + `CONTRIBUTING.md` — upstream's processor-pipeline guidance; read before touching markdown processors (3 phases, 15+ ordered processors; `LatexProcessor` before `MediaProcessor`).

## Architecture

- `src/` — the plugin (`corepack pnpm build` → `build/main.js` + `build/styles.css`). Entry `slidesExtended-Plugin.ts` (upstream names kept).
  - `obsidian/processors/` — markdown → slides pipeline; `presetProcessor.ts` is Slidey's.
  - `reveal/` — Fastify preview server, renderer, `revealPreviewView.ts` (preview pane, clickers, present mode).
  - `presets.ts` — slide presets; `slidesExtended-SettingTab.ts` — settings UI; `scss/styles.scss`.
- `reveal-dist/` — separate build of the browser-side reveal.js assets, shipped at runtime as `slidey.zip` from the matching GitHub release.
- `test/` — Jest (`presets.unit.test.ts` for presets).

## Docs (read only the one a task touches)

- `docs/presets.md` — preset pipeline, deck DOM shape, changing starters, swatches.
- `docs/preview-and-present.md` — preview pane, clicker key forwarding, present mode, commands.
- `docs/development.md` — build, dev vault, live testing over CDP + its gotchas.
- `docs/releasing.md` — `release.yml`, runtime `slidey.zip` download.
- `docs/fork-origin.md` — what was changed from upstream, licensing.
- `CHANGELOG.md` — dated user-facing release history.

Every release: `CHANGELOG.md` entry + the matching `docs/*.md` updated, same step. New area with no doc → new `docs/*.md` + one line here. Keep this file a map (~2k characters).
