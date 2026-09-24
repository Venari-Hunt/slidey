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

## Commands

`slidey:open-preview` (toggles), `reload-preview`, `present-active-presentation`, `print-active-presentation` (opens `?print-pdf` in the browser), `export-active-presentation-pdf`, `export-active-presentation-html`, `start-server-preview`, `stop-server-preview`.
