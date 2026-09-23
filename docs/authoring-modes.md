# Authoring modes

A note's frontmatter `slides:` key picks how it is cut into slides. Code: `src/obsidian/slidesMode.ts`.

| `slides:` | Behaviour |
|---|---|
| absent / `separators` | Upstream's `---` (horizontal) and `--` (vertical) separators. Default. |
| `headings` | Every heading starts a slide; its level picks a preset. |
| `blocks` | Only `%% slide %%` regions become slides; the rest of the note is ignored. |

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

### Preset dots and pills (editor)

`src/obsidian/presetGutter.ts` — one CM6 `StateField` registered with `registerEditorExtension`, drawn two ways: a `gutter` dot and, at the end of the heading line, a pill widget (`Decoration.widget`, `side: 1`) naming the preset. `markFor()` gives both the same kind/text/color. In a `slides: headings` note each heading line (in `slides: blocks`, each `%% slide %%` line) gets a dot for the preset it resolves to (`headingOutline()` in `slidesMode.ts`, which shares `splitSections` + `readMarkers` with `headingsToSlides`, so the dot and the deck can't disagree). Blank level preset falls back to the frontmatter `preset:`.

| Dot | Meaning |
|---|---|
| filled, colored | preset N in Settings → Slide presets, color `presetDotColor(N)` (8-color palette, cycles) |
| hollow gray ring | no preset (or `preset=none`) |
| dashed red ring | preset name that doesn't exist |
| short dash | `%% noslide %%` |

Pill text: the preset name (in its color), `no preset`, `name?` (red dashed), `not a slide` (struck through).

- Rebuilt on every doc change (parses the frontmatter with `getFrontMatterInfo` + `parseYaml`, not the metadata cache, so toggling `slides:` updates instantly).
- `saveSettings` calls `refreshPresetGutters()`, which dispatches a `refreshMarks` effect to every open editor so dots and pills recolor after settings edits.
- The settings preset list prepends the same dot to each preset name as the legend.
- Spacing lives on the dot, not the gutter, so non-deck notes get a 0-width gutter.
- `@codemirror/state` / `@codemirror/view` are devDependencies pinned to Obsidian's versions and external in esbuild (Obsidian provides them at runtime).

## Blocks mode

`blocksToSlides()` / `blockOutline()` in `slidesMode.ts`.

- A line `%% slide %%` (or `%% slide preset=quote %%`) opens a slide. It ends at `%% endslide %%` / `%% /slide %%`, the next `%% slide %%`, or the end of the note. Marker lines are dropped from the slide.
- Everything outside a region is left out of the deck. `---` inside a region is an ordinary rule.
- No `preset=` → deck default (`preset:` frontmatter). The preset reaches `PresetProcessor` through the same `withPreset()` slide comment as headings mode.
- Markers inside fenced code are text. `%% slideshow %%` and similar are not markers (`slide` must be followed by space or `%`).
- A note with no regions renders one hint slide explaining the markers (HTML entities, so the `%%` isn't read as a comment).
- Uses the same sentinel separators as headings mode; `getSlideLines` uses `blocksToSlides(...).starts` for cursor sync. The dots and pills (below) sit on each `%% slide %%` line.

Live test note: `02 - Projetos/Slidey/_slidey-blocks-test.md` in Vault Claude.

## Next

- Speaker notes and per-slide background image markers.
