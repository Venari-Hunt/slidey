# Slidey (for Obsidian)

Turn a markdown note into a controllable, preset-styled slide deck — write in Obsidian, present with a physical clicker, export to PDF/HTML.

> **Status: early.** Slidey is a hard fork of [Slides Extended](https://github.com/ebullient/obsidian-slides-extended) (v2.4.3). Slide presets and presentation-remote handling are in; PDF export saves straight to a file.

## Features (inherited from Slides Extended)

- Write slides as markdown, `---` between slides, `--` for vertical slides
- Live preview while editing
- reveal.js 5.2 themes, transitions, fragments, speaker notes
- Embed other notes into slides
- Math (KaTeX / MathJax), Mermaid, syntax highlighting, charts
- Export as PDF or as a standalone HTML presentation

## Slidey additions

- **Slide presets** — `preset: <name>` in the note frontmatter (deck default) or `<!-- slide preset="quote" -->` per slide. Ships `cover`, `section`, `quote`, `image-left`, `bullets`, `code`, `image-bg`; edit them in Settings → Slide presets.
- **Presentation clicker support** — the deck keeps keyboard focus and PageUp/PageDown/arrows/Space drive it even when the editor is focused.

### Planned

- PPTX export

## Development

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md) for architecture. Quick start (Node 24+, pnpm via corepack):

```bash
corepack pnpm install
cd reveal-dist && corepack pnpm install && corepack pnpm build && cd ..
OUTDIR="<your-dev-vault>/.obsidian/plugins/slidey" corepack pnpm dev
```

`se-test-vault/` is a ready-made dev vault with render test notes.

## Credits

Slidey builds directly on **Slides Extended** by Erin Schnabel, itself the continuation of **Advanced Slides** by Matthäus Szturc. MIT licensed — see [`LICENSE`](LICENSE). Upstream history is preserved in [`CHANGELOG-upstream-slides-extended.md`](CHANGELOG-upstream-slides-extended.md).
