import { LAYOUTS } from "../presets";
import { type SlidesMode, slidesMode } from "./slidesMode";

// The `/` menu: typing `/` in a deck note lists what can go on a slide.
// Pure (no Obsidian imports) so it can be unit tested; the editor side is
// `suggesters/SlashMenuSuggester.ts`.

/** Where the cursor lands in `insert`. */
export const CURSOR = "{|}";

export interface SlashItem {
    title: string;
    /** Short grey text: what gets typed into the note, or what happens. */
    hint: string;
    /** Extra words the filter matches, besides the title. */
    keywords?: string;
    /** Replaces `/query`; `CURSOR` marks where the cursor goes. */
    insert?: string;
    /** Obsidian command id to run instead of inserting text. */
    command?: string;
    /** Sets the note's `slides:` frontmatter (non-deck notes only). */
    makeDeck?: SlidesMode;
}

// Frontmatter keys that mark a plain `---` note as a deck (same rule as the
// editor dots in presetGutter.ts).
const DECK_KEYS = ["slides", "layout", "style", "preset", "theme"];

/** The note's slide mode, or null when the note isn't a deck. */
export function deckMode(
    frontmatter: Record<string, unknown> | null | undefined,
): SlidesMode | null {
    if (!frontmatter || !DECK_KEYS.some((key) => key in frontmatter)) {
        return null;
    }
    return slidesMode(frontmatter);
}

function marker(body: string): string {
    return `%% ${body} %%`;
}

function newSlideItems(mode: SlidesMode): SlashItem[] {
    if (mode === "headings") {
        return [
            {
                title: "New slide",
                hint: "## heading",
                keywords: "heading section",
                insert: `## ${CURSOR}`,
            },
            {
                title: "Leave this section out",
                hint: marker("noslide"),
                keywords: "noslide skip hide",
                insert: marker("noslide"),
            },
        ];
    }
    if (mode === "blocks") {
        return [
            {
                title: "New slide",
                hint: `${marker("slide")} … ${marker("endslide")}`,
                keywords: "block region",
                insert: `${marker("slide")}\n${CURSOR}\n${marker("endslide")}`,
            },
            {
                title: "End slide",
                hint: marker("endslide"),
                keywords: "close stop",
                insert: marker("endslide"),
            },
        ];
    }
    return [
        {
            title: "New slide",
            hint: "---",
            keywords: "separator",
            insert: `---\n${CURSOR}`,
        },
        {
            title: "New slide below (vertical)",
            hint: "--",
            keywords: "vertical down stack",
            insert: `--\n${CURSOR}`,
        },
    ];
}

function lookItems(
    kind: "layout" | "style" | "preset",
    looks: { name?: string; label?: string }[] | undefined,
): SlashItem[] {
    const title = kind[0].toUpperCase() + kind.slice(1);
    return (looks ?? [])
        .filter((look) => look?.name)
        .map((look) => ({
            title: `${title}: ${look.label || look.name}`,
            hint: marker(`${kind}=${look.name}`),
            keywords: `${kind} ${look.name}`,
            insert: marker(`${kind}=${look.name}`),
        }));
}

const SLIDE_ITEMS: SlashItem[] = [
    {
        title: "Background picture",
        hint: marker("bg=photo.jpg"),
        keywords: "image background bg",
        insert: marker(`bg=${CURSOR}`),
    },
    {
        title: "Background picture, darkened",
        hint: marker("bg=photo.jpg dim=40%"),
        keywords: "image background bg dim dark",
        insert: marker(`bg=${CURSOR} dim=40%`),
    },
    {
        title: "Background picture, whole picture",
        hint: marker("bg=photo.jpg fit=contain"),
        keywords: "image background bg fit contain",
        insert: marker(`bg=${CURSOR} fit=contain`),
    },
    {
        title: "Background color",
        hint: marker("bg=#224466"),
        keywords: "background bg colour",
        insert: marker(`bg=#${CURSOR}`),
    },
    {
        title: "Speaker notes",
        hint: marker("notes"),
        keywords: "notes presenter speaker",
        insert: `${marker("notes")}\n${CURSOR}`,
    },
    {
        title: "Text color",
        hint: marker("color=#eeeeee"),
        keywords: "colour text",
        insert: marker(`color=${CURSOR}`),
    },
    {
        title: "Accent color",
        hint: marker("accent=red"),
        keywords: "colour accent link",
        insert: marker(`accent=${CURSOR}`),
    },
    {
        title: "Font",
        hint: marker('font="Open Sans"'),
        keywords: "font typeface",
        insert: marker(`font="${CURSOR}"`),
    },
    {
        title: "Text size",
        hint: marker("size=1.4"),
        keywords: "size bigger smaller scale",
        insert: marker(`size=${CURSOR}`),
    },
    {
        title: "Show step by step",
        hint: '<!-- element class="fragment" -->',
        keywords: "fragment step appear reveal",
        insert: '<!-- element class="fragment" -->',
    },
];

