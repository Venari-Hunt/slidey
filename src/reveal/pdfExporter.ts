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
    setContentSize(width: number, height: number): void;
    webContents: {
        getURL(): string;
        setZoomFactor(factor: number): void;
        capturePage(rect: {
            x: number;
            y: number;
            width: number;
            height: number;
        }): Promise<{ toPNG(): Uint8Array }>;
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
            webPreferences?: { backgroundThrottling?: boolean };
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

// PowerPoint pictures are taken at this multiple of the slide's size, so
// they stay sharp on a projector.
const PPTX_ZOOM = 2;

// Runs inside the deck page (print layout): each page's box in CSS px and
// its speaker notes as plain text.
const PAGE_BOXES = `[...document.querySelectorAll(".pdf-page")].map((page) => {
    const r = page.getBoundingClientRect();
    const notes = page.querySelector("aside.notes");
    return {
        top: r.top + window.scrollY,
        width: r.width,
        height: r.height,
        // Notes are hidden in print layout, so innerText would be empty.
        notes: notes
            ? [...notes.querySelectorAll("p, li")].map((e) => e.textContent.trim()).join("\\n") ||
              notes.textContent.trim()
            : "",
    };
})`;

/**
 * Renders the deck at `deckUrl` in its print layout in a hidden window, takes
 * a picture of every slide and writes them to `outFile` as a PowerPoint
 * file: one picture per slide, speaker notes in PowerPoint's notes (0.21.0).
 * The text is part of the picture, so it can't be edited in PowerPoint.
 * Returns the slide count.
 */
export async function exportDeckToPptx(
    deckUrl: URL,
    outFile: string,
): Promise<number> {
    const remote = getRemote();
    if (!remote) {
        throw new Error("PowerPoint export needs the Obsidian desktop app.");
    }

    const printUrl = new URL(deckUrl.toString());
    printUrl.hash = "";
    // One page per slide (fragments shown), and no print dialog (template).
    printUrl.search = "print-pdf&pdfSeparateFragments=false&slidey-pptx";

    const win = new remote.BrowserWindow({
        show: false,
        width: 1280,
        height: 960,
        // A throttled hidden window doesn't repaint after a scroll, so every
        // picture would show the same slide.
        webPreferences: { backgroundThrottling: false },
    });
    try {
        await withTimeout("Loading the deck", win.loadURL(printUrl.toString()));
        await withTimeout(
            "Laying out the slides",
            win.webContents.executeJavaScript(WAIT_FOR_PRINT_LAYOUT),
        );
        const pages = (await win.webContents.executeJavaScript(PAGE_BOXES)) as {
            top: number;
            width: number;
            height: number;
            notes: string;
        }[];
        if (!pages.length) {
            throw new Error("The deck has no slides.");
        }
        const { width, height } = pages[0];
        // Scrollbars would end up in the pictures.
        await win.webContents.executeJavaScript(
            `(() => { const s = document.createElement("style"); s.textContent = "::-webkit-scrollbar{display:none} html{scrollbar-width:none}"; document.head.appendChild(s); })()`,
        );
        win.webContents.setZoomFactor(PPTX_ZOOM);
        win.setContentSize(
            Math.ceil(width * PPTX_ZOOM),
            Math.ceil(height * PPTX_ZOOM),
        );

        const { default: PptxGenJS } = await import("pptxgenjs");
        const pptx = new PptxGenJS();
        const slideWidth = 10;
        pptx.defineLayout({
            name: "SLIDEY",
            width: slideWidth,
            height: (slideWidth * height) / width,
        });
        pptx.layout = "SLIDEY";

        for (const page of pages) {
            const at = await win.webContents.executeJavaScript(
                `window.scrollTo(0, ${page.top}); new Promise((r) => setTimeout(() => r(window.scrollY), 250))`,
            );
            if (Math.abs(Number(at) - page.top) > 1) {
                throw new Error("Couldn't scroll to every slide.");
            }
            const image = await withTimeout(
                "Taking a picture of a slide",
                win.webContents.capturePage({
                    x: 0,
                    y: 0,
                    width: Math.floor(width * PPTX_ZOOM),
                    height: Math.floor(height * PPTX_ZOOM),
                }),
            );
            const slide = pptx.addSlide();
            slide.addImage({
                data: `data:image/png;base64,${Buffer.from(image.toPNG()).toString("base64")}`,
                x: 0,
                y: 0,
                w: "100%",
                h: "100%",
            });
            if (page.notes) {
                slide.addNotes(page.notes);
            }
        }

        const file = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
        await mkdir(path.dirname(outFile), { recursive: true });
        await writeFile(outFile, file);
        return pages.length;
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
