import {
    type EditorState,
    type Extension,
    RangeSet,
    StateEffect,
    StateField,
} from "@codemirror/state";
import {
    Decoration,
    type DecorationSet,
    EditorView,
    GutterMarker,
    gutter,
    WidgetType,
} from "@codemirror/view";
import { getFrontMatterInfo, parseYaml, type Workspace } from "obsidian";
import type { Options, SlidesExtendedSettings } from "../@types";
import { headingOutline, slidesMode } from "./slidesMode";

// Editor marks for `slides: headings` notes, so the slide each heading becomes
// is visible while writing: a dot in the gutter beside every heading, in its
// preset's color, and a pill with the preset name at the end of the heading
// line. Hover shows the full label.

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

type MarkKind = "preset" | "none" | "unknown" | "skip";

/** What one heading resolves to; drawn as both a dot and a pill. */
export interface HeadingMark {
    kind: MarkKind;
    /** Short text for the pill. */
    text: string;
    /** Full text for hover. */
    label: string;
    color: string;
}

function sameMark(a: HeadingMark, b: HeadingMark): boolean {
    return (
        a.kind === b.kind &&
        a.text === b.text &&
        a.label === b.label &&
        a.color === b.color
    );
}

function markElement(className: string, mark: HeadingMark): HTMLElement {
    const el = document.createElement("span");
    el.className = `${className} ${className}-${mark.kind}`;
    el.setAttribute("aria-label", mark.label);
    el.title = mark.label;
    if (mark.color) {
        el.style.setProperty("--slidey-dot-color", mark.color);
    }
    return el;
}

class PresetDot extends GutterMarker {
    constructor(readonly mark: HeadingMark) {
        super();
    }

    eq(other: PresetDot): boolean {
        return sameMark(other.mark, this.mark);
    }

    toDOM(): Node {
        return markElement("slidey-preset-dot", this.mark);
    }
}

class PresetPill extends WidgetType {
    constructor(readonly mark: HeadingMark) {
        super();
    }

    eq(other: PresetPill): boolean {
        return sameMark(other.mark, this.mark);
    }

    toDOM(): HTMLElement {
        const pill = markElement("slidey-preset-pill", this.mark);
        pill.textContent = this.mark.text;
        return pill;
    }
}

interface HeadingMarks {
    dots: RangeSet<PresetDot>;
    pills: DecorationSet;
}

const NO_MARKS: HeadingMarks = { dots: RangeSet.empty, pills: Decoration.none };

/** Dispatched to every editor when settings change, so marks recolor. */
const refreshMarks = StateEffect.define<null>();

function buildMarks(
    state: EditorState,
    settings: SlidesExtendedSettings,
): HeadingMarks {
    const text = state.doc.toString();
    const info = getFrontMatterInfo(text);
    if (!info.exists) {
        return NO_MARKS;
    }
    let frontmatter: Record<string, unknown>;
    try {
        frontmatter = parseYaml(info.frontmatter) ?? {};
    } catch {
        return NO_MARKS;
    }
    if (slidesMode(frontmatter as Partial<Options>) !== "headings") {
        return NO_MARKS;
    }

    const deckPreset =
        typeof frontmatter.preset === "string" ? frontmatter.preset.trim() : "";
    const presets = (settings.presets ?? []).map((preset) => preset?.name);
    const lineOffset = state.doc.lineAt(info.contentStart).number - 1;
    const levels = Array.isArray(settings.headingPresets)
        ? settings.headingPresets
        : [];

    const dots = [];
    const pills = [];
    const outline = headingOutline(text.substring(info.contentStart), levels);
    for (const heading of outline) {
        const line = state.doc.line(heading.line + lineOffset + 1);
        const mark = markFor(
            heading.skip,
            heading.preset || deckPreset,
            presets,
        );
        dots.push(new PresetDot(mark).range(line.from));
        pills.push(
            Decoration.widget({ widget: new PresetPill(mark), side: 1 }).range(
                line.to,
            ),
        );
    }
    return { dots: RangeSet.of(dots), pills: Decoration.set(pills) };
}

export function markFor(
    skip: boolean,
    name: string,
    presets: (string | undefined)[],
): HeadingMark {
    if (skip) {
        return {
            kind: "skip",
            text: "not a slide",
            label: "Not a slide (%% noslide %%)",
            color: "",
        };
    }
    if (!name || name.toLowerCase() === "none") {
        return {
            kind: "none",
            text: "no preset",
            label: "Slide · no preset",
            color: "",
        };
    }
    const index = presets.indexOf(name);
    if (index < 0) {
        return {
            kind: "unknown",
            text: `${name}?`,
            label: `Slide · unknown preset "${name}"`,
            color: "",
        };
    }
    return {
        kind: "preset",
        text: name,
        label: `Slide · preset: ${name}`,
        color: presetDotColor(index),
    };
}

export function presetGutter(
    getSettings: () => SlidesExtendedSettings,
): Extension {
    const marks = StateField.define<HeadingMarks>({
        create: (state) => buildMarks(state, getSettings()),
        update: (value, tr) =>
            tr.docChanged || tr.effects.some((e) => e.is(refreshMarks))
                ? buildMarks(tr.state, getSettings())
                : value,
        provide: (field) =>
            EditorView.decorations.from(field, (value) => value.pills),
    });
    return [
        marks,
        gutter({
            class: "slidey-preset-gutter",
            markers: (view) => view.state.field(marks).dots,
        }),
    ];
}

/** Recolors the dots and pills in every open editor (after a settings change). */
export function refreshPresetGutters(workspace: Workspace): void {
    workspace.iterateAllLeaves((leaf) => {
        const editor = (leaf.view as { editor?: { cm?: EditorView } }).editor;
        editor?.cm?.dispatch({ effects: refreshMarks.of(null) });
    });
}
