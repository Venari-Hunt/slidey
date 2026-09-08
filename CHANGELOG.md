# Changelog

All notable changes to Slidey are documented here. Newest first.
Upstream (Slides Extended) history is frozen in `CHANGELOG-upstream-slides-extended.md`.

## [Unreleased]

- **Present mode** — a "Present slides (fullscreen)" command (bind it a hotkey in Settings → Hotkeys) puts the deck into true fullscreen, hiding all Obsidian chrome. Moving the mouse fades in a small "Exit presentation" button (top-right); it fades back out after 2s idle, or press Escape. Exiting returns the pane to its normal split/tab/sidebar layout — nothing is torn down. *Needs one manual hotkey-press pass to confirm — the Fullscreen API requires a real user gesture, which CDP-driven test scripts can't fake.*
- **Slide presets** — a named look a slide opts into with `preset: <name>` in the note frontmatter (deck default) or `<!-- slide preset="quote" -->` per slide (`preset: none` opts a slide out). Ships 7 starters: `cover`, `section`, `quote`, `image-left`, `bullets`, `code`, `image-bg` (full-bleed). Each preset has structured fields — background, text/accent colour, font scale, alignment — plus a raw-CSS escape hatch (`&` = the slide selector); all editable in Settings → Slide presets. Verified live.
- **Presentation-clicker robustness** — the preview view now grabs keyboard focus for the deck iframe on load and on any click in the pane, and forwards PageUp/PageDown/arrows/Space to reveal.js over `postMessage` when focus is on the Obsidian chrome instead of the slides. A physical clicker (or the arrow keys) now drives the deck without having to click the slides first. Verified live: every nav key navigates correctly, including through vertical slide stacks.

### Not yet done

- Preset tuning (the 7 starters are a first cut) and a preview/thumbnail in the settings UI.
- `image-left` layout is a CSS-grid approximation; `image-bg` needs a real image on the slide.
- Image-layout defaults, PDF/PPTX export polish.
- Rebrand of internal TypeScript identifiers (`SlidesExtendedPlugin`, `slidesExtended-*.ts`) — cosmetic, deferred.
- Automated `release.yml` reworked for the flat repo but not yet exercised (0.1.0 was cut locally). Private-repo `slidey.zip` download needs the repo public or a token before non-dev installs work.
- Literal `<!-- slide ... -->` text in slide content (even inside inline code) is still interpreted as a real annotation — a pre-existing footgun shared with the upstream processors.

## 0.1.0 — 2026-09-07

First release. A hard fork of **Slides Extended v2.4.3** (MIT) — at this point functionally identical, with a new identity.

- Hard-forked into `joaovenari/slidey`. Rebranded: plugin id/name → `slidey`, version reset to `0.1.0`, plugin directory → `plugins/slidey/`, runtime distribution-zip download → this repo's releases (`slidey.zip`), user-facing strings → "Slidey". `LICENSE` keeps both upstream copyright lines plus ours.
- Dropped the `docs` submodule; flattened `reveal-dist` from a submodule to a plain directory. Normalized all line endings to LF (`.gitattributes`).
- Added `scripts/sync-reveal-assets.mjs` + `scripts/dev.mjs` and `pnpm dev:vault` / `pnpm reveal:build` — one-command dev loop that assembles a complete plugin folder into `se-test-vault/` (no GitHub release needed for local dev).
- Reworked `release.yml` and `build.yml` for the flattened repo (no submodules); `codeql.yml` de-referenced the removed `reveal-dist` branch.
- Build verified: `reveal-dist` build + 57 tests; plugin build + 138 tests / 90 snapshots; Biome clean.
- **Smoke-tested live in Obsidian** (over CDP): loads clean, renders the test deck (black theme, syntax highlighting, KaTeX, controls, progress bar), and all presentation-clicker keys — PageDown, PageUp, Space, ArrowRight/Left/Down — navigate correctly, including into and out of vertical slide stacks.
- Research pass on existing markdown-to-slides tools and Obsidian slide plugins (see Claude memory `slidey-research-markdown-slides`).
