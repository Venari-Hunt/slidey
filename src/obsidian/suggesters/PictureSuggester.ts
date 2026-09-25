import {
    type App,
    type Editor,
    type EditorPosition,
    EditorSuggest,
    type EditorSuggestContext,
    type EditorSuggestTriggerInfo,
    type TFile,
} from "obsidian";
import {
    bgQuery,
    PICTURE_FILE,
    type PictureFile,
    pictureValue,
    rankPictures,
} from "../pictureSuggest";

/** Typing after `bg=` in a slide marker lists the vault's pictures. */
export class PictureSuggest extends EditorSuggest<PictureFile> {
    constructor(app: App) {
        super(app);
        this.limit = 30;
    }

    onTrigger(
        cursor: EditorPosition,
        editor: Editor,
        _file: TFile | null,
    ): EditorSuggestTriggerInfo | null {
        const typed = bgQuery(editor.getLine(cursor.line), cursor.ch);
        if (!typed || typed.query.startsWith("#")) {
            // `bg=#224466` is a color, not a picture.
            return null;
        }
        return {
            start: { line: cursor.line, ch: typed.start },
            end: cursor,
            query: typed.query,
        };
    }

    getSuggestions(context: EditorSuggestContext): PictureFile[] {
        return rankPictures(
            this.pictures(),
            context.query,
            context.file?.path ?? "",
        );
    }

    renderSuggestion(file: PictureFile, el: HTMLElement): void {
        el.addClass("slidey-slash-item");
        el.createDiv({ cls: "slidey-slash-title", text: file.name });
        el.createDiv({ cls: "slidey-slash-hint", text: file.path });
    }

    selectSuggestion(
        file: PictureFile,
        _evt: MouseEvent | KeyboardEvent,
    ): void {
        const context = this.context;
        if (!context) {
            return;
        }
        const { editor, start } = context;
        const cursor = editor.getCursor();
        const end =
            cursor.line === start.line && cursor.ch >= start.ch
                ? cursor
                : context.end;
        const value = pictureValue(
            file,
            this.app.vault.getFiles().map((f) => f.path),
        );
        editor.replaceRange(value, start, end);
        editor.setCursor({ line: start.line, ch: start.ch + value.length });
        this.close();
    }

    private pictures(): PictureFile[] {
        return this.app.vault
            .getFiles()
            .filter((file) => PICTURE_FILE.test(file.name))
            .map((file) => ({
                path: file.path,
                name: file.name,
                mtime: file.stat.mtime,
            }));
    }
}
