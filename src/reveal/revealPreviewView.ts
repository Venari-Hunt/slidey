import path from "node:path";
import {
    ItemView,
    MarkdownView,
    type Menu,
    Notice,
    type WorkspaceLeaf,
} from "obsidian";
import type { Options, SlidesExtendedSettings } from "../@types";
import type { SlidesExtendedPlugin } from "../slidesExtended-Plugin";
import { YamlParser } from "../yaml/yamlParser";
import { exportDeckToPdf, openInDefaultApp } from "./pdfExporter";
import { getSlideLines } from "./slideLines";

export const REVEAL_PREVIEW_VIEW = "reveal-preview-view";

export class RevealPreviewView extends ItemView {
    url = "about:blank";
    private home: URL;
    private onCloseListener: () => void;
    private boundOnMessage = (ev: MessageEvent) => this.onMessage(ev);
    private boundOnFullscreenChange = () => this.onFullscreenChange();
    private presentIdleTimer: number | null = null;

    // Idle delay (ms) before the "exit presentation" control fades back out
    // after the mouse stops moving.
    private static readonly PRESENT_IDLE_MS = 2000;

    private urlRegex = /#\/(\d*)(?:\/(\d*))?(?:\/(\d*))?/;
    private yaml: YamlParser;
    private plugin: SlidesExtendedPlugin;

    // Keys a presentation remote / clicker emits, mapped to the reveal.js
    // postMessage API method that performs the same navigation. Clickers
    // almost always send PageUp/PageDown (some send arrows); Space is the
    // common "advance" on the ones that double as a laser pointer.
    private readonly navKeyMethods: Record<string, string> = {
        PageDown: "next",
        PageUp: "prev",
        ArrowRight: "right",
        ArrowLeft: "left",
        ArrowUp: "up",
        ArrowDown: "down",
        " ": "next",
        Spacebar: "next",
    };

    constructor(
        leaf: WorkspaceLeaf,
        home: URL,
        plugin: SlidesExtendedPlugin,
        settings: SlidesExtendedSettings,
        onCloseListener: () => void,
    ) {
        super(leaf);
        this.home = home;
        this.yaml = new YamlParser(settings);
        this.plugin = plugin;
        this.onCloseListener = onCloseListener;

        this.addAction("globe", "Open in browser", () => {
            this.openInBrowser();
        });

        this.addAction("grid", "Show grid", () => {
            settings.showGrid = !settings.showGrid;
            this.reloadIframe();
        });

        this.addAction("refresh", "Refresh slides", () => {
            this.reloadIframe();
        });

        if (settings.paneMode === "sidebar") {
            this.addAction("monitor-x", "Close preview", () => {
                this.leaf.detach();
            });
        }

        window.addEventListener("message", this.boundOnMessage);

        // Presentation-remote robustness. A physical clicker is just a USB
        // keyboard sending PageUp/PageDown (etc.); those only reach reveal.js
        // if the deck iframe holds keyboard focus. Two safeguards:
        //
        //  1. Pull focus into the iframe whenever the user interacts with the
        //     preview pane (and when a fresh deck finishes loading).
        //  2. If a nav key is pressed while focus is still on the Obsidian
        //     chrome around the preview, forward it to reveal.js over
        //     postMessage. Keydowns raised *inside* the focused iframe never
        //     bubble out to this listener, so this is a pure fallback and
        //     won't double-trigger.
        this.registerDomEvent(this.containerEl, "pointerdown", () => {
            window.setTimeout(() => this.focusDeck(), 0);
        });
        this.registerDomEvent(
            this.containerEl,
            "keydown",
            (evt: KeyboardEvent) => {
                const method = this.navKeyMethods[evt.key];
                if (method && this.forwardToDeck(method)) {
                    evt.preventDefault();
                    evt.stopPropagation();
                }
            },
        );

        // Present mode: while fullscreen, show the "exit presentation"
        // control on mouse movement and let it fade back out once the
        // pointer stops (a real button/mouse click always shows it too,
        // via bubbled mousemove-equivalent activity above).
        this.registerDomEvent(this.containerEl, "pointermove", () =>
            this.onPresentPointerMove(),
        );
        document.addEventListener(
            "fullscreenchange",
            this.boundOnFullscreenChange,
        );
    }

