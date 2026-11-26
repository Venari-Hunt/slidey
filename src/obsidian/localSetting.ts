import {
    type ButtonComponent,
    type DropdownComponent,
    type SearchComponent,
    Setting,
    type TextComponent,
} from "obsidian";
import { tr } from "../domain/settingsStrings";

/**
 * A Setting whose name, description, button text, dropdown options,
 * placeholders and tooltips go through the pt-BR table (English when the
 * text has no translation).
 */
export class LocalSetting extends Setting {
    setName(name: string | DocumentFragment): this {
        return super.setName(typeof name === "string" ? tr(name) : name);
    }

    setDesc(desc: string | DocumentFragment): this {
        return super.setDesc(typeof desc === "string" ? tr(desc) : desc);
    }

    setTooltip(
        tooltip: string,
        options?: Parameters<Setting["setTooltip"]>[1],
    ): this {
        return super.setTooltip(tr(tooltip), options);
    }

    addButton(cb: (component: ButtonComponent) => unknown): this {
        return super.addButton((btn) => {
            const set = btn.setButtonText.bind(btn);
            btn.setButtonText = (text) => set(tr(text));
            return cb(btn);
        });
    }

    addDropdown(cb: (component: DropdownComponent) => unknown): this {
        return super.addDropdown((drop) => {
            const add = drop.addOption.bind(drop);
            drop.addOption = (value, label) => add(value, tr(label));
            return cb(drop);
        });
    }

    addText(cb: (component: TextComponent) => unknown): this {
        return super.addText((text) => {
            const set = text.setPlaceholder.bind(text);
            text.setPlaceholder = (value) => set(tr(value));
            return cb(text);
        });
    }

    addSearch(cb: (component: SearchComponent) => unknown): this {
        return super.addSearch((search) => {
            const set = search.setPlaceholder.bind(search);
            search.setPlaceholder = (value) => set(tr(value));
            return cb(search);
        });
    }
}
