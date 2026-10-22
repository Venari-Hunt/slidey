import { type App, Modal } from "obsidian";
import { SHORTCUT_GROUPS, t } from "../domain/strings";

export class ShortcutsModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        this.setTitle(t("shortcutsTitle"));
        for (const group of SHORTCUT_GROUPS) {
            this.contentEl.createEl("h4", { text: t(group.title) });
            const list = this.contentEl.createDiv({
                cls: "slidey-shortcuts",
            });
            for (const row of group.rows) {
                const line = list.createDiv({ cls: "slidey-shortcut-row" });
                const keys = line.createSpan({ cls: "slidey-shortcut-keys" });
                for (const key of row.keys) {
                    keys.createEl("kbd", { text: key });
                }
                line.createSpan({ text: t(row.label) });
            }
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}
