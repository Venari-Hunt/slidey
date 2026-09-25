import {
    debounce,
    ItemView,
    type MarkdownView,
    type TFile,
    type WorkspaceLeaf,
} from "obsidian";
import { deckMode } from "../obsidian/slashMenu";
import type { SlidesExtendedPlugin } from "../slidesExtended-Plugin";
import { YamlParser } from "../yaml/yamlParser";
import { OVERVIEW_QUERY } from "./overviewScript";
import { slideStartLines } from "./slideLines";

export const SLIDE_OVERVIEW_VIEW = "slidey-slide-overview";

/**
 * A sidebar panel with a small picture of every slide in the active deck
 * (0.19.0). Clicking one moves the note's cursor to that slide, so the
 * preview follows; moving the cursor outlines the matching picture. The
 * pictures are the deck in print layout, scaled down (OVERVIEW_SCRIPT).
 */
export class SlideOverviewView extends ItemView {
    private file: TFile | null = null;
    private starts: number[] = [];
    private currentPage = -1;
    private waitingForSize = false;
    private readyTimer: number | null = null;
    private retries = 0;
    private iframe: HTMLIFrameElement | null = null;
    private boundOnMessage = (ev: MessageEvent) => this.onMessage(ev);
    private reloadSoon = debounce(() => this.reload(), 1500, true);

    constructor(
        leaf: WorkspaceLeaf,
        private plugin: SlidesExtendedPlugin,
    ) {
        super(leaf);
    }

    getViewType(): string {
        return SLIDE_OVERVIEW_VIEW;
    }

    getDisplayText(): string {
        return this.file ? `Slides: ${this.file.basename}` : "Slide overview";
    }

    getIcon(): string {
        return "layout-grid";
    }

    async onOpen(): Promise<void> {
        this.contentEl.addClass("slidey-overview");
        window.addEventListener("message", this.boundOnMessage);
        this.registerEvent(
            this.app.workspace.on("file-open", (file) => {
                if (file) {
                    void this.showFile(file);
                }
            }),
        );
        this.registerEvent(
            this.app.vault.on("modify", (file) => {
                if (file === this.file) {
                    this.reloadSoon();
                }
            }),
        );
        const active = this.app.workspace.getActiveFile();
        if (active) {
            await this.showFile(active);
        } else {
            this.renderEmpty();
        }
    }

    async onClose(): Promise<void> {
        window.removeEventListener("message", this.boundOnMessage);
        this.clearReadyTimer();
    }

    /** Shows `file` if it's a slide note; other notes leave the panel as is. */
    async showFile(file: TFile): Promise<void> {
        if (file.extension !== "md") {
            return;
        }
        const frontmatter =
            this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (!deckMode(frontmatter)) {
            if (!this.file) {
                this.renderEmpty();
            }
            return;
        }
        if (file === this.file && this.iframe) {
            return;
        }
        this.file = file;
        this.currentPage = -1;
        (
            this.leaf as WorkspaceLeaf & { updateHeader?: () => void }
        ).updateHeader?.();
        await this.reload();
    }

    private renderEmpty(): void {
        this.iframe = null;
        this.contentEl.empty();
        this.contentEl.createDiv({
            cls: "slidey-overview-empty",
            text: "Open a slide note to see its slides here.",
        });
    }

    private async reload(): Promise<void> {
        const file = this.file;
        if (!file) {
            return;
        }
        this.starts = slideStartLines(
            await this.app.vault.cachedRead(file),
            new YamlParser(this.plugin.settings),
        );
        this.contentEl.empty();
        this.iframe = null;
        // reveal.js lays out the print pages once, when the deck loads; a
        // deck loaded in a hidden (0-wide) panel never gets them. Wait until
        // the panel has a size (see onResize).
        if (this.contentEl.clientWidth === 0) {
            this.waitingForSize = true;
            return;
        }
        this.waitingForSize = false;
        const url = new URL(this.plugin.revealServer.getTargetUrl(file).href);
        url.search = OVERVIEW_QUERY;
        this.iframe = this.contentEl.createEl("iframe", {
            cls: "slidey-overview-frame",
            attr: { src: url.href },
        });
        this.watchForReady();
    }

    // A deck that never reports its pages (it loaded while Obsidian was busy,
    // or the panel was being moved) gets reloaded, twice at most.
    private watchForReady(): void {
        this.clearReadyTimer();
        this.readyTimer = window.setTimeout(() => {
            this.readyTimer = null;
            if (this.retries < 2 && this.contentEl.clientWidth > 0) {
                this.retries++;
                void this.reload();
            }
        }, 10000);
    }

    private clearReadyTimer(): void {
        if (this.readyTimer !== null) {
            window.clearTimeout(this.readyTimer);
            this.readyTimer = null;
        }
    }

    onResize(): void {
        if (this.waitingForSize && this.contentEl.clientWidth > 0) {
            void this.reload();
        }
    }

    private onMessage(ev: MessageEvent): void {
        if (!this.iframe || ev.source !== this.iframe.contentWindow) {
            return;
        }
        let data: { slidey?: string; page?: number };
        try {
            data = JSON.parse(String(ev.data)) as typeof data;
        } catch {
            return;
        }
        if (data.slidey === "overview-click" && typeof data.page === "number") {
            void this.jumpTo(data.page);
        } else if (data.slidey === "overview-ready") {
            this.clearReadyTimer();
            this.retries = 0;
            if (this.currentPage >= 0) {
                this.markPage(this.currentPage);
            }
        }
    }

    /** Opens the note at the start of slide `page`. */
    private async jumpTo(page: number): Promise<void> {
        const file = this.file;
        const line = this.starts[page];
        if (!file || line === undefined) {
            return;
        }
        let leaf = this.app.workspace
            .getLeavesOfType("markdown")
            .find((l) => (l.view as MarkdownView).file === file);
        if (!leaf) {
            leaf = this.app.workspace.getLeaf(false);
            await leaf.openFile(file);
        }
        this.app.workspace.setActiveLeaf(leaf, { focus: true });
        const editor = (leaf.view as MarkdownView).editor;
        editor.setCursor({ line, ch: 0 });
        editor.scrollIntoView(
            { from: { line, ch: 0 }, to: { line, ch: 0 } },
            true,
        );
        this.currentPage = page;
        this.plugin.getViewInstance()?.onLineChanged(line);
    }

    /** Outlines the slide that holds note line `line` of `file`. */
    onLineChanged(line: number, file: TFile | null): void {
        if (!file || file !== this.file || !this.starts.length) {
            return;
        }
        let page = 0;
        for (let i = 0; i < this.starts.length; i++) {
            if (this.starts[i] <= line) {
                page = i;
            }
        }
        if (page !== this.currentPage) {
            this.markPage(page);
        }
    }

    private markPage(page: number): void {
        this.currentPage = page;
        this.iframe?.contentWindow?.postMessage(
            JSON.stringify({ slidey: "overview-current", page }),
            "*",
        );
    }
}
