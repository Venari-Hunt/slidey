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
import type { SlidesExtendedSettings } from "../@types";
import { LAYOUTS } from "../presets";
import {
    blockOutline,
    headingOutline,
    separatorOutline,
    slidesMode,
} from "./slidesMode";

// Editor marks so the slide each heading, `%% slide %%` line or `---` slide
// becomes is visible while writing: a dot in the gutter, in its style's (or
// preset's) color, and a pill naming its layout · style at the end of the
// line. Hover shows the full label.

// One color per style (or preset), by its position in Settings. Also shown
// next to each one there as the legend.
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

const NO_MARKS: HeadingMarks = {
    dots: RangeSet.of<PresetDot>([]),
    pills: Decoration.none,
};

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
        frontmatter =
            (parseYaml(info.frontmatter) as Record<string, unknown> | null) ??
            {};
    } catch {
        return NO_MARKS;
    }
    const mode = slidesMode(frontmatter);
    // A plain `---` note only counts as a deck once its frontmatter says so;
    // otherwise every note with a horizontal rule would get marks.
    if (mode === "separators" && !DECK_KEYS.some((key) => key in frontmatter)) {
        return NO_MARKS;
    }

    const deckLook = (key: string): string =>
        typeof frontmatter[key] === "string" ? frontmatter[key].trim() : "";
    const known: KnownLooks = {
        presets: namesOf(settings.presets),
        layouts: namesOf(LAYOUTS),
        styles: namesOf(settings.styles),
    };
    const lineOffset = state.doc.lineAt(info.contentStart).number - 1;

    const dots = [];
    const pills = [];
    const body = text.substring(info.contentStart);
    const outline =
        mode === "blocks"
            ? blockOutline(body)
            : mode === "headings"
              ? headingOutline(body, stringList(settings.headingPresets), {
                    layouts: stringList(settings.headingLayouts),
                    styles: stringList(settings.headingStyles),
                })
              : separatorOutline(
                    body,
                    deckLook("separator") || settings.separator || undefined,
                    deckLook("verticalSeparator") ||
                        settings.verticalSeparator ||
                        undefined,
                );
    for (const heading of outline) {
        const line = state.doc.line(heading.line + lineOffset + 1);
        const mark = markFor(
            heading.skip,
            {
                preset: heading.preset || deckLook("preset"),
                layout: heading.layout || deckLook("layout"),
                style: heading.style || deckLook("style"),
            },
            known,
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

/** What one slide picks; "" for nothing. */
export interface SlideLook {
    preset: string;
    layout: string;
    style: string;
}

/** Names that exist, in Settings order (the order sets the dot color). */
export interface KnownLooks {
    presets: (string | undefined)[];
    layouts: (string | undefined)[];
    styles: (string | undefined)[];
}

// Shown in this order on the pill: "two-column · night".
const LOOK_KINDS = ["layout", "style", "preset"] as const;

/**
 * The dot + pill for one slide. The pill names its layout · style (· preset);
 * the dot takes the style's color, else the preset's. A misspelled name gets
 * a "?" and a dashed red mark.
 */
export function markFor(
    skip: boolean,
    look: SlideLook,
    known: KnownLooks,
): HeadingMark {
    if (skip) {
        return {
            kind: "skip",
            text: "not a slide",
            label: "Not a slide (%% noslide %%)",
            color: "",
        };
    }
    const picks = LOOK_KINDS.map((kind) => {
        const name = look[kind];
        const index = known[`${kind}s`].indexOf(name);
        return { kind, name, index };
    }).filter(({ name }) => name && name.toLowerCase() !== "none");
    if (!picks.length) {
        return {
            kind: "none",
            text: "plain",
            label: "Slide · no layout, style or preset",
            color: "",
        };
    }
    const unknown = picks.some(({ index }) => index < 0);
    const colorFrom = picks.find(
        ({ kind, index }) => kind !== "layout" && index >= 0,
    );
    return {
        kind: unknown ? "unknown" : "preset",
        text: picks
            .map(({ name, index }) => (index < 0 ? `${name}?` : name))
            .join(" · "),
        label: `Slide · ${picks
            .map(
                ({ kind, name, index }) =>
                    `${kind}: ${name}${index < 0 ? " (unknown)" : ""}`,
            )
            .join(", ")}`,
        color: colorFrom
            ? presetDotColor(colorFrom.index)
            : "var(--text-muted)",
    };
}

// Frontmatter keys that mark a plain `---` note as a deck.
const DECK_KEYS = ["slides", "layout", "style", "preset", "theme"];

function namesOf(looks: { name?: string }[] | undefined): string[] {
    return (looks ?? []).map((look) => look?.name ?? "");
}

function stringList(value: unknown): string[] {
    return Array.isArray(value) ? (value as string[]) : [];
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