    private getIframe(): HTMLIFrameElement | null {
        return this.containerEl.querySelector("iframe");
    }

    private getViewContent(): HTMLElement {
        return this.containerEl.children[1] as HTMLElement;
    }

    private getPresentExitButton(): HTMLElement | null {
        return this.getViewContent().querySelector<HTMLElement>(
            ".slidey-present-exit",
        );
    }

    /** Enter fullscreen presentation mode, hiding all Obsidian chrome. */
    async presentMode() {
        const viewContent = this.getViewContent();
        if (!viewContent || document.fullscreenElement === viewContent) {
            return;
        }
        try {
            await viewContent.requestFullscreen();
        } catch (err) {
            console.error("Slidey: failed to enter fullscreen", err);
            new Notice("Slidey: couldn't enter fullscreen presentation mode.");
        }
    }

    exitPresentMode() {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        }
    }

    private onFullscreenChange() {
        const viewContent = this.getViewContent();
        if (!viewContent) {
            return;
        }
        const presenting = document.fullscreenElement === viewContent;
        viewContent.toggleClass("is-presenting", presenting);
        if (presenting) {
            this.focusDeck();
        } else {
            this.clearPresentIdleTimer();
            this.getPresentExitButton()?.removeClass("is-visible");
        }
    }

    private onPresentPointerMove() {
        const viewContent = this.getViewContent();
        if (!viewContent?.hasClass("is-presenting")) {
            return;
        }
        this.getPresentExitButton()?.addClass("is-visible");
        this.clearPresentIdleTimer();
        this.presentIdleTimer = window.setTimeout(() => {
            this.getPresentExitButton()?.removeClass("is-visible");
        }, RevealPreviewView.PRESENT_IDLE_MS);
    }

    private clearPresentIdleTimer() {
        if (this.presentIdleTimer !== null) {
            window.clearTimeout(this.presentIdleTimer);
            this.presentIdleTimer = null;
        }
    }

    private focusDeck() {
        const iframe = this.getIframe();
        iframe?.focus();
        iframe?.contentWindow?.focus();
    }

    private forwardToDeck(method: string): boolean {
        const iframe = this.getIframe();
        if (!iframe?.contentWindow || this.url === "about:blank") {
            return false;
        }
        iframe.contentWindow.postMessage(
            JSON.stringify({ method, args: [] }),
            new URL(this.url).origin,
        );
        return true;
    }

    onPaneMenu(menu: Menu, source: string): void {
        super.onPaneMenu(menu, source);

        if (source !== "more-options") {
            return;
        }

        menu.addSeparator();
        menu.addItem((item) => {
            item.setIcon("document")
                .setTitle("Print presentation")
                .onClick(() => this.printPresentation());
        });
        menu.addItem((item) => {
            item.setIcon("file-down")
                .setTitle("Export as PDF")
                .onClick(() => this.exportAsPdf());
        });
        menu.addItem((item) => {
            item.setIcon("install")
                .setTitle("Export as HTML")
                .onClick(() => this.exportAsHtml());
        });
    }

    openInBrowser() {
        window.open(this.home);
    }

    printPresentation() {
        window.open(`${this.home.toString()}?print-pdf`);
    }

    async exportAsPdf() {
        const name = this.plugin.getTargetName().replace(/\.md$/, "");
        if (!name) {
            return;
        }
        const outFile = path.join(
            this.plugin.obsidianUtils.exportDirectory,
            `${name}.pdf`,
        );
        const working = new Notice("Saving slides as PDF…", 0);
        try {
            const pages = await exportDeckToPdf(this.home, outFile);
            working.hide();
            new Notice(`Saved ${pages} slides as PDF:\n${outFile}`, 8000);
            openInDefaultApp(outFile);
        } catch (error) {
            working.hide();
            const msg = error instanceof Error ? error.message : String(error);
            new Notice(`PDF export failed: ${msg}`, 8000);
            console.error("Slidey PDF export failed", error);
        }
    }

    exportAsHtml() {
        const url = new URL(this.url);
        url.searchParams.set("export", "true");
        this.setUrl(url.toString());
    }

    onMessage(msg: MessageEvent) {
        const data = String(msg.data);
        if (data.startsWith('{"slidey"')) {
            // The slide overview panel's own messages, not a deck URL.
            return;
        }
        if (data.includes("?export")) {
            this.setUrl(data.split("?")[0]);
            return;
        }

        this.setUrl(data, false);

        const url = new URL(data);
        let filename = decodeURI(url.pathname);
        filename = filename.substring(filename.lastIndexOf("/") + 1);

        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view?.file.name.includes(filename)) {
            const line = this.getTargetLine(url, view.data);
            // line will be undefined for embedded content
            if (line) {
                view.editor.setCursor(view.editor.lastLine());
                view.editor.setCursor({ line: line, ch: 0 });
            }
        }
    }

    onLineChanged(line: number) {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        const viewContent = this.containerEl.children[1];
        const iframe = viewContent.getElementsByTagName("iframe")[0];

        if (view && iframe) {
            const [x, y] = this.getTargetSlide(line, view.data);
            iframe.contentWindow.postMessage(
                `{"method":"setState","args":[{"indexh":${x},"indexv":${y},"paused":false}]}`,
                this.url,
            );
        }
    }

    getTargetSlide(line: number, source: string): [number, number] {
        const { yamlOptions, markdown } =
            this.yaml.parseYamlFrontMatter(source);
        const separators = this.yaml.getSlideOptions(yamlOptions);
        const yamlLength = source.indexOf(markdown);
        const offset = source.substring(0, yamlLength).split(/^/gm).length;
        const slides = getSlideLines(markdown, separators);

        const cursorPosition = line - (offset > 0 ? offset - 1 : 0);

        let resultKey = null;
        for (const [key, value] of slides.entries()) {
            if (value <= cursorPosition) {
                resultKey = key;
            } else {
                break;
            }
        }
        if (resultKey) {
            const keys = resultKey.split(",");
            return [Number.parseInt(keys[0], 10), Number.parseInt(keys[1], 10)];
        }
        return [0, 0];
    }

    getTargetLine(url: URL, source: string): number {
        const pageString = url.href.substring(url.href.lastIndexOf("#"));
        const [, h, v] = this.urlRegex.exec(pageString);
        const { yamlOptions, markdown } =
            this.yaml.parseYamlFrontMatter(source);
        const separators = this.yaml.getSlideOptions(yamlOptions);
        const yamlLength = source.indexOf(markdown);
        const offset = source.substring(0, yamlLength).split(/^/gm).length;
        const slides = getSlideLines(markdown, separators);

        const hX = Number.parseInt(h, 10) || 0;
        const vX = Number.parseInt(v, 10) || 0;

        return slides.get([hX, vX].join(",")) + offset;
    }

    getViewType() {
        return REVEAL_PREVIEW_VIEW;
    }

    getDisplayText() {
        const name = this.plugin.getTargetName();
        return name ? `Preview: ${name}` : "Slide preview";
    }

    getIcon() {
        return "slides";
    }

    setUrl(url: string, rerender = true) {
        this.url = url;
        if (rerender) {
            this.renderView();
        }
    }

    onChange() {
        this.reloadIframe();
    }

    async onClose() {
        window.removeEventListener("message", this.boundOnMessage);
        document.removeEventListener(
            "fullscreenchange",
            this.boundOnFullscreenChange,
        );
        this.clearPresentIdleTimer();
        this.onCloseListener();
    }

    private reloadIframe() {
        const viewContent = this.containerEl.children[1];
        const iframe = viewContent.getElementsByTagName("iframe")[0];
        iframe.contentWindow.postMessage("reload", this.url);
    }

    private renderView() {
        const viewContent = this.containerEl.children[1];

        viewContent.empty();
        viewContent.addClass("reveal-preview-view");
        const iframe = viewContent.createEl("iframe", {
            attr: {
                // @ts-expect-error:
                src: this.url,
                sandbox: "allow-scripts allow-same-origin allow-popups",
            },
        });
        // Hand keyboard focus to the freshly loaded deck so a clicker works
        // immediately, without the user needing to click the slides first.
        iframe.addEventListener("load", () => this.focusDeck());

        // Overlay control shown only in present mode (fullscreen), faded in
        // on mouse movement and back out after PRESENT_IDLE_MS of stillness.
        const exitButton = viewContent.createEl("button", {
            cls: "slidey-present-exit",
            text: "Exit presentation",
        });
        exitButton.addEventListener("click", () => this.exitPresentMode());
    }
}
