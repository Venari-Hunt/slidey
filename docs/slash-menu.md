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
- Background picture / darkened / whole picture / color, speaker notes, text color, accent, font, size, step by step (`<!-- element class="fragment" -->`).
- Commands: present, export PDF (both call `showView()` first). **Open slide preview** uses `showPreview` → the plugin's `showView()`, not the `open-preview` command, which toggles and would close an open preview (0.16.1).

`CURSOR` (`{|}`) in an item's `insert` marks where the cursor lands. `selectSuggestion` replaces from the `/` to the **live cursor**, not `context.end`: the stored end lagged the last typed letter in a live test and left it behind.

Live test notes: `Tests/_slidey-slash-menu-test.md` (headings deck), `Tests/_slidey-slash-plain-test.md` (plain note).
