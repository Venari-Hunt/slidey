import { type App, normalizePath, TFile } from "obsidian";

/** Used when no template note is set, or it can't be found. */
export const STARTER_DECK = `---
slides: headings
style: night
---

# Deck title
%% layout=title %%
A subtitle, or your name

%% notes %%
Speaker notes: only you see these. Press S in the preview for the speaker view.

## First point
- One idea per bullet
- Keep it short
- Three is plenty

## A quote
%% layout=quote %%

> Say one thing, and say it well.

## Two columns
%% layout=two-column %%

- Left side
- More left

- Right side
- More right

## Thank you
%% layout=title transition=zoom %%
Questions?
`;

const BASE_NAME = "Untitled deck";

/**
 * Creates a new deck note in Obsidian's folder for new notes, filled from
 * the template note at `templatePath` (vault path, `.md` optional) or the
 * built-in starter. Returns the file and whether the template was used.
 */
export async function createDeck(
    app: App,
    templatePath: string,
): Promise<{ file: TFile; missingTemplate: boolean }> {
    const template = findTemplate(app, templatePath);
    const content = template
        ? await app.vault.cachedRead(template)
        : STARTER_DECK;
    const active = app.workspace.getActiveFile()?.path ?? "";
    const folder = app.fileManager.getNewFileParent(active).path;
    const file = await app.vault.create(freePath(app, folder), content);
    return { file, missingTemplate: !!templatePath.trim() && !template };
}

function findTemplate(app: App, templatePath: string): TFile | null {
    const path = templatePath.trim();
    if (!path) {
        return null;
    }
    const withExt = path.toLowerCase().endsWith(".md") ? path : `${path}.md`;
    const file = app.vault.getAbstractFileByPath(normalizePath(withExt));
    return file instanceof TFile ? file : null;
}

// `Untitled deck.md`, then `Untitled deck 1.md`, `Untitled deck 2.md`…
function freePath(app: App, folder: string): string {
    const prefix = folder && folder !== "/" ? `${folder}/` : "";
    for (let n = 0; ; n++) {
        const name = n ? `${BASE_NAME} ${n}` : BASE_NAME;
        const path = normalizePath(`${prefix}${name}.md`);
        if (!app.vault.getAbstractFileByPath(path)) {
            return path;
        }
    }
}
