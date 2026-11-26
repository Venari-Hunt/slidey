# Development and live testing

## Build

Prereqs: Node 24+, pnpm via `corepack` (`corepack pnpm ...`; the repo pins the version in `package.json`).

```
corepack pnpm install
cd reveal-dist && corepack pnpm install && corepack pnpm build && cd ..
OUTDIR="<dev-vault>/.obsidian/plugins/slidey" corepack pnpm dev
```

- `corepack pnpm build` = Biome check (`prebuild`) → esbuild production → Jest (`postbuild`). **Output lands in `build/`** (`build/main.js`, `build/styles.css`), not the repo-root `main.js`.
- Styles source: `src/scss/styles.scss`.
- `pnpm dev:vault` assembles a complete plugin folder into `se-test-vault/` (upstream's dev vault, with render test notes: `media-test.md`, `math-test.md`, `mermaid-test.md`, …). `.hotreload` in the output dir makes the Hot-Reload plugin pick up rebuilds.
- Live test notes + their images live in `C:\Claude\Vault Claude\02 - Projetos\Slidey\Tests\` (`_slidey-*-test.md`). Put new ones there, never loose in the project folder.
- Quick install into the real vault: copy `build/main.js` + `build/styles.css` into `C:\Claude\Vault Claude\.obsidian\plugins\slidey\`, then `app.plugins.disablePlugin('slidey')` / `enablePlugin('slidey')` over CDP. BRAT (`updateAtStartup: true`) replaces a copied build at the next Obsidian start whenever a newer pre-release exists than the folder's `manifest.json` version, so check that version against `gh release list` (2026-11-25: the 0.28.2 release overwrote a dev build).

## Live testing over CDP

Obsidian must run with `--remote-debugging-port=9222` (standing permission to quit/relaunch the user's Obsidian; close it gracefully via `CloseMainWindow`, relaunch with `Start-Process ... -ArgumentList "--remote-debugging-port=9222"`). Full recipe in Claude memory (`slidey-obsidian-cdp-testing`).

- The deck renders in a separate `type:"iframe"` CDP target at `http://localhost:3000/<vault-relative-path>` — connect to it directly; `window.Reveal` is the reveal.js API. That target **cannot** `Page.captureScreenshot`; screenshot the main page instead.
- `slidey:open-preview` **toggles** the preview pane — calling it when open closes it.
- Obsidian 1.13 opens Settings in a popout window that is **not** a CDP target. To inspect the settings UI, render `app.setting.pluginTabs.find(t => t.id === 'slidey')` into a fixed-position overlay `div` in the main page, then remove it.
- If the document reports `visibilityState: "hidden"`, send `Page.bringToFront`.

## Obsidian review lint

`corepack pnpm exec eslint src` runs the same `eslint-plugin-obsidianmd` rules as Obsidian's plugin-directory review. Keep it at 0 errors (warnings are advisory). Rules that bite: no `element.style.x =` (use a CSS class or `setCssProps`), no `<style>` elements, no `createEl("h1".."h6")` inside a `PluginSettingTab` class, and type `JSON.parse`/`parseYaml` results.

## reveal.js 6 layout (since the 5.2 to 6.0 bump)

- Plugins ship as `dist/plugin/<name>.js` (UMD, globals `RevealMarkdown` etc.) and `.mjs`; CSS has no `dist/` prefix (`reveal.js/reveal.css`); types are bundled (no `@types/reveal.js`).
- The package is `"type": "module"`, so a bundler's `require()` of the UMD `.js` gets an empty namespace. `src/reveal/markdown.js` therefore imports the `.mjs` default factory.
- `reveal-dist/esbuild.config.mjs` copies each plugin back to `plugin/<name>/<name>.js`, so the deck templates keep their URLs.
- `RevealMarkdown().marked` is `null` until `init()` runs; `reveal-dist/plugin/obsidian-markdown.js` passes its marked extensions through the `markdown` config instead. marked is v17, so renderers take token objects (`renderer.code({text, lang, escaped})`).
- Static render check with no Obsidian: build `reveal-dist`, then `node scripts/render-check.mjs reveal-dist/build <scratch-dir>` renders the real `reveal.html` template (callout, fenced-code placeholder, KaTeX, fragment, notes) in headless Edge and prints what rendered; open `<scratch-dir>/shot.png`.

## Slide screenshots without a visible window

The preview iframe can't be screenshotted, and fullscreen hangs when the Obsidian window is hidden. Instead, launch headless Edge with `--remote-debugging-port`, `Page.navigate` to `http://localhost:3000/<vault path>`, step with `Reveal.slide(i)` and `Page.captureScreenshot` each slide (a Node script, ~40 lines). Edge's own `--screenshot` flag hangs on the deck's live-reload connection.
