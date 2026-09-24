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
  - `%% style=night %%` — pick a slide style (0.10.0; see `docs/presets.md`). Works in every mode and on the same line as `preset=` / `bg=`.
  - `%% font=… color=… accent=… size=… %%` — one-off overrides for this slide (0.12.0; see `docs/presets.md`). Works in every mode.
  - `%% layout=two-column %%` — pick a slide layout (0.11.0; see `docs/presets.md`). Works in every mode; travels to the processors as `layout="x"` on the slide comment. In headings mode, Settings → Heading levels also maps each level to a layout and a style (`headingLayouts` / `headingStyles`, passed as `headingsToSlides`' third argument).
- An explicit `<!-- slide preset="x" -->` in the section wins; one without `preset` gets the level preset merged in.
- `---` and `--` lines stay ordinary text (horizontal rules).

### How it plugs in

`RevealRenderer.render` calls `applySlidesMode(markdown, options)` right after building `options` and **before** `getSlidifyOptions`. For headings mode it rewrites the note into separator form and swaps `options.separator` / `verticalSeparator` for sentinels (`<!-- @slidey:slide -->`, `<!-- @slidey:vertical -->`). Everything downstream (the 3-phase processor pipeline, `PresetProcessor`, slidify, the browser re-split via `data-separator`) is unchanged.

Sentinel rules: no regex metacharacters (processors `split` on the separator as a regex and `join` on it as a literal), and must not start with `slide` — `CommentParser`'s `<!--\s*\.?slide` regex would read it as a slide annotation.

Editor → slide sync: `RevealPreviewView.getSlideLines` uses `headingsToSlides(...).starts` (source line per slide) in headings mode.

Tests: `test/slidesMode.unit.test.ts`. Live test note: `02 - Projetos/Slidey/_slidey-headings-test.md` in Vault Claude.

### Look dots and pills (editor)

`src/obsidian/presetGutter.ts` — one CM6 `StateField` registered with `registerEditorExtension`, drawn two ways: a `gutter` dot and, at the end of the line, a pill widget (`Decoration.widget`, `side: 1`) naming the slide's **layout · style** (plus preset, if any). `markFor(skip, {preset, layout, style}, known)` gives both the same kind/text/color. Where the marks go, per mode (outlines in `slidesMode.ts`, each sharing its parser with the deck builder so the marks and the deck can't disagree):

- `slides: headings` — each heading line (`headingOutline()`, level → layout/style/preset from Settings → Heading levels).
- `slides: blocks` — each `%% slide %%` line (`blockOutline()`).
- `---` notes — the first non-blank line of each slide (`separatorOutline()`, honoring `separator:` / `verticalSeparator:`). Only when the frontmatter has one of `slides`, `layout`, `style`, `preset`, `theme` — otherwise every note with a horizontal rule would get marks.

A blank pick falls back to the frontmatter `layout:` / `style:` / `preset:`. `preset=` keeps working everywhere, alone or next to `layout=`/`style=`.

| Dot | Meaning |
|---|---|
| filled, colored | style N in Settings → Slide styles (else preset N in Slide presets), color `presetDotColor(N)` (8-color palette, cycles) |
| filled, muted | layout only, no style or preset |
| hollow gray ring | nothing picked (or `=none`) |
| dashed red ring | a name that doesn't exist |
| short dash | `%% noslide %%` |

Pill text: `two-column · night` (in the dot color), `plain`, `nigth?` for an unknown name (red dashed), `not a slide` (struck through). Hover shows `Slide · layout: …, style: …`.

- Rebuilt on every doc change (parses the frontmatter with `getFrontMatterInfo` + `parseYaml`, not the metadata cache, so toggling `slides:` updates instantly).
- `saveSettings` calls `refreshPresetGutters()`, which dispatches a `refreshMarks` effect to every open editor so dots and pills recolor after settings edits.
- The settings style and preset lists prepend the same dot to each name as the legend.
- Spacing lives on the dot, not the gutter, so non-deck notes get a 0-width gutter.
- `@codemirror/state` / `@codemirror/view` are devDependencies pinned to Obsidian's versions and external in esbuild (Obsidian provides them at runtime).

