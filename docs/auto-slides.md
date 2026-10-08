# Auto slides (0.24.0)

Write plain text, separate slides with `---`, and each slide gets a layout picked from its content, in one dark house theme. Code: `src/domain/autoLayout.ts` (rules, no DOM), `HOUSE_THEME_CSS` and the `statement` / `bullets` / `image-side` layouts in `src/presets.ts`.

## When it is on

`isAutoDeck(options)`: setting **Auto slides** (`autoSlides`, default on; note frontmatter `autoSlides:` overrides it) **and** no `preset:` / `style:` / `layout:` in the note frontmatter. Decks written for the old look system keep it. Upstream snapshot tests pass no `autoSlides`, so they still cover the old path.

## Picking a layout

`guessLayout(slide)` reads the visible lines (drops `<!-- … -->` and `%% … %%` lines, stops at `note:` / the notes sentinel). First match wins:

| Slide content | Layout |
|---|---|
| a fenced code block | `code` |
| one image, at most a heading | `image-full` |
| image(s) + text | `image-side` (2+ images, no text → `""`, the gallery row) |
| every body line is `>` | `quote` |
| heading only | `title` for `#`, `section` for `##`+ |
| a list | `bullets`; 8+ items → `two-column` |
| `#` + one line ≤ 16 words | `title` (subtitle) |
| one line ≤ 14 words, no heading | `statement` |
| anything else | `""` — default text slide (left-aligned in the house theme) |

A `%% layout=x %%` line on the slide still wins: `PresetProcessor` (`LAYOUTS_KIND.auto`) only uses the guess when there is no per-slide or deck layout.

`separateQuoteCredit` puts a blank `>` line before a `> — Name` line under a quote, so the credit is its own paragraph (styled smaller, upright, dimmed).

## House theme

`HOUSE_THEME_CSS` goes last in the `presetStyles` slot when `isAutoDeck`. It overrides reveal theme variables with `:root:root`: near-black `#0e0e0f`, text `#e9e7e1`, headings white, accent warm yellow `#f5c542` (list markers, quote bar, controls, progress; no heading underline since 0.25.0). System fonts (Inter → Segoe UI → system-ui), so nothing is downloaded.

- `image-full` (every deck, 0.25.0): picture at `brightness(.7)` plus a radial vignette on the wrapper `::after` (`z-index:0`, under the text at `z-index:1`).
- `autoDeckSize` makes auto decks 1280×720 (16:9) unless the frontmatter sets `width:` / `height:`; applied in `RevealRenderer.render` right after `getSlideOptions`.
- Two-column in auto decks keeps the wrapper flex-centered and splits only the list (`column-count:2`, `align-self:stretch`). A list at `width:100%` plus its indent overflowed and text-fit shrank it to half size.

## Starter deck

`STARTER_DECK` (`src/obsidian/newDeck.ts`) is a plain-text `---` deck with no frontmatter, so **New slide deck** starts in auto mode.

**Test note:** `02 - Projetos/Slidey/Tests/Sample talk - auto slides.md` (12 slides, every layout but code). Screenshots: headless Edge over CDP, see `docs/development.md`.
