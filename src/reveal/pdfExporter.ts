import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// The slice of Electron's remote API this exporter uses. Obsidian desktop
// exposes it as require("electron").remote; typed here so the plugin does not
// need the electron package.
interface HiddenWindow {
    loadURL(url: string): Promise<void>;
    destroy(): void;
    webContents: {
        executeJavaScript(code: string): Promise<unknown>;
        printToPDF(options: {
            printBackground: boolean;
            preferCSSPageSize: boolean;
        }): Promise<Uint8Array>;
    };
}
interface ElectronRemote {
    BrowserWindow: new (options: {
        show: boolean;
        width: number;
        height: number;
    }) => HiddenWindow;
}

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

/**
 * Renders the deck at `deckUrl` in its print layout (one slide per page) in a
 * hidden window and writes it to `outFile` as a PDF. Returns the page count.
 */
export async function exportDeckToPdf(
    deckUrl: URL,
    outFile: string,
): Promise<number> {
    const remote = (require("electron") as { remote?: ElectronRemote }).remote;
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
        await win.loadURL(printUrl.toString());
        const pages = Number(
            await win.webContents.executeJavaScript(WAIT_FOR_PRINT_LAYOUT),
        );
        const pdf = await win.webContents.printToPDF({
            printBackground: true,
            preferCSSPageSize: true,
        });
        await mkdir(path.dirname(outFile), { recursive: true });
        await writeFile(outFile, pdf);
        return pages;
    } finally {
        win.destroy();
    }
}

/** Opens a file in the system's default app (the PDF viewer, for a PDF). */
export function openInDefaultApp(file: string): void {
    const { shell } = require("electron") as {
        shell: { openPath(file: string): Promise<string> };
    };
    void shell.openPath(file);
}
