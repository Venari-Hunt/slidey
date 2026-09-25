// Picture names after `bg=` in a slide marker (0.18.0). Pure (no Obsidian
// imports) so it can be unit tested; the editor side is
// `suggesters/PictureSuggester.ts`.

export const PICTURE_FILE = /\.(?:png|jpe?g|gif|webp|svg|bmp|avif)$/i;

export interface PictureFile {
    /** Vault path, e.g. `Photos/Trip/beach.jpg`. */
    path: string;
    /** File name with extension, e.g. `beach.jpg`. */
    name: string;
    /** Last modified, ms. */
    mtime: number;
}

/**
 * The picture name being typed after `bg=` on a `%% … %%` marker line, or
 * null. `bg=[[` is left to Obsidian's own link menu.
 */
export function bgQuery(
    line: string,
    ch: number,
): { start: number; query: string } | null {
    const before = line.slice(0, ch);
    const open = before.lastIndexOf("%%");
    if (open < 0 || before.indexOf("%%") !== open) {
        // No marker opened before the cursor, or it was already closed.
        return null;
    }
    const match = /(?:^|\s)bg=([^\s"[\]]*)$/.exec(before.slice(open + 2));
    if (!match) {
        return null;
    }
    return { start: ch - match[1].length, query: match[1] };
}

function folderOf(path: string): string {
    return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
}

/**
 * Pictures whose path contains every word of `query` (case-insensitive),
 * pictures in the note's folder first, then the most recently changed.
 */
export function rankPictures(
    files: PictureFile[],
    query: string,
    notePath: string,
    limit = 30,
): PictureFile[] {
    const words = query
        .toLowerCase()
        .split(/[\s/]+/)
        .filter(Boolean);
    const here = folderOf(notePath);
    return files
        .filter((file) => PICTURE_FILE.test(file.name))
        .filter((file) =>
            words.every((word) => file.path.toLowerCase().includes(word)),
        )
        .sort((a, b) => {
            const nearA = folderOf(a.path).startsWith(here) ? 0 : 1;
            const nearB = folderOf(b.path).startsWith(here) ? 0 : 1;
            return nearA - nearB || b.mtime - a.mtime;
        })
        .slice(0, limit);
}

/**
 * What to type after `bg=` so Slidey finds exactly this file. Slidey resolves
 * a picture by the one vault path that contains the text, so a name shared by
 * another file needs the full path. Names with spaces go in `[[ ]]`.
 */
export function pictureValue(file: PictureFile, allPaths: string[]): string {
    const unique =
        allPaths.filter((path) => path.includes(file.name)).length === 1;
    const text = unique ? file.name : file.path;
    return /\s/.test(text) ? `[[${text}]]` : text;
}
