import {
    type EditorState,
    type Extension,
    RangeSet,
    StateEffect,
    StateField,
} from "@codemirror/state";
import { type EditorView, GutterMarker, gutter } from "@codemirror/view";
import { getFrontMatterInfo, parseYaml, type Workspace } from "obsidian";
import type { Options, SlidesExtendedSettings } from "../@types";
import { headingOutline, slidesMode } from "./slidesMode";

// Editor gutter for `slides: headings` notes: a dot beside every heading, in
// its preset's color, so the slide each heading becomes is visible while
// writing. Hover shows the preset name.

// One color per preset, by its position in Settings → Slide presets. Also
// shown next to each preset there as the legend.
const DOT_COLORS = [
    "#4dabf7",
    "#fd7e14",
    "#40c057",
    "#e64980",
    "#7950f2",
    "#12b886",
    "#fab005",
    "#a9e34b",
];

export function presetDotColor(index: number): string {
    return DOT_COLORS[index % DOT_COLORS.length];
}

type DotKind = "preset" | "none" | "unknown" | "skip";

class PresetDot extends GutterMarker {
    constructor(
        readonly kind: DotKind,
        readonly label: string,
        readonly color = "",
    ) {
        super();
    }

    eq(other: PresetDot): boolean {
        return (
            other.kind === this.kind &&
            other.label === this.label &&
            other.color === this.color
        );
    }

    toDOM(): Node {
        const dot = document.createElement("span");
        dot.className = `slidey-preset-dot slidey-preset-dot-${this.kind}`;
        dot.setAttribute("aria-label", this.label);
        dot.title = this.label;
        if (this.color) {
            dot.style.setProperty("--slidey-dot-color", this.color);
        }
        return dot;
    }
}

/** Dispatched to every editor when settings change, so dots recolor. */
const refreshDots = StateEffect.define<null>();

function buildDots(
    state: EditorState,
    settings: SlidesExtendedSettings,
): RangeSet<PresetDot> {
    const text = state.doc.toString();
    const info = getFrontMatterInfo(text);
    if (!info.exists) {
        return RangeSet.empty;
    }
    let frontmatter: Record<string, unknown>;
    try {
        frontmatter = parseYaml(info.frontmatter) ?? {};
    } catch {
        return RangeSet.empty;
    }
    if (slidesMode(frontmatter as Partial<Options>) !== "headings") {
        return RangeSet.empty;
    }

    const deckPreset =
        typeof frontmatter.preset === "string" ? frontmatter.preset.trim() : "";
    const presets = (settings.presets ?? []).map((preset) => preset?.name);
    const lineOffset = state.doc.lineAt(info.contentStart).number - 1;
    const levels = Array.isArray(settings.headingPresets)
        ? settings.headingPresets
        : [];

    const dots = headingOutline(text.substring(info.contentStart), levels).map(
        (heading) => {
            const from = state.doc.line(heading.line + lineOffset + 1).from;
            return dotFor(
                heading.skip,
                heading.preset || deckPreset,
                presets,
            ).range(from);
        },
    );
    return RangeSet.of(dots);
}

function dotFor(
    skip: boolean,
    name: string,
    presets: (string | undefined)[],
): PresetDot {
    if (skip) {
        return new PresetDot("skip", "Not a slide (%% noslide %%)");
    }
    if (!name || name.toLowerCase() === "none") {
        return new PresetDot("none", "Slide · no preset");
    }
    const index = presets.indexOf(name);
    if (index < 0) {
        return new PresetDot("unknown", `Slide · unknown preset "${name}"`);
    }
    return new PresetDot(
        "preset",
        `Slide · preset: ${name}`,
        presetDotColor(index),
    );
}

export function presetGutter(
    getSettings: () => SlidesExtendedSettings,
): Extension {
    const dots = StateField.define<RangeSet<PresetDot>>({
        create: (state) => buildDots(state, getSettings()),
        update: (value, tr) =>
            tr.docChanged || tr.effects.some((e) => e.is(refreshDots))
                ? buildDots(tr.state, getSettings())
                : value,
    });
    return [
        dots,
        gutter({
            class: "slidey-preset-gutter",
            markers: (view) => view.state.field(dots),
        }),
    ];
}

/** Recolors the dots in every open editor (after a settings change). */
export function refreshPresetGutters(workspace: Workspace): void {
    workspace.iterateAllLeaves((leaf) => {
        const editor = (leaf.view as { editor?: { cm?: EditorView } }).editor;
        editor?.cm?.dispatch({ effects: refreshDots.of(null) });
    });
}
