import {
    type App,
    type Editor,
    type EditorPosition,
    EditorSuggest,
    type EditorSuggestContext,
    type EditorSuggestTriggerInfo,
    getFrontMatterInfo,
    parseYaml,
    type TFile,
} from "obsidian";
import type { SlidesExtendedSettings } from "../../@types";
import {
    CURSOR,
    deckMode,
    filterSlashItems,
    inFencedCode,
    type SlashItem,
    slashItems,
    slashQuery,
} from "../slashMenu";

// A non-deck note only gets the menu once the typed word starts naming it, so
// Slash Commander (or Obsidian's own slash menu) keeps the bare `/` there.
const MIN_QUERY_OUTSIDE_DECKS = 2;

/**
 * Typing `/` in a deck note lists what can go on a slide. When nothing matches
 * what's typed, it steps aside so other `/` menus still work.
 */
export class SlashMenuSuggest extends EditorSuggest<SlashItem> {
    private items: SlashItem[] = [];

    constructor(
        app: App,
        private getSettings: () => SlidesExtendedSettings,
        private showPreview: () => Promise<void>,
    ) {
        super(app);
        this.limit = 50;
    }

    onTrigger(
        cursor: EditorPosition,
        editor: Editor,
        _file: TFile | null,
    ): EditorSuggestTriggerInfo | null {
        const settings = this.getSettings();
        if (settings.slashMenu === false) {
            return null;
        }
        const typed = slashQuery(editor.getLine(cursor.line), cursor.ch);
        if (!typed) {
            return null;
        }

        const text = editor.getValue();
        const info = getFrontMatterInfo(text);
        let frontmatter: Record<string, unknown> | null = null;
        if (info.exists) {
            const contentLine = text
                .slice(0, info.contentStart)
                .split("\n").length;
            if (cursor.line < contentLine - 1) {
                return null;
            }
            try {
                frontmatter = parseYaml(info.frontmatter) ?? {};
            } catch {
                return null;
            }
        }
        const mode = deckMode(frontmatter);
        if (!mode && typed.query.length < MIN_QUERY_OUTSIDE_DECKS) {
            return null;
        }
        if (inFencedCode(text.split("\n"), cursor.line)) {
            return null;
        }

        this.items = filterSlashItems(slashItems(mode, settings), typed.query);
        if (!this.items.length) {
            return null;
        }
        return {
            start: { line: cursor.line, ch: typed.start },
            end: cursor,
            query: typed.query,
        };
    }

    getSuggestions(_context: EditorSuggestContext): SlashItem[] {
        return this.items;
    }

    renderSuggestion(item: SlashItem, el: HTMLElement): void {
        el.addClass("slidey-slash-item");
        el.createDiv({ cls: "slidey-slash-title", text: item.title });
        el.createDiv({ cls: "slidey-slash-hint", text: item.hint });
    }

    selectSuggestion(item: SlashItem, _evt: MouseEvent | KeyboardEvent): void {
        const context = this.context;
        if (!context) {
            return;
        }
        const { editor, start, file } = context;
        // The stored end can lag the last typed letter; replace up to the
        // cursor instead, when it's still on the `/` line.
        const cursor = editor.getCursor();
        const end =
            cursor.line === start.line && cursor.ch >= start.ch
                ? cursor
                : context.end;
        const insert = item.insert ?? "";
        const at = insert.indexOf(CURSOR);
        const text = insert.replace(CURSOR, "");
        editor.replaceRange(text, start, end);
        editor.setCursor(
            editor.offsetToPos(
                editor.posToOffset(start) + (at < 0 ? text.length : at),
            ),
        );
        this.close();

        if (item.showPreview) {
            void this.showPreview();
        }
        if (item.command) {
            (
                this.app as App & {
                    commands: { executeCommandById(id: string): boolean };
                }
            ).commands.executeCommandById(item.command);
        }
        if (item.makeDeck && file) {
            const mode = item.makeDeck;
            void this.app.fileManager.processFrontMatter(
                file,
                (fm: Record<string, unknown>) => {
                    fm.slides = mode;
                },
            );
        }
    }
}
