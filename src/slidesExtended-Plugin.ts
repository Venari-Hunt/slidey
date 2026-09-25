import {
    addIcon,
    type EditorSuggest,
    Notice,
    Plugin,
    type TAbstractFile,
} from "obsidian";
import type { SlidesExtendedSettings } from "./@types";
import { electron, type WindowRemote } from "./electron";
import { EmbeddedSlideProcessor } from "./obsidian/embeddedSlideProcessor";
import { ObsidianUtils } from "./obsidian/obsidianUtils";
import { presetGutter, refreshPresetGutters } from "./obsidian/presetGutter";
import { AutoCompleteSuggest } from "./obsidian/suggesters/AutoCompleteSuggester";
import { LineSelectionListener } from "./obsidian/suggesters/lineSelectionListener";
import { PictureSuggest } from "./obsidian/suggesters/PictureSuggester";
import { SlashMenuSuggest } from "./obsidian/suggesters/SlashMenuSuggester";
import { upgradeStarterPresets } from "./presets";
import { closeLeftoverExportWindows } from "./reveal/pdfExporter";
import {
    REVEAL_PREVIEW_VIEW,
    RevealPreviewView,
} from "./reveal/revealPreviewView";
import { RevealServer } from "./reveal/revealServer";
import {
    SLIDE_OVERVIEW_VIEW,
    SlideOverviewView,
} from "./reveal/slideOverviewView";
import {
    AUDIENCE_VIEW,
    AudienceView,
    SPEAKER_VIEW,
    SpeakerView,
} from "./reveal/speakerView";
import {
    DEFAULT_SETTINGS,
    ICON_DATA,
    REFRESH_ICON,
} from "./slidesExtended-constants";
import { SlidesExtendedDistribution } from "./slidesExtended-Distribution";
import { SlidesExtendedSettingTab } from "./slidesExtended-SettingTab";

export class SlidesExtendedPlugin extends Plugin {
    settings: SlidesExtendedSettings;
    obsidianUtils: ObsidianUtils;

    revealServer: RevealServer;
    private autoCompleteSuggester: AutoCompleteSuggest;
    private target: TAbstractFile;
    private slideProcessor: EmbeddedSlideProcessor;
    private port: number;
    private host: string;
    private serverUrl: URL;

