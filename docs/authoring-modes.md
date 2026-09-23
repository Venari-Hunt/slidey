# Authoring modes

A note's frontmatter `slides:` key picks how it is cut into slides. Code: `src/obsidian/slidesMode.ts`.

| `slides:` | Behaviour |
|---|---|
| absent / `separators` | Upstream's `---` (horizontal) and `--` (vertical) separators. Default. |
| `headings` | Every heading starts a slide; its level picks a preset. |
| `blocks` | Planned: `%% slide preset=x %%` regions in an otherwise normal note. Not built yet (falls back to separators). |

## Headings mode

- Every `#`…`######` heading outside fenced code starts a slide. Non-blank text before the first heading is its own slide.
- Level → preset: Settings → **Heading levels** (`settings.headingPresets`, index 0 = `#`). Default: `#` → `cover`, rest → deck default (`preset:` frontmatter).
- `%% … %%` lines directly under a heading (blank lines allowed between) configure that slide and are removed:
  - `%% noslide %%` — leave the section out.
  - `%% preset=quote %%` (or `%% slide preset=quote %%`) — override the level preset. `preset=none` opts out of the deck default.
- An explicit `<!-- slide preset="x" -->` in the section wins; one without `preset` gets the level preset merged in.
- `---` and `--` lines stay ordinary text (horizontal rules).

### How it plugs in

`RevealRenderer.render` calls `applySlidesMode(markdown, options)` right after building `options` and **before** `getSlidifyOptions`. For headings mode it rewrites the note into separator form and swaps `options.separator` / `verticalSeparator` for sentinels (`<!-- @slidey:slide -->`, `<!-- @slidey:vertical -->`). Everything downstream (the 3-phase processor pipeline, `PresetProcessor`, slidify, the browser re-split via `data-separator`) is unchanged.

Sentinel rules: no regex metacharacters (processors `split` on the separator as a regex and `join` on it as a literal), and must not start with `slide` — `CommentParser`'s `<!--\s*\.?slide` regex would read it as a slide annotation.

Editor → slide sync: `RevealPreviewView.getSlideLines` uses `headingsToSlides(...).starts` (source line per slide) in headings mode.

Tests: `test/slidesMode.unit.test.ts`. Live test note: `02 - Projetos/Slidey/_slidey-headings-test.md` in Vault Claude.

## Next

- Gutter dot per heading showing its preset, then a heading pill (the owner's picks for making the preset obvious).
- `blocks` mode.
- Speaker notes and per-slide background image markers.
