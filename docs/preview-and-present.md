# Preview view, clickers, present mode

Code: `src/reveal/revealPreviewView.ts` (leaf type `reveal-preview-view`, upstream name).

## Presentation-clicker robustness (0.2.0)

- `focusDeck()` runs on iframe `load` and on `pointerdown` anywhere in the preview pane, so keyboard focus lands in the deck.
- `navKeyMethods` + a `keydown` fallback on `containerEl` forward PageUp/PageDown/Arrow keys/Space to reveal.js as `{method: 'next'|'prev'|'left'|'right'|'up'|'down'}` via `postMessage` when focus is on Obsidian chrome. reveal.js 5.2 has `postMessage: true` by default; its blacklist is only `registerPlugin|registerKeyboardShortcut|addKeyBinding|addEventListener|showPreview`.
- Keydowns inside the iframe don't bubble to the parent listener → no double-trigger.
- Known latent issue: editor↔deck cursor sync (`LineSelectionListener.onTrigger` → `onLineChanged` → `setState`) can fight navigation if something moves the editor cursor mid-sequence. Keys < 650 ms apart can coalesce during a slide transition.

## Present mode (0.2.0)

Command `present-active-presentation` ("Present slides (fullscreen)", no default hotkey). `presentMode()` / `exitPresentMode()` put the view's content element in real Fullscreen API mode; a `fullscreenchange` listener toggles `.is-presenting`; a `pointermove` idle timer (2 s) fades a `.slidey-present-exit` button in/out (top-right). Escape or the button exits back to whatever pane layout was already configured.

## Commands

`slidey:open-preview` (toggles), `reload-preview`, `present-active-presentation`, `print-active-presentation`, `export-active-presentation-html`, `start-server-preview`, `stop-server-preview`.
