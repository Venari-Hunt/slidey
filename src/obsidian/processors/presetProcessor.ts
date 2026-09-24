import type { Options, Processor } from "../../@types";
import { CommentParser } from "../../obsidian/comment";
import {
    LAYOUTS,
    layoutClass,
    presetClass,
    type SlidePreset,
    styleClass,
} from "../../presets";

/** Which list a processor resolves: presets, or the styles split from them. */
interface LookKind {
    /** Slide comment attribute naming the look per slide. */
    attr: string;
    /** Options key of the deck default (note frontmatter). */
    deckKey: "preset" | "style" | "layout";
    /** Options key of the definitions list (plugin settings). */
    listKey?: "presets" | "styles";
    /** A fixed list shipped with the plugin, used instead of `listKey`. */
    fixed?: SlidePreset[];
    classFor: (name: string) => string;
}

const PRESETS: LookKind = {
    attr: "preset",
    deckKey: "preset",
    listKey: "presets",
    classFor: presetClass,
};

// `style` is taken on slide comments (inline CSS), hence `slidey-style`.
export const STYLES: LookKind = {
    attr: "slidey-style",
    deckKey: "style",
    listKey: "styles",
    classFor: styleClass,
};

// Layouts are a fixed set, not settings.
export const LAYOUTS_KIND: LookKind = {
    attr: "layout",
    deckKey: "layout",
    fixed: LAYOUTS,
    classFor: layoutClass,
};

// Resolves each slide's preset — a per-slide `<!-- slide preset="x" -->` wins
// over the deck-wide `preset:` frontmatter, and `preset="none"` opts a slide
// out of the deck default — and stamps the matching CSS class onto the slide's
// comment annotation (creating one when absent). The CSS for each class is
// injected separately by the renderer (see buildPresetCss). The same logic
// resolves styles (`style:` / `slidey-style="x"`) when built with STYLES.
export class PresetProcessor implements Processor {
    constructor(private kind: LookKind = PRESETS) {}

    private slideCommentRegex = /<!--\s*(?:\.)?slide.*-->/;
    private parser = new CommentParser();

    process(markdown: string, options: Options): string {
        const { attr, deckKey, listKey, fixed } = this.kind;
        const presets =
            fixed ??
            ((listKey && options[listKey]) as SlidePreset[] | undefined) ??
            [];
        const deck = options[deckKey];
        const deckPreset = typeof deck === "string" ? deck.trim() : "";

        if (presets.length === 0 || (!deckPreset && !markdown.includes(attr))) {
            return markdown;
        }

        const byName = new Map<string, SlidePreset>();
        for (const preset of presets) {
            if (preset?.name) {
                byName.set(preset.name, preset);
            }
        }
        let output = markdown;

        for (const slide of this.eachSlide(markdown, options)) {
            if (!slide.trim()) {
                continue;
            }
            const newSlide = this.transformSlide(slide, deckPreset, byName);
            if (newSlide !== slide) {
                output = output.split(slide).join(newSlide);
            }
        }
        return output;
    }

    private *eachSlide(markdown: string, options: Options): Generator<string> {
        for (const group of markdown.split(
            new RegExp(options.separator, "gmi"),
        )) {
            yield* group.split(new RegExp(options.verticalSeparator, "gmi"));
        }
    }

    private transformSlide(
        slide: string,
        deckPreset: string,
        byName: Map<string, SlidePreset>,
    ): string {
        const hasComment = this.slideCommentRegex.test(slide);
        let comment = hasComment
            ? this.parser.parseLine(this.slideCommentRegex.exec(slide)?.[0])
            : null;

        const perSlide = comment?.getAttribute(this.kind.attr)?.trim();
        let name: string;
        if (perSlide != null) {
            // An explicit per-slide preset. Unknown names are left untouched —
            // they may not be ours to interpret.
            if (perSlide !== "none" && !byName.has(perSlide)) {
                return slide;
            }
            name = perSlide === "none" ? "" : perSlide;
        } else {
            name = byName.has(deckPreset) ? deckPreset : "";
        }

        // Nothing to do: no preset and no stray attribute to clean up.
        if (!name && perSlide == null) {
            return slide;
        }

        const preset = name ? byName.get(name) : undefined;
        const clazz = name ? this.kind.classFor(name) : "";

        if (!comment) {
            if (!clazz) {
                return slide;
            }
            comment = this.parser.parseLine(`<!-- slide class="${clazz}" -->`);
            this.applyBackground(comment, preset);
            return `${this.parser.commentToString(comment)}\n${slide}`;
        }

        comment.deleteAttribute(this.kind.attr);
        if (clazz && !comment.hasClass(clazz)) {
            comment.addClass(clazz);
        }
        this.applyBackground(comment, preset);
        return slide.replace(
            this.slideCommentRegex,
            this.parser.commentToString(comment),
        );
    }

    // reveal.js paints slide backgrounds from a separate layer, so a preset's
    // background has to go through the `bg` attribute (-> data-background-color),
    // not just CSS. A background already set on the slide wins.
    private applyBackground(
        comment: ReturnType<CommentParser["parseLine"]>,
        preset: SlidePreset | undefined,
    ): void {
        if (
            !comment ||
            !preset?.background ||
            comment.hasAttribute("bg") ||
            comment.hasAttribute("data-background-color") ||
            comment.hasAttribute("data-background-image")
        ) {
            return;
        }
        comment.addAttribute("bg", preset.background.replace(/[<>"]/g, ""));
    }
}
