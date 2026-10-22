// One table for the user-facing strings of the newer screens (en + pt-BR).
// The language follows Obsidian's own, "en" when unset.
import { getLanguage } from "obsidian";

export type Lang = "en" | "pt-BR";

const TABLE = {
    en: {
        shortcutsTitle: "Slidey keyboard shortcuts",
        shortcutsCommand: "Show keyboard shortcuts",
        groupMove: "Move",
        groupShow: "Show",
        next: "Next slide or bullet",
        prev: "Previous slide or bullet",
        upDown: "Up / down in a vertical stack",
        blank: "Blank the screen (clicker blank button)",
        overview: "Slide overview",
        fullscreen: "Fullscreen",
        speaker: "Open the speaker view",
        exit: "Leave presenting",
        close: "Close",
    },
    "pt-BR": {
        shortcutsTitle: "Atalhos do Slidey",
        shortcutsCommand: "Mostrar atalhos do teclado",
        groupMove: "Mover",
        groupShow: "Exibir",
        next: "Próximo slide ou item",
        prev: "Slide ou item anterior",
        upDown: "Acima / abaixo numa pilha vertical",
        blank: "Apagar a tela (botão de tela preta do controle)",
        overview: "Visão geral dos slides",
        fullscreen: "Tela cheia",
        speaker: "Abrir a visão do apresentador",
        exit: "Sair da apresentação",
        close: "Fechar",
    },
} as const;

export type StringKey = keyof (typeof TABLE)["en"];

export function pickLang(stored: string | null | undefined): Lang {
    return stored?.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}

export function currentLang(): Lang {
    return pickLang(getLanguage());
}

export function t(key: StringKey, lang: Lang = currentLang()): string {
    return TABLE[lang][key];
}

// [keys, string key] rows, grouped. Matches CLICKER_KEYS and the deck's
// reveal.js defaults (O overview, F fullscreen, S speaker view, Esc).
export const SHORTCUT_GROUPS: ReadonlyArray<{
    title: StringKey;
    rows: ReadonlyArray<{ keys: readonly string[]; label: StringKey }>;
}> = [
    {
        title: "groupMove",
        rows: [
            { keys: ["→", "Space", "PageDown"], label: "next" },
            { keys: ["←", "PageUp"], label: "prev" },
            { keys: ["↑", "↓"], label: "upDown" },
        ],
    },
    {
        title: "groupShow",
        rows: [
            { keys: [".", "B"], label: "blank" },
            { keys: ["O"], label: "overview" },
            { keys: ["F"], label: "fullscreen" },
            { keys: ["S"], label: "speaker" },
            { keys: ["Esc"], label: "exit" },
        ],
    },
];
