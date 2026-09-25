# Slide menu (`/`)

Typing `/` in a deck note opens a menu of slide actions (0.16.0). Pure logic in `src/obsidian/slashMenu.ts` (unit tested in `test/slashMenu.unit.test.ts`); the editor side is `src/obsidian/suggesters/SlashMenuSuggester.ts` (an `EditorSuggest`).

## When it opens

- `slashQuery()`: a `/` at the start of a line or after a space, followed by letters, digits or hyphens up to the cursor. `a/b`, URLs and `/two col` (a space) don't trigger it.
- Not inside the frontmatter, not inside fenced code (`inFencedCode()`).
- **Deck notes** (`deckMode()`: frontmatter has `slides`, `layout`, `style`, `preset` or `theme`, the same rule as the editor dots) show everything on a bare `/`.
- **Other notes** only open it after 2+ letters that match, and only offer the three "Make this note slides" items (`processFrontMatter` sets `slides:`).
- **Nothing matches → returns null**, so the next `/` menu (the owner's Slash Commander, or Obsidian's core slash commands) gets the keystroke. `/table` in a deck still reaches Slash Commander.
- Setting: **Slide menu (/)** (`settings.slashMenu`, default on).

## Priority over other `/` menus

Obsidian's `editorSuggest.trigger` asks each suggest in `suggests` order and the first non-null `onTrigger` wins. `registerEditorSuggest` appends, so `registerSlashMenu()` (plugin) moves the menu to the front (internal API, guarded). Combined with "null when nothing matches", other menus keep working.

## Items

`slashItems(mode, settings)`, filtered by `filterSlashItems()` (every query word must start a word of the title or keywords; titles starting with the query first):

- New slide per mode: `## ` (headings), `---` and vertical `--` (separators), `%% slide %%` … `%% endslide %%` (blocks); `%% noslide %%` (headings), `%% endslide %%` (blocks).
- `Layout: …` (fixed `LAYOUTS`), `Style: …` and `Preset: …` (from settings) → `%% layout=x %%` etc.
- Background picture / darkened / whole picture / color, speaker notes, text color, accent, font, size, one `Transition: <name>` item per reveal transition (`TRANSITIONS` in slashMenu.ts), step by step (`<!-- element class="fragment" -->`).
- Commands: present, export PDF (both call `showView()` first). **Open slide preview** uses `showPreview` → the plugin's `showView()`, not the `open-preview` command, which toggles and would close an open preview (0.16.1).

`CURSOR` (`{|}`) in an item's `insert` marks where the cursor lands. `selectSuggestion` replaces from the `/` to the **live cursor**, not `context.end`: the stored end lagged the last typed letter in a live test and left it behind.

## Picture list after `bg=` (0.18.0)

`src/obsidian/pictureSuggest.ts` (pure, tested in `test/pictureSuggest.unit.test.ts`) + `suggesters/PictureSuggester.ts`.

- `bgQuery()`: cursor after `bg=` inside an **open** `%% … ` marker on the line (a `%%` before the cursor that isn't closed yet). `bg=[[` is left to Obsidian's link menu; `bg=#…` (a color) returns nothing.
- `rankPictures()`: picture extensions only, every typed word in the path, the note's folder (and below) first, then newest `mtime`, max 30.
- `pictureValue()`: `getTFile` resolves a bg name as "the one vault path that contains it", so insert the bare name only when exactly one path contains it, else the full path; `[[ ]]` when it has spaces.
- Registered with `registerFirst()` like the slash menu (both at the front of `editorSuggest.suggests`).
- The slash menu's `bg=` items call Obsidian's internal `editorSuggest.trigger(editor, file, true)` after inserting, so the picture list opens without a keypress (guarded; falls back to opening on the next key).

Live test notes: `Tests/_slidey-slash-menu-test.md` (headings deck), `Tests/_slidey-slash-plain-test.md` (plain note).
