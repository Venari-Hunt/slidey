// Obsidian desktop exposes Electron to plugins as `require("electron")`
// (including the `remote` module). The plugin doesn't bundle the electron
// package, so each caller types the slice it uses.

/** `require("electron")`, typed by the caller. Desktop only. */
export function electron<T>(): T {
    return (window as unknown as { require: (id: string) => T }).require(
        "electron",
    );
}

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface AppWindow {
    id: number;
    getBounds(): Rect;
    setBounds(bounds: Rect): void;
    setFullScreen(on: boolean): void;
}

/** The slice of `remote` two-screen presenting uses. */
export interface WindowRemote {
    BrowserWindow: { getAllWindows(): AppWindow[] };
    getCurrentWindow(): AppWindow;
    screen: {
        getAllDisplays(): { id: number; bounds: Rect }[];
        getDisplayMatching(bounds: Rect): { id: number };
    };
}
