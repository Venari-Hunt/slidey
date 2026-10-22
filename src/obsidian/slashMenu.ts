import type { Lang } from "../domain/strings";
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
    /**
     * Shows this note in the preview. Not the `open-preview` command: that
     * one toggles, so it would close a preview that is already open.
     */
    showPreview?: boolean;
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

// reveal.js's built-in slide transitions.
const TRANSITIONS = ["fade", "slide", "zoom", "convex", "concave", "none"];

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
    ...TRANSITIONS.map((name) => ({
        title: `Transition: ${name}`,
        hint: marker(`transition=${name}`),
        keywords: `transition animation effect ${name}`,
        insert: marker(`transition=${name}`),
    })),
    {
        title: "Bullets one per click",
        hint: marker("step"),
        keywords: "step bullets list fragment click appear one by one",
        insert: marker("step"),
    },
    ...[
        ["top", "Top"],
        ["bot", "Bottom"],
        ["left", "Left"],
        ["right", "Right"],
        ["center", "Center"],
    ].map(([value, label]) => ({
        title: `Picture focus: ${label}`,
        hint: marker(`focus=${value}`),
        keywords: `focus crop picture image position ${value} ${label}`,
        insert: marker(`focus=${value}`),
    })),
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
        hint: "Shows this note's slides",
        keywords: "preview show",
        showPreview: true,
    },
    {
        title: "Slide overview",
        hint: "Small pictures of every slide",
        keywords: "overview thumbnails grid all slides",
        command: "slidey:show-slide-overview",
    },
    {
        title: "Present full screen",
        hint: "Runs a command",
        keywords: "present start fullscreen",
        command: "slidey:present-active-presentation",
    },
    {
        title: "Present with speaker view",
        hint: "Notes + next slide here, slides on the projector",
        keywords: "present speaker notes two screens projector timer",
        command: "slidey:present-with-speaker-view",
    },
    {
        title: "Export as PowerPoint",
        hint: "Runs a command",
        keywords: "export pptx powerpoint slides save",
        command: "slidey:export-active-presentation-pptx",
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

// pt-BR for the menu's plain-English titles and hints, keyed by the English
// text. Syntax hints (`%% bg=... %%`) are code and stay as they are.
const PT: Record<string, string> = {
    "New slide": "Novo slide",
    "New slide below (vertical)": "Novo slide abaixo (vertical)",
    "Leave this section out": "Deixar esta seção de fora",
    "End slide": "Fim do slide",
    "Background picture": "Imagem de fundo",
    "Background picture, darkened": "Imagem de fundo, escurecida",
    "Background picture, whole picture": "Imagem de fundo, imagem inteira",
    "Background color": "Cor de fundo",
    "Speaker notes": "Notas do apresentador",
    "Text color": "Cor do texto",
    "Accent color": "Cor de destaque",
    Font: "Fonte",
    "Text size": "Tamanho do texto",
    "Bullets one per click": "Um item por clique",
    "Show step by step": "Mostrar passo a passo",
    "Open slide preview": "Abrir a prévia dos slides",
    "Shows this note's slides": "Mostra os slides desta nota",
    "Slide overview": "Visão geral dos slides",
    "Small pictures of every slide": "Miniaturas de todos os slides",
    "Present full screen": "Apresentar em tela cheia",
    "Runs a command": "Executa um comando",
    "Present with speaker view": "Apresentar com a visão do apresentador",
    "Notes + next slide here, slides on the projector":
        "Notas e próximo slide aqui, slides no projetor",
    "Export as PowerPoint": "Exportar como PowerPoint",
    "Export as PDF": "Exportar como PDF",
    "Make this note slides: every heading is a slide":
        "Transformar a nota em slides: cada título é um slide",
    "Make this note slides: --- separates slides":
        "Transformar a nota em slides: --- separa os slides",
    "Make this note slides: only marked blocks":
        "Transformar a nota em slides: só blocos marcados",
    Layout: "Layout",
    Style: "Estilo",
    Preset: "Predefinição",
    Transition: "Transição",
    "Picture focus": "Foco da imagem",
    Top: "Topo",
    Bottom: "Base",
    Left: "Esquerda",
    Right: "Direita",
    Center: "Centro",
};

/** The text in `lang`; "Kind: name" titles translate the kind and the word. */
export function localText(text: string, lang: Lang): string {
    if (lang === "en") {
        return text;
    }
    if (PT[text]) {
        return PT[text];
    }
    const split = /^([^:]+): (.*)$/.exec(text);
    if (split && PT[split[1]]) {
        return `${PT[split[1]]}: ${PT[split[2]] ?? split[2]}`;
    }
    return text;
}

function startsWith(item: SlashItem, first: string, lang: Lang): boolean {
    return (
        normalize(item.title).startsWith(first) ||
        normalize(localText(item.title, lang)).startsWith(first)
    );
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
    lang: Lang = "en",
): SlashItem[] {
    const words = normalize(query).split(" ").filter(Boolean);
    if (!words.length) {
        return items;
    }
    const matches = items.filter((item) => {
        const haystack = ` ${normalize(
            `${item.title} ${localText(item.title, lang)} ${item.keywords ?? ""}`,
        )}`;
        return words.every((word) => haystack.includes(` ${word}`));
    });
    const first = normalize(query).trim();
    return [
        ...matches.filter((item) => startsWith(item, first, lang)),
        ...matches.filter((item) => !startsWith(item, first, lang)),
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