    async onload() {
        await this.loadSettings();
        closeLeftoverExportWindows();

        addIcon("slides", ICON_DATA);
        addIcon("refresh", REFRESH_ICON);

        const numPort = Number(this.settings.port);
        this.port = Number.isNaN(numPort) ? 3000 : numPort;
        this.host = this.settings.host || "localhost";
        this.serverUrl = new URL(`http://${this.host}:${this.port}`);

        this.obsidianUtils = new ObsidianUtils(this.app, this.settings);

        this.registerView(
            REVEAL_PREVIEW_VIEW,
            (leaf) =>
                new RevealPreviewView(leaf, this.url, this, this.settings, () =>
                    this.hideView(),
                ),
        );
        this.registerEvent(
            this.app.vault.on("modify", (file) => this.onChange(file)),
        );
        this.registerEditorSuggest(new LineSelectionListener(this.app, this));
        this.registerView(
            AUDIENCE_VIEW,
            (leaf) => new AudienceView(leaf, this),
        );
        this.registerView(SPEAKER_VIEW, (leaf) => new SpeakerView(leaf, this));
        // S in a deck (reveal's own speaker view can't open in Obsidian).
        this.registerDomEvent(window, "message", (ev: MessageEvent) => {
            if (String(ev.data) === '{"slidey":"open-speaker-view"}') {
                void this.presentWithSpeakerView();
            }
        });
        this.registerView(
            SLIDE_OVERVIEW_VIEW,
            (leaf) => new SlideOverviewView(leaf, this),
        );
        this.registerEditorExtension(presetGutter(() => this.settings));

        this.addRibbonIcon("slides", "Show slide preview", async () => {
            await this.showView();
        });

        this.addCommand({
            id: "open-preview",
            name: "Show slide preview",
            callback: async () => this.toggleView(),
        });
        this.addCommand({
            id: "reload-preview",
            name: "Reload slide preview",
            callback: () => {
                const instance = this.getViewInstance();
                if (!instance) {
                    return;
                }
                instance.onChange();
            },
        });
        this.addCommand({
            id: "present-with-speaker-view",
            name: "Present with speaker view (two screens)",
            callback: async () => this.presentWithSpeakerView(),
        });
        this.addCommand({
            id: "show-slide-overview",
            name: "Show slide overview",
            callback: async () => this.showOverview(),
        });
        this.addCommand({
            id: "present-active-presentation",
            name: "Present slides (fullscreen)",
            callback: async () => {
                await this.showView();
                const instance = this.getViewInstance();
                await instance?.presentMode();
            },
        });
        this.addCommand({
            id: "print-active-presentation",
            name: "Print active presentation",
            callback: async () => {
                await this.showView();
                const instance = this.getViewInstance();
                if (!instance) {
                    return;
                }
                instance.printPresentation();
            },
        });
        this.addCommand({
            id: "export-active-presentation-pdf",
            name: "Export active presentation as PDF",
            callback: async () => {
                await this.showView();
                await this.getViewInstance()?.exportAsPdf();
            },
        });
        this.addCommand({
            id: "export-active-presentation-pptx",
            name: "Export active presentation as PowerPoint (.pptx)",
            callback: async () => {
                await this.showView();
                await this.getViewInstance()?.exportAsPptx();
            },
        });
        this.addCommand({
            id: "export-active-presentation-html",
            name: "Export active presentation as HTML",
            callback: async () => {
                await this.showView();
                const instance = this.getViewInstance();
                if (!instance) {
                    return;
                }
                instance.exportAsHtml();
            },
        });
        this.addCommand({
            id: "stop-server-preview",
            name: "Stop slide preview server",
            callback: async () => this.revealServer.stop(),
        });
        this.addCommand({
            id: "start-server-preview",
            name: "Start slide preview server",
            callback: async () => this.revealServer.start(),
        });

        this.addSettingTab(new SlidesExtendedSettingTab(this.app, this));
        this.app.workspace.onLayoutReady(() => {
            void this.layoutReady();
        });

        this.slideProcessor = new EmbeddedSlideProcessor(this);
        this.registerMarkdownCodeBlockProcessor(
            "slide",
            this.slideProcessor.handler,
        );
        this.registerMarkdownPostProcessor(
            this.obsidianUtils.markdownProcessor.postProcess,
        );
    }

    get url(): URL {
        return this.serverUrl;
    }

    layoutReady = async () => {
        const version = this.manifest.version;
        const distribution = new SlidesExtendedDistribution(this);

        console.debug(
            "Slidey v%s, needsReload=%s",
            version,
            distribution.isOutdated(),
        );
        if (distribution.isOutdated()) {
            try {
                await distribution.update();
                console.debug("Slidey updated to v%s", version);
            } catch (err) {
                console.error(
                    "Slidey failed to update distribution files",
                    err,
                );
                if (distribution.isPresent()) {
                    new Notice(
                        "Slidey: failed to update to the latest version. " +
                            "Try reinstalling the plugin to fix this (export your settings from the plugin's settings tab first).",
                        0,
                    );
                } else {
                    new Notice(
                        "Slidey: failed to install distribution files. The preview server can't start. " +
                            "Try reinstalling the plugin (export your settings from the plugin's settings tab first).",
                        0,
                    );
                    return;
                }
            }
        }

        try {
            this.configureServer();
            await this.initServer();
        } catch (err) {
            console.error("Slidey failed to start the preview server,", err);
        }

        this.autoCompleteSuggester = new AutoCompleteSuggest(this.app);

        if (this.settings.autoComplete !== "never") {
            this.autoCompleteSuggester.activate();
        }
        this.registerEditorSuggest(this.autoCompleteSuggester);
        this.registerSlashMenu();
    };

    // Obsidian asks each editor menu in turn and the first to answer wins, so
    // Slidey's menus go to the front; they step aside when nothing matches.
    private registerSlashMenu() {
        this.registerFirst(new PictureSuggest(this.app));
        this.registerFirst(
            new SlashMenuSuggest(
                this.app,
                () => this.settings,
                () => this.showView(),
            ),
        );
    }

