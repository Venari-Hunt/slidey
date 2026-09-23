# Fork origin — Slides Extended

Slidey started (2026-09-07) as a hard fork of [**Slides Extended**](https://github.com/ebullient/obsidian-slides-extended) v2.4.3 (MIT — © 2024 Erin Schnabel, © 2021 Matthäus Szturc; itself the maintained continuation of Advanced Slides). Chosen over a from-scratch build because it already has a mature reveal.js 5.2 pipeline, theming, note-embedding, export, and a 15+ processor markdown transform chain.

We own this fork outright. `LICENSE` keeps both upstream copyright lines plus ours; `CHANGELOG-upstream-slides-extended.md` is their history, frozen. Upstream is available as the `upstream` git remote for diffing/cherry-picking future fixes; there is no shared history with `origin` (now `Venari-Hunt/slidey`, formerly `joaovenari/slidey` — GitHub redirects).

**What changed from upstream at fork time:** plugin `id`/`name` → `slidey`; the hardcoded plugin dir (`src/obsidian/obsidianUtils.ts`) → `plugins/slidey/`; the runtime distribution-zip download URL (`src/slidesExtended-Distribution.ts`) → this repo's releases; user-facing "Slides Extended" strings → "Slidey"; version reset to `0.1.0`; `docs` submodule dropped; `reveal-dist` submodule flattened into a plain directory. Internal TypeScript identifiers (`SlidesExtendedPlugin`, `slidesExtended-*.ts`) are still upstream names — cosmetic, rename later if ever.

Prior-art research (other markdown-to-slides tools) is in Claude memory (`slidey-research-markdown-slides`).
