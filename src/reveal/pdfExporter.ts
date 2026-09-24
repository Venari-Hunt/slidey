import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// The slice of Electron's remote API this exporter uses. Obsidian desktop
// exposes it as require("electron").remote; typed here so the plugin does not
// need the electron package.
interface HiddenWindow {
    loadURL(url: string): Promise<void>;
    destroy(): void;
    isDestroyed(): boolean;
    isVisible(): boolean;
    webContents: {
        getURL(): string;
        executeJavaScript(code: string): Promise<unknown>;
        printToPDF(options: {
            printBackground: boolean;
            preferCSSPageSize: boolean;
        }): Promise<Uint8Array>;
    };
}
interface ElectronRemote {
    BrowserWindow: {
        new (options: {
            show: boolean;
            width: number;
            height: number;
        }): HiddenWindow;
        getAllWindows(): HiddenWindow[];
    };
}

// A hung export window blocks the preview server, so every preview goes black.
// Each step gets a time limit, after which the window is closed regardless.
const STEP_TIMEOUT_MS = 30000;

// Runs inside the deck page: resolves once reveal.js has laid the slides out
// as print pages, fonts are loaded and every image has finished loading.
const WAIT_FOR_PRINT_LAYOUT = `new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
        const pages = document.querySelectorAll(".pdf-page").length;
        const imagesDone = [...document.images].every((img) => img.complete);
        if ((window.Reveal?.isReady?.() && pages > 0 && imagesDone) || Date.now() - started > 15000) {
            document.fonts.ready.then(() => setTimeout(() => resolve(pages), 300));
        } else {
            setTimeout(check, 100);
        }
    };
    check();
})`;

function getRemote(): ElectronRemote | undefined {
    return (require("electron") as { remote?: ElectronRemote }).remote;
}

function withTimeout<T>(step: string, work: Promise<T>): Promise<T> {
    let timer: number | undefined;
    const limit = new Promise<never>((_, reject) => {
        timer = window.setTimeout(
            () =>
                reject(
                    new Error(
                        `${step} took longer than ${STEP_TIMEOUT_MS / 1000} seconds.`,
                    ),
                ),
            STEP_TIMEOUT_MS,
        );
    });
    return Promise.race([work, limit]).finally(() =>
        window.clearTimeout(timer),
    );
}

function closeWindow(win: HiddenWindow): void {
    if (!win.isDestroyed()) {
        win.destroy();
    }
}

/**
 * Closes hidden export windows left open by an earlier export (for example one
 * that hung before this fix, or that outlived a plugin reload).
 */
export function closeLeftoverExportWindows(): void {
    const remote = getRemote();
    if (!remote) {
        return;
    }
    for (const win of remote.BrowserWindow.getAllWindows()) {
        if (
            !win.isDestroyed() &&
            !win.isVisible() &&
            win.webContents.getURL().includes("?print-pdf")
        ) {
            win.destroy();
        }
    }
}

/**
 * Renders the deck at `deckUrl` in its print layout (one slide per page) in a
 * hidden window and writes it to `outFile` as a PDF. Returns the page count.
 */
export async function exportDeckToPdf(
    deckUrl: URL,
    outFile: string,
): Promise<number> {
    const remote = getRemote();
    if (!remote) {
        throw new Error("PDF export needs the Obsidian desktop app.");
    }

    const printUrl = new URL(deckUrl.toString());
    printUrl.hash = "";
    printUrl.search = "print-pdf";

    const win = new remote.BrowserWindow({
        show: false,
        width: 1280,
        height: 960,
    });
    try {
        await withTimeout("Loading the deck", win.loadURL(printUrl.toString()));
        const pages = Number(
            await withTimeout(
                "Laying out the slides",
                win.webContents.executeJavaScript(WAIT_FOR_PRINT_LAYOUT),
            ),
        );
        const pdf = await withTimeout(
            "Printing the PDF",
            win.webContents.printToPDF({
                printBackground: true,
                preferCSSPageSize: true,
            }),
        );
        await mkdir(path.dirname(outFile), { recursive: true });
        await writeFile(outFile, pdf);
        return pages;
    } finally {
        closeWindow(win);
    }
}

/** Opens a file in the system's default app (the PDF viewer, for a PDF). */
export function openInDefaultApp(file: string): void {
    const { shell } = require("electron") as {
        shell: { openPath(file: string): Promise<string> };
    };
    void shell.openPath(file);
}