    private registerFirst(suggest: EditorSuggest<unknown>) {
        this.registerEditorSuggest(suggest);
        const suggests = (
            this.app.workspace as unknown as {
                editorSuggest?: { suggests?: unknown[] };
            }
        ).editorSuggest?.suggests;
        if (Array.isArray(suggests) && suggests.includes(suggest)) {
            suggests.splice(suggests.indexOf(suggest), 1);
            suggests.unshift(suggest);
        }
    }

    /** Opens the slide overview panel in the right sidebar (or reveals it). */
    async showOverview() {
        let leaf = this.app.workspace.getLeavesOfType(SLIDE_OVERVIEW_VIEW)[0];
        if (!leaf) {
            leaf = this.app.workspace.getRightLeaf(false);
            await leaf?.setViewState({
                type: SLIDE_OVERVIEW_VIEW,
                active: true,
            });
        }
        if (leaf) {
            void this.app.workspace.revealLeaf(leaf);
        }
    }

    getAudienceView(): AudienceView | null {
        const view = this.app.workspace.getLeavesOfType(AUDIENCE_VIEW)[0]?.view;
        return view instanceof AudienceView ? view : null;
    }

    getSpeakerView(): SpeakerView | null {
        const view = this.app.workspace.getLeavesOfType(SPEAKER_VIEW)[0]?.view;
        return view instanceof SpeakerView ? view : null;
    }

    /**
     * Speaker view in this window, the slides in a new window. With a second
     * screen, the slides window moves there and goes full screen.
     */
    async presentWithSpeakerView() {
        const file =
            this.getSpeakerView()?.file ?? this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") {
            new Notice("Open a slide note first.");
            return;
        }
        this.endSpeakerPresentation();

        const speakerLeaf = this.app.workspace.getLeaf("tab");
        await speakerLeaf.setViewState({ type: SPEAKER_VIEW, active: true });
        (speakerLeaf.view as SpeakerView).show(file);

        const remote = electron<{ remote?: WindowRemote }>().remote;
        const before = new Set(
            remote?.BrowserWindow.getAllWindows().map((w) => w.id) ?? [],
        );
        const audienceLeaf = this.app.workspace.openPopoutLeaf({
            size: { width: 960, height: 560 },
        });
        await audienceLeaf.setViewState({ type: AUDIENCE_VIEW, active: true });
        (audienceLeaf.view as AudienceView).show(file);

