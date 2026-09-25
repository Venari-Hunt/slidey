import { ItemView, type TFile, type WorkspaceLeaf } from "obsidian";
import type { SlidesExtendedPlugin } from "../slidesExtended-Plugin";
import { AUDIENCE_QUERY, MIRROR_QUERY } from "./speakerScript";

export const AUDIENCE_VIEW = "slidey-audience";
export const SPEAKER_VIEW = "slidey-speaker";

/** Where the audience deck is, as its page reports it (SPEAKER_SCRIPT). */
export interface DeckState {
    h: number;
    v: number;
    f: number;
    index: number;
    total: number;
    notes: string;
    next: { h: number; v: number; f?: number } | null;
    title: string;
}

// Keys a clicker (or keyboard) sends → reveal.js postMessage API method.
const NAV_KEYS: Record<string, string> = {
    PageDown: "next",
    PageUp: "prev",
    ArrowRight: "next",
    ArrowLeft: "prev",
    ArrowDown: "down",
    ArrowUp: "up",
    " ": "next",
    Spacebar: "next",
};

function deckUrl(plugin: SlidesExtendedPlugin, file: TFile, query: string) {
    const url = new URL(plugin.revealServer.getTargetUrl(file).href);
    url.search = query;
    return url;
}

function send(
    frame: HTMLIFrameElement | null,
    method: string,
    args: unknown[],
) {
    if (!frame?.contentWindow) {
        return;
    }
    frame.contentWindow.postMessage(
        JSON.stringify({ method, args }),
        new URL(frame.src).origin,
    );
}

/**
 * The slides only, for the projector (0.20.0). Opens in its own window; the
 * plugin moves that window to a second screen and makes it full screen.
 */
export class AudienceView extends ItemView {
    file: TFile | null = null;
    frame: HTMLIFrameElement | null = null;
    private listening: Window | null = null;
    private boundOnMessage = (ev: MessageEvent) => this.onMessage(ev);

    constructor(
        leaf: WorkspaceLeaf,
        private plugin: SlidesExtendedPlugin,
    ) {
        super(leaf);
    }

    getViewType(): string {
        return AUDIENCE_VIEW;
    }

    getDisplayText(): string {
        return this.file ? `Audience: ${this.file.basename}` : "Audience";
    }

    getIcon(): string {
        return "projector";
    }

    async onOpen(): Promise<void> {
        this.contentEl.addClass("slidey-audience");
        this.registerDomEvent(this.contentEl, "keydown", (ev) => {
            const method = NAV_KEYS[ev.key];
            if (method) {
                ev.preventDefault();
                this.go(method);
            }
        });
    }

    async onClose(): Promise<void> {
        this.listenOn(null);
        this.plugin.getSpeakerView()?.onAudienceClosed();
    }

    // The deck posts to the window this view lives in, which is the popout
    // window, not Obsidian's main one. The view opens before Obsidian moves
    // it into the popout, so listen from show(), not onOpen().
    private listenOn(win: Window | null): void {
        this.listening?.removeEventListener("message", this.boundOnMessage);
        this.listening = win;
        win?.addEventListener("message", this.boundOnMessage);
    }

    show(file: TFile): void {
        this.listenOn(this.contentEl.win);
        this.file = file;
        this.contentEl.empty();
        this.frame = this.contentEl.createEl("iframe", {
            cls: "slidey-audience-frame",
            attr: { src: deckUrl(this.plugin, file, AUDIENCE_QUERY).href },
        });
        this.frame.addEventListener("load", () => this.focusDeck());
    }

    focusDeck(): void {
        this.frame?.focus();
        this.frame?.contentWindow?.focus();
    }

    go(method: string, args: unknown[] = []): void {
        send(this.frame, method, args);
    }

    private onMessage(ev: MessageEvent): void {
        if (!this.frame || ev.source !== this.frame.contentWindow) {
            return;
        }
        let data: { slidey?: string } & Partial<DeckState>;
        try {
            data = JSON.parse(String(ev.data));
        } catch {
            return;
        }
        if (data.slidey === "state") {
            this.plugin.getSpeakerView()?.onState(data as DeckState);
        } else if (data.slidey === "end") {
            this.plugin.endSpeakerPresentation();
        }
    }
}

/**
 * The presenter's screen (0.20.0): the current slide, the next slide, the
 * speaker notes, a timer and prev/next buttons. Keys pressed here (a clicker
 * too) move the audience deck; its reported position moves everything else.
 */
export class SpeakerView extends ItemView {
    file: TFile | null = null;
    private current: HTMLIFrameElement | null = null;
    private next: HTMLIFrameElement | null = null;
    private notesEl: HTMLElement | null = null;
    private counterEl: HTMLElement | null = null;
    private timerEl: HTMLElement | null = null;
    private clockEl: HTMLElement | null = null;
    private started = 0;
    private ticker: number | null = null;

    constructor(
        leaf: WorkspaceLeaf,
        private plugin: SlidesExtendedPlugin,
    ) {
        super(leaf);
    }