## Blocks mode

`blocksToSlides()` / `blockOutline()` in `slidesMode.ts`.

- A line `%% slide %%` (or `%% slide preset=quote %%`) opens a slide. It ends at `%% endslide %%` / `%% /slide %%`, the next `%% slide %%`, or the end of the note. Marker lines are dropped from the slide.
- Everything outside a region is left out of the deck. `---` inside a region is an ordinary rule.
- No `preset=` → deck default (`preset:` frontmatter). The preset reaches `PresetProcessor` through the same `withPreset()` slide comment as headings mode.
- Markers inside fenced code are text. `%% slideshow %%` and similar are not markers (`slide` must be followed by space or `%`).
- A note with no regions renders one hint slide explaining the markers (HTML entities, so the `%%` isn't read as a comment).
- Uses the same sentinel separators as headings mode; `getSlideLines` uses `blocksToSlides(...).starts` for cursor sync. The dots and pills (above) sit on each `%% slide %%` line.

Live test note: `02 - Projetos/Slidey/_slidey-blocks-test.md` in Vault Claude.

## Markers in separator mode

`separatorMarkers()` in `slidesMode.ts`, called by `applySlidesMode` when `slides:` is absent / `separators`.

- Splits on `(separator|verticalSeparator)` with a capture group, so the separators themselves are kept and slide count/order never changes (editor → slide sync unaffected). Falls back to the default `---` / `--` regexes when the options are empty.
- Per slide, `readMarkers(lines, 0)` consumes the `%% preset=… bg=… %%` lines at the top (blank lines and a whole-line `<!-- slide … -->` comment may sit between). `withAttrs()` writes them onto the slide comment, exactly as in headings mode.
- `%% notes %%` becomes the deck's own `notesSeparator` (`note:` by default), so upstream's `note:` keeps working alongside it.
- `%% noslide %%` is consumed but does nothing here (dropping a slide would break cursor sync).
- Markers below slide content stay as plain Obsidian comments.

Live test note: `02 - Projetos/Slidey/_slidey-separator-markers-test.md` in Vault Claude.

## Speaker notes and backgrounds (both modes)

Handled in `slidesMode.ts` for headings and blocks mode; separator decks get the same markers (above) and also keep upstream's `note:` and `<!-- slide bg="…" -->`.

- **Notes** — a `%% notes %%` (or `%% note %%`) line, anywhere in the slide outside fenced code, becomes `HEADING_NOTES_SEPARATOR` (`<!-- @slidey:notes -->`). `applySlidesMode` sets `options.notesSeparator` to it, so reveal.js (`data-separator-notes`) and the processors that split notes by literal `indexOf` (drop, template) cut there. Only the first marker counts; later ones are dropped (reveal takes one split). Upstream's `note:` separator is off in these modes, so prose containing "note:" stays on the slide.
- **Background** — `bg=` in a heading marker (`%% bg=photo.jpg %%`, `%% preset=quote bg=#224466 %%`) or on the `%% slide … %%` line. `readAttrs()` parses `key=value` pairs (value: `"quoted"`, `[[wikilink]]`, or a bare token). Image filenames and `[[file|alias]]` become `[[file]]`, which `MediaProcessor` rewrites to the vault path (its quoted-link branch); colors and URLs pass through. `withAttrs()` writes `bg="…"` onto the slide comment next to `preset=`. `BackgroundTransformer` turns it into `data-background-image` / `data-background-color`. A `bg` or `data-background-*` already on the slide comment wins; the marker's `bg` beats a preset's `background`.
- A heading marker with any unknown key (`%% bg=a.jpg foo=1 %%`) is left in place as a plain comment.

Live test note: `02 - Projetos/Slidey/_slidey-notes-bg-test.md` in Vault Claude.

## Next

- Transitions per slide (owner deferred).
