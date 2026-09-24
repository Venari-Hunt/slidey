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
- Quick install into the real vault: copy `build/main.js` + `build/styles.css` into `C:\Claude\Vault Claude\.obsidian\plugins\slidey\`, then `app.plugins.disablePlugin('slidey')` / `enablePlugin('slidey')` over CDP.

## Live testing over CDP

Obsidian must run with `--remote-debugging-port=9222` (standing permission to quit/relaunch the user's Obsidian; close it gracefully via `CloseMainWindow`, relaunch with `Start-Process ... -ArgumentList "--remote-debugging-port=9222"`). Full recipe in Claude memory (`slidey-obsidian-cdp-testing`).

- The deck renders in a separate `type:"iframe"` CDP target at `http://localhost:3000/<vault-relative-path>` — connect to it directly; `window.Reveal` is the reveal.js API. That target **cannot** `Page.captureScreenshot`; screenshot the main page instead.
- `slidey:open-preview` **toggles** the preview pane — calling it when open closes it.
- Obsidian 1.13 opens Settings in a popout window that is **not** a CDP target. To inspect the settings UI, render `app.setting.pluginTabs.find(t => t.id === 'slidey')` into a fixed-position overlay `div` in the main page, then remove it.
- If the document reports `visibilityState: "hidden"`, send `Page.bringToFront`.