    getViewType(): string {
        return SPEAKER_VIEW;
    }

    getDisplayText(): string {
        return this.file ? `Speaker: ${this.file.basename}` : "Speaker view";
    }

    getIcon(): string {
        return "presentation";
    }

    async onOpen(): Promise<void> {
        this.contentEl.addClass("slidey-speaker");
        this.contentEl.tabIndex = 0;
        this.registerDomEvent(this.contentEl, "keydown", (ev) => {
            const method = NAV_KEYS[ev.key];
            if (method) {
                ev.preventDefault();
                this.plugin.getAudienceView()?.go(method);
            }
        });
        this.ticker = window.setInterval(() => this.tick(), 1000);
    }

    async onClose(): Promise<void> {
        if (this.ticker !== null) {
            window.clearInterval(this.ticker);
        }
    }

    show(file: TFile): void {
        this.file = file;
        this.started = 0;
        const el = this.contentEl;
        el.empty();

        const bar = el.createDiv({ cls: "slidey-speaker-bar" });
        const prev = bar.createEl("button", { text: "◀ Previous" });
        const nextBtn = bar.createEl("button", {
            text: "Next ▶",
            cls: "mod-cta",
        });
        this.counterEl = bar.createSpan({ cls: "slidey-speaker-counter" });
        this.timerEl = bar.createSpan({
            cls: "slidey-speaker-timer",
            text: "00:00",
        });
        const reset = bar.createEl("button", { text: "Reset timer" });
        const end = bar.createEl("button", { text: "End" });
        end.onclick = () => this.plugin.endSpeakerPresentation();
        this.clockEl = bar.createSpan({ cls: "slidey-speaker-clock" });
        prev.onclick = () => this.plugin.getAudienceView()?.go("prev");
        nextBtn.onclick = () => this.plugin.getAudienceView()?.go("next");
        reset.onclick = () => {
            this.started = Date.now();
            this.tick();
        };

        const main = el.createDiv({ cls: "slidey-speaker-main" });
        const slides = main.createDiv({ cls: "slidey-speaker-slides" });
        this.current = this.mirror(slides, "Now", file);
        this.next = this.mirror(slides, "Next", file);
        const notes = main.createDiv({ cls: "slidey-speaker-notes" });
        notes.createDiv({ cls: "slidey-speaker-label", text: "Notes" });
        this.notesEl = notes.createDiv({ cls: "slidey-speaker-notes-text" });
        this.tick();
        el.focus();
    }

    private mirror(parent: HTMLElement, label: string, file: TFile) {
        const box = parent.createDiv({ cls: "slidey-speaker-slide" });
        box.createDiv({ cls: "slidey-speaker-label", text: label });
        const frameBox = box.createDiv({ cls: "slidey-speaker-frame" });
        const frame = frameBox.createEl("iframe", {
            attr: {
                src: deckUrl(this.plugin, file, MIRROR_QUERY).href,
                tabindex: "-1",
            },
        });
        // Clicks land on the cover, so the copy never takes keyboard focus.
        frameBox.createDiv({ cls: "slidey-speaker-cover" }).onclick = () =>
            this.contentEl.focus();
        return frame;
    }

    onState(state: DeckState): void {
        if (!this.started) {
            this.started = Date.now();
        }
        send(this.current, "slide", [state.h, state.v, state.f]);
        if (state.next) {
            send(this.next, "slide", [state.next.h, state.next.v, -1]);
            this.next?.parentElement?.removeClass("is-end");
        } else {
            this.next?.parentElement?.addClass("is-end");
        }
        if (this.counterEl) {
            this.counterEl.setText(
                `Slide ${state.index + 1} of ${state.total}`,
            );
        }
        if (this.notesEl) {
            this.notesEl.empty();
            if (state.notes.trim()) {
                // reveal renders the notes Markdown to HTML; show it as text
                // lines so nothing from the deck runs here.
                const doc = new DOMParser().parseFromString(
                    state.notes,
                    "text/html",
                );
                for (const br of Array.from(doc.querySelectorAll("br"))) {
                    br.replaceWith("\n");
                }
                for (const block of Array.from(
                    doc.querySelectorAll("p, li, div, h1, h2, h3, h4"),
                )) {
                    block.append("\n");
                }
                this.notesEl.setText((doc.body.textContent ?? "").trim());
            } else {
                this.notesEl.createSpan({
                    cls: "slidey-speaker-empty",
                    text: "No notes on this slide. Add them under %% notes %%.",
                });
            }
        }
    }

    onAudienceClosed(): void {
        if (this.counterEl) {
            this.counterEl.setText("Audience window closed");
        }
    }

    private tick(): void {
        const now = new Date();
        this.clockEl?.setText(
            now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        );
        if (this.timerEl) {
            const secs = this.started
                ? Math.floor((Date.now() - this.started) / 1000)
                : 0;
            const mm = String(Math.floor(secs / 60)).padStart(2, "0");
            const ss = String(secs % 60).padStart(2, "0");
            this.timerEl.setText(`${mm}:${ss}`);
        }
    }
}