const ACTION_ITEMS: SlashItem[] = [
    {
        title: "Open slide preview",
        hint: "Runs a command",
        keywords: "preview show",
        command: "slidey:open-preview",
    },
    {
        title: "Present full screen",
        hint: "Runs a command",
        keywords: "present start fullscreen",
        command: "slidey:present-active-presentation",
    },
    {
        title: "Export as PDF",
        hint: "Runs a command",
        keywords: "export pdf save",
        command: "slidey:export-active-presentation-pdf",
    },
];

const MAKE_DECK_ITEMS: SlashItem[] = [
    {
        title: "Make this note slides: every heading is a slide",
        hint: "slides: headings",
        keywords: "slides deck slidey headings",
        makeDeck: "headings",
    },
    {
        title: "Make this note slides: --- separates slides",
        hint: "slides: separators",
        keywords: "slides deck slidey separators",
        makeDeck: "separators",
    },
    {
        title: "Make this note slides: only marked blocks",
        hint: "slides: blocks",
        keywords: "slides deck slidey blocks",
        makeDeck: "blocks",
    },
];

/** Every item the menu can show for a note in `mode` (null = not a deck). */
export function slashItems(
    mode: SlidesMode | null,
    looks: {
        styles?: { name?: string; label?: string }[];
        presets?: { name?: string; label?: string }[];
    },
): SlashItem[] {
    if (!mode) {
        return MAKE_DECK_ITEMS;
    }
    return [
        ...newSlideItems(mode),
        ...lookItems("layout", LAYOUTS),
        ...lookItems("style", looks.styles),
        ...SLIDE_ITEMS,
        ...lookItems("preset", looks.presets),
        ...ACTION_ITEMS,
    ];
}

function normalize(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

/**
 * Items whose title or keywords contain every word of `query` (hyphens count
 * as spaces). Titles that start with the query come first.
 */
export function filterSlashItems(
    items: SlashItem[],
    query: string,
): SlashItem[] {
    const words = normalize(query).split(" ").filter(Boolean);
    if (!words.length) {
        return items;
    }
    const matches = items.filter((item) => {
        const haystack = ` ${normalize(`${item.title} ${item.keywords ?? ""}`)}`;
        return words.every((word) => haystack.includes(` ${word}`));
    });
    const first = normalize(query).trim();
    return [
        ...matches.filter((item) => normalize(item.title).startsWith(first)),
        ...matches.filter((item) => !normalize(item.title).startsWith(first)),
    ];
}

/**
 * The `/query` being typed at `ch` on `line`, or null. The `/` must start the
 * line or follow a space, and the query is letters, digits and hyphens.
 */
export function slashQuery(
    line: string,
    ch: number,
): { start: number; query: string } | null {
    const match = /(^|\s)\/([\w-]*)$/.exec(line.slice(0, ch));
    if (!match) {
        return null;
    }
    return { start: ch - match[2].length - 1, query: match[2] };
}

/** True when line `lineNo` sits inside a ``` / ~~~ fenced code block. */
export function inFencedCode(lines: string[], lineNo: number): boolean {
    let fence: string | null = null;
    for (let i = 0; i < lineNo; i++) {
        const open = /^\s*(`{3,}|~{3,})/.exec(lines[i]);
        if (!open) {
            continue;
        }
        if (!fence) {
            fence = open[1];
        } else if (open[1][0] === fence[0] && open[1].length >= fence.length) {
            fence = null;
        }
    }
    return fence !== null;
}
