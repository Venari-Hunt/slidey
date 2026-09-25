export interface EmbeddedSlideParameters {
    slide: string;
    page?: number;
}

export interface QueryString {
    embed: boolean;
    export: boolean;
}

export interface SlidesExtendedSettings {
    port: string;
    host: string;
    autoReload: boolean;
    autoStart: boolean;
    exportDirectory: string;
    enableOverview: boolean;
    enableChalkboard: boolean;
    enableMenu: boolean;
    enablePointer: boolean;
    enableTimeBar: boolean;
    theme: string;
    highlightTheme: string;
    transition: string;
    transitionSpeed: string;
    controls: boolean;
    progress: boolean;
    slideNumber: boolean;
    showGrid: boolean;
    autoComplete: string;
    slashMenu: boolean;
    fitText: boolean;
    paneMode: "split" | "tab" | "sidebar";
    assetsDirectory: string;
    center: boolean;
    mathEngine: "katex" | "mathjax";
    scripts: string;
    remoteScripts: string;
    separator: string;
    verticalSeparator: string;
    presets: import("../presets").SlidePreset[];
    styles: import("../presets").SlideStyle[];
    /** Preset per heading level (index 0 = `#`) for `slides: headings`. */
    headingPresets: string[];
    /** Layout per heading level (index 0 = `#`). */
    headingLayouts: string[];
    /** Style per heading level (index 0 = `#`). */
    headingStyles: string[];
}

export type ChartJsOptions = {
    elements?: unknown;
    plugins?: unknown;
    scales?: unknown;
};

export interface Processor {
    process: (markdown: string, options?: Options) => string;
}

export type Options = {
    bg: string;
    center: boolean;
    css: string | string[];
    defaultTemplate: string;
    enableLinks: boolean;
    height: number;
    highlightTheme: string;
    log: boolean;
    margin: number;
    notesSeparator: string;
    remoteCSS: string | string[];
    scripts: string | string[];
    remoteScripts: string | string[];
    separator: string;
    showGrid: boolean;
    template: string;
    theme: string;
    timeForPresentation: number;
    title: string;
    verticalSeparator: string;
    width: number;
    enableCustomControls: boolean;
    transition: string;
    mathEngine: "katex" | "mathjax";
    /** Deck-wide default preset (note frontmatter `preset:`). */
    preset?: string;
    /** Preset definitions, from plugin settings. */
    presets?: import("../presets").SlidePreset[];
    /** Deck-wide default style (note frontmatter `style:`). */
    style?: string;
    /** Style definitions, from plugin settings. */
    styles?: import("../presets").SlideStyle[];
    /** Deck-wide default layout (note frontmatter `layout:`). */
    layout?: string;
    /** How the note is cut into slides (note frontmatter `slides:`). */
    slides?: string;
    /** Shrink text that overflows a slide (setting; note frontmatter `fitText:`). */
    fitText?: boolean;
    /** Preset per heading level, from plugin settings. */
    headingPresets?: string[];
    /** Layout per heading level, from plugin settings. */
    headingLayouts?: string[];
    /** Style per heading level, from plugin settings. */
    headingStyles?: string[];
    [key: string]: unknown;
};

export interface MediaCollector {
    shouldCollect(): boolean;

    addMedia(value: string): void;

    getAll(): string[];
}

export type Alignment = string | undefined;