        const moved = remote ? this.moveToSecondScreen(remote, before) : false;
        if (!moved) {
            new Notice(
                "Only one screen found: the slides opened in a separate window. Drag it to the projector.",
                8000,
            );
        }
        this.app.workspace.setActiveLeaf(speakerLeaf, { focus: true });
        (speakerLeaf.view as SpeakerView).contentEl.focus();
    }

    private moveToSecondScreen(
        remote: WindowRemote,
        before: Set<number>,
    ): boolean {
        const popout = remote.BrowserWindow.getAllWindows().find(
            (w) => !before.has(w.id),
        );
        const main = remote.getCurrentWindow();
        const here = remote.screen.getDisplayMatching(main.getBounds()).id;
        const other = remote.screen
            .getAllDisplays()
            .find((display) => display.id !== here);
        if (!popout || !other) {
            return false;
        }
        popout.setBounds(other.bounds);
        popout.setFullScreen(true);
        return true;
    }

    /** Closes the slides window and the speaker view. */
    endSpeakerPresentation() {
        this.app.workspace.detachLeavesOfType(AUDIENCE_VIEW);
        this.app.workspace.detachLeavesOfType(SPEAKER_VIEW);
    }

    getOverviewInstance(): SlideOverviewView | null {
        const view =
            this.app.workspace.getLeavesOfType(SLIDE_OVERVIEW_VIEW)[0]?.view;
        return view instanceof SlideOverviewView ? view : null;
    }

    getViewInstance(): RevealPreviewView | null {
        for (const leaf of this.app.workspace.getLeavesOfType(
            REVEAL_PREVIEW_VIEW,
        )) {
            const view = leaf.view;
            if (view instanceof RevealPreviewView) {
                return view;
            }
        }
        return null;
    }

    getTargetName(): string {
        return this.target ? this.target.name : "";
    }

    onChange(file: TAbstractFile) {
        if (!this.settings.autoReload) {
            return;
        }
        const instance = this.getViewInstance();
        if (!instance) {
            return;
        }
        if (file === this.target) {
            instance.onChange();
        }
    }

    async toggleView() {
        const instance = this.getViewInstance();
        if (instance) {
            this.app.workspace.detachLeavesOfType(REVEAL_PREVIEW_VIEW);
            if (this.settings.autoComplete === "inPreview") {
                this.autoCompleteSuggester.deactivate();
            }
        } else {
            if (this.settings.autoComplete !== "never") {
                this.autoCompleteSuggester.activate();
            }
            await this.showView();
        }
    }

    hideView() {
        if (this.settings.autoComplete === "inPreview") {
            this.autoCompleteSuggester?.deactivate();
        }
    }

    async showView() {
        const targetDocument = this.app.workspace.getActiveFile();
        if (!targetDocument) {
            return;
        }
        if (
            targetDocument === this.target &&
            this.app.workspace.getLeavesOfType(REVEAL_PREVIEW_VIEW).length > 0
        ) {
            return;
        }
        this.target = targetDocument;
        await this.activateView();

        const url = this.revealServer.getTargetUrl(this.target);
        await this.openUrl(url);
    }

    configureServer = () => {
        this.revealServer = new RevealServer(
            this.obsidianUtils,
            this.port,
            this.host,
            this.url,
        );
    };

    initServer = async () => {
        if (this.settings.autoStart) {
            await this.revealServer.start();
        }

        const instance = this.getViewInstance();
        if (instance) {
            if (instance.url === "about:blank") {
                await this.showView();
            }
        }
    };

    stopServer = async () => {
        if (this.revealServer) {
            await this.revealServer.stop();
        }
        const instance = this.getViewInstance();
        if (instance) {
            await instance.onClose();
        }
    };

    private async openUrl(url: URL) {
        const instance = this.getViewInstance();
        instance?.setUrl(url.toString());
    }

    async activateView() {
        this.app.workspace.detachLeavesOfType(REVEAL_PREVIEW_VIEW);
        if (this.settings.paneMode === "sidebar") {
            await this.app.workspace.getRightLeaf(true)?.setViewState({
                type: REVEAL_PREVIEW_VIEW,
                active: true,
            });
        } else {
            await this.app.workspace
                .getLeaf(this.settings.paneMode)
                .setViewState({
                    type: REVEAL_PREVIEW_VIEW,
                    active: false,
                });
        }
        void this.app.workspace.revealLeaf(
            this.app.workspace.getLeavesOfType(REVEAL_PREVIEW_VIEW)[0],
        );
    }

    onunload() {
        console.debug("unloading Slidey");
        closeLeftoverExportWindows();
        // A full-screen slides window must not outlive the plugin.
        this.endSpeakerPresentation();
        void this.stopServer();
    }

    async loadSettings() {
        const data = (await this.loadData()) as Partial<
            SlidesExtendedSettings & { themeDirectory?: string }
        > | null;
        this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
        // Migrate renamed setting
        if (data?.themeDirectory && !data?.assetsDirectory) {
            this.settings.assetsDirectory = data.themeDirectory;
        }
        const upgraded = upgradeStarterPresets(this.settings.presets);
        if (upgraded.length > 0) {
            await this.saveData(this.settings);
            new Notice(
                `Slidey: updated the unedited starter preset(s) ${upgraded.join(", ")} to the latest layout.`,
                8000,
            );
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
        console.debug("Slidey: settings saved");
        refreshPresetGutters(this.app.workspace);

        await this.stopServer();

        const numPort = Number(this.settings.port);
        this.port = Number.isNaN(numPort) ? 3000 : numPort;
        this.host = this.settings.host || "localhost";
        this.serverUrl = new URL(`http://${this.host}:${this.port}`);

        this.obsidianUtils = new ObsidianUtils(this.app, this.settings);
        this.configureServer();
        await this.initServer();
        const instance = this.getViewInstance();
        if (instance) {
            instance.onChange();
        }
    }

    async update(newSettings: SlidesExtendedSettings) {
        this.settings = newSettings;
        await this.saveSettings();
    }
}
