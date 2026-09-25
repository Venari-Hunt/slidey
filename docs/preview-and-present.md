# Preview view, clickers, present mode

Code: `src/reveal/revealPreviewView.ts` (leaf type `reveal-preview-view`, upstream name).

## Presentation-clicker robustness (0.2.0)

- `focusDeck()` runs on iframe `load` and on `pointerdown` anywhere in the preview pane, so keyboard focus lands in the deck.
- `navKeyMethods` + a `keydown` fallback on `containerEl` forward PageUp/PageDown/Arrow keys/Space to reveal.js as `{method: 'next'|'prev'|'left'|'right'|'up'|'down'}` via `postMessage` when focus is on Obsidian chrome. reveal.js 5.2 has `postMessage: true` by default; its blacklist is only `registerPlugin|registerKeyboardShortcut|addKeyBinding|addEventListener|showPreview`.
- Keydowns inside the iframe don't bubble to the parent listener → no double-trigger.
- Known latent issue: editor↔deck cursor sync (`LineSelectionListener.onTrigger` → `onLineChanged` → `setState`) can fight navigation if something moves the editor cursor mid-sequence. Keys < 650 ms apart can coalesce during a slide transition.

## Present mode (0.2.0)

Command `present-active-presentation` ("Present slides (fullscreen)", no default hotkey). `presentMode()` / `exitPresentMode()` put the view's content element in real Fullscreen API mode; a `fullscreenchange` listener toggles `.is-presenting`; a `pointermove` idle timer (2 s) fades a `.slidey-present-exit` button in/out (top-right). Escape or the button exits back to whatever pane layout was already configured.

## PDF export (0.15.0)

`src/reveal/pdfExporter.ts`. `exportDeckToPdf(deckUrl, outFile)` opens a hidden Electron `BrowserWindow` (via `require("electron").remote`, which Obsidian desktop exposes) on the deck URL with `?print-pdf`, waits in-page for reveal's print layout (`.pdf-page` count > 0, `Reveal.isReady()`, all images complete, `document.fonts.ready`; 15 s cap), then `webContents.printToPDF({printBackground, preferCSSPageSize})` — reveal's print CSS sets the page size to the slide size, so one slide = one page. Output: `<exportDirectory>/<note name>.pdf` (setting default `/export`), opened with `shell.openPath`. `RevealPreviewView.exportAsPdf()` wraps it with a working/done Notice.

Hung windows (0.15.1): a hidden export window that never finished blocked the preview server, so every preview went black. Each step (`loadURL`, the layout wait, `printToPDF`) is now raced against a 30 s limit (`STEP_TIMEOUT_MS`) and the window is destroyed in `finally`. `closeLeftoverExportWindows()` runs on plugin load and unload: it destroys any hidden `BrowserWindow` whose URL contains `?print-pdf`.

Gotcha: headless Chrome's `--print-to-pdf` flag prints before reveal lays out → blank 1 KB PDF. Always wait for `.pdf-page` first.

## Slide overview panel (0.19.0)

`src/reveal/slideOverviewView.ts` (view `slidey-slide-overview`, right sidebar, command `show-slide-overview`, `/overview` in the slash menu).

- The panel is an iframe of the deck with `OVERVIEW_QUERY` (`?print-pdf&pdfSeparateFragments=false&slidey-overview`): reveal's print layout = one `.pdf-page` per slide, fragments not split. `OVERVIEW_SCRIPT` (`overviewScript.ts`, always in the template's `slideyScript` slot, no-op without `slidey-overview` in the query) zooms `<html>` to the panel width, posts `{"slidey":"overview-click","page":i}` on click and `overview-ready` once laid out, and outlines the page named in `overview-current`.
- Print layout **flattens vertical stacks**, so a click carries only the page index. `slideStartLines()` (`slideLines.ts`, moved out of the preview view with `getSlideLines`) lists each slide's note line in deck order; page i → line i. Cursor moves (`LineSelectionListener`) call `onLineChanged` → last start ≤ line → `overview-current`.
- **The preview's message handler takes every window message as a deck URL.** It now ignores data starting with `{"slidey"`; without that, the panel's messages would replace the preview's URL.
- **The template called `window.print()` on any `print-pdf` URL.** It now skips that when the URL has `slidey-overview` (template change → ships in `slidey.zip`).
- reveal lays out print pages once, at load. A deck loaded into a 0-wide (hidden) panel never gets them, so `reload()` waits for a size (`onResize`), and a deck that hasn't posted `overview-ready` within 10 s is reloaded (twice at most).
- Reloads 1.5 s after the note changes (`vault.on("modify")`), and on `file-open` of another deck note (`deckMode()` on the metadata cache frontmatter).
- Testing gotcha: after the panel reloads, CDP's `/json/list` can still point at the closed frame (reports 0×0, hidden). Screenshot the main page instead.

## Two-screen presenting (0.20.0)

`src/reveal/speakerView.ts` (`AudienceView` `slidey-audience`, `SpeakerView` `slidey-speaker`), `speakerScript.ts` (`SPEAKER_SCRIPT`, always in `slideyScript`). Command `present-with-speaker-view`, `/speaker`, and **S** in any deck iframe.

- `presentWithSpeakerView()`: speaker view in a new main-window tab, audience in `openPopoutLeaf()`. The new popout's `BrowserWindow` is the one not in the id set taken before opening; `moveToSecondScreen()` picks a display other than `screen.getDisplayMatching(main.getBounds())`, then `setBounds` + `setFullScreen(true)`. One screen → a Notice, windowed.
- Audience deck (`?slidey-audience`) posts `{"slidey":"state",h,v,f,index,total,notes,next,title}` on `slidechanged` / `fragmentshown` / `fragmenthidden`; next = `Reveal.getIndices(getSlides()[at+1])`. Esc is rebound to post `{"slidey":"end"}`.
- **The deck posts to the popout window, not the main one.** A popout view's `onOpen` runs before Obsidian moves it into the popout, so `contentEl.win` is still the main window there. `AudienceView` attaches its `message` listener in `show()` (`listenOn(contentEl.win)`).
- Speaker view: two mirror iframes (`MIRROR_QUERY`: `slidey-mirror` + reveal query options `controls=false&progress=false&keyboard=false&transition=none…`) moved with reveal's postMessage `slide(h, v, f)`. A transparent cover over each keeps focus in the speaker view, whose `keydown` (PageDown/Up, arrows, Space) calls `AudienceView.go()`. Notes: reveal's notes HTML → `DOMParser` → text (never inserted as HTML).
- S: reveal's notes plugin `window.open()`s a popup, which Obsidian blocks (`open()` returned null → `Cannot set properties of null (setting 'marked')`). In any deck inside an iframe, `SPEAKER_SCRIPT` rebinds S (keyCode 83) to post `{"slidey":"open-speaker-view"}`; the plugin listens on `window`.
- The preview ignores messages whose data matches `[?&]slidey-` (URLs posted by the overview, audience or mirror copies on `popstate`) or starts with `{"slidey"`.
- `onunload()` calls `endSpeakerPresentation()`: disabling the plugin used to leave the full-screen popout open. Testing gotcha: re-enabling Slidey right after a speaker session once took minutes to finish loading; not investigated yet.

## Commands

`slidey:open-preview` (toggles), `show-slide-overview`, `present-with-speaker-view`, `reload-preview`, `present-active-presentation`, `print-active-presentation` (opens `?print-pdf` in the browser), `export-active-presentation-pdf`, `export-active-presentation-html`, `start-server-preview`, `stop-server-preview`.
