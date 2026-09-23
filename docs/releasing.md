# Releasing

## Runtime asset download

At runtime the plugin runs a local Fastify server (default port 3000) serving the rendered deck into an iframe preview / export. It compares `distVersion.json` against `manifest.json`'s version and, if they differ, downloads `slidey.zip` from this repo's matching GitHub release and unpacks the reveal assets (`css/`, `dist/`, `plugin/`, `template/`) into the plugin folder. **So every version needs a real release with `slidey.zip` attached.** The repo is public, so a fresh non-dev install works.

## Cutting a release

```
gh workflow run release.yml -R Venari-Hunt/slidey -f version=<x.y.z|patch|minor|major> -f prerelease=false
```

`release.yml` bumps `package.json` / `manifest.json` / `manifest-beta.json` / `distVersion.json`, commits `🔖 <version>`, tags, builds plugin + `reveal-dist`, packages `slidey.zip`, and publishes the GitHub Release. Afterwards: `git pull`, and check `https://github.com/Venari-Hunt/slidey/releases/download/<version>/slidey.zip` resolves.

- **Don't pre-bump the version or tag by hand** — the workflow does its own bump and hard-errors if the tag exists.
- The workflow does **not** touch `CHANGELOG.md` — write the `## <version> — <date>` section yourself before dispatching.
- `build.yml` / `codeql.yml` are de-submoduled for the flat repo (reveal-dist is a plain directory).

## Release history

User-facing history: `CHANGELOG.md`. Narrative per-cycle notes: `History.md` in the Obsidian vault (`02 - Projetos/Slidey/`).
