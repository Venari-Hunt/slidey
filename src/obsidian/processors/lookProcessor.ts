import type { Options, Processor } from "../../@types";
import { isAutoDeck } from "../../domain/autoLayout";
import { deckStyle, LEADING_NUMBER, pickLook } from "../../domain/slideLook";
import { CommentParser } from "../comment";
import { restoreFencedCode } from "../fencedCode";

const SLIDE_COMMENT = /<!--\s*(?:\.)?slide.*-->/;
const LAYOUT_CLASS = /\bslidey-layout-([a-z0-9-]+)/;
const HEADING_LINE = /^(\s*#{1,6}\s)/m;

export function lookClass(layout: string, look: string): string {
    return `slidey-look-${layout}-${look}`;
}

// Runs after the layout processor: reads each slide's `slidey-layout-x` class,
// picks its look (domain/slideLook.ts) and stamps `slidey-look-<layout>-<look>`.
// Only auto decks get looks. A few looks need a small piece of markup the
// theme can't make from CSS alone: the counting number of a statement and the
// number or "2 / 3" of a section.
export class LookProcessor implements Processor {
    private parser = new CommentParser();

    process(markdown: string, options: Options): string {
        if (!isAutoDeck(options)) {
            return markdown;
        }
        const style = deckStyle(options.slideLooks);
        const slides = [...this.eachSlide(markdown, options)];
        const layoutOf = (slide: string) =>
            LAYOUT_CLASS.exec(SLIDE_COMMENT.exec(slide)?.[0] ?? "")?.[1] ?? "";
        const sections = slides.filter((s) => layoutOf(s) === "section").length;

        let output = markdown;
        let prev: { layout: string; look: string } | undefined;
        let section = 0;
        for (const slide of slides) {
            const layout = layoutOf(slide);
            const match = SLIDE_COMMENT.exec(slide);
            if (!layout || !match) {
                prev = undefined;
                continue;
            }
            const comment = this.parser.parseLine(match[0]);
            const chosen = comment.getAttribute("slidey-look") ?? undefined;
            const look = pickLook(layout, restoreFencedCode(slide), {
                style,
                prev,
                sections,
                chosen,
            });
            if (layout === "section") {
                section++;
            }
            prev = { layout, look };
            if (!look) {
                continue;
            }
            comment.deleteAttribute("slidey-look");
            comment.addClass(lookClass(layout, look));
            if (layout === "section" && look === "rule") {
                // How far through the deck: the rule under the heading fills to here.
                comment.addStyle(
                    "--slidey-p",
                    `${Math.round((section / Math.max(sections, 1)) * 100)}%`,
                );
            }
            let next = slide.replace(
                SLIDE_COMMENT,
                this.parser.commentToString(comment),
            );
            next = this.addMarkup(next, layout, look, section, sections);
            if (next !== slide) {
                output = output.split(slide).join(next);
            }
        }
        return output;
    }

    private addMarkup(
        slide: string,
        layout: string,
        look: string,
        section: number,
        sections: number,
    ): string {
        if (layout === "section" && look === "number") {
            return slide.replace(
                HEADING_LINE,
                `<span class="slidey-n">${String(section).padStart(2, "0")}</span>\n\n$1`,
            );
        }
        if (layout === "section" && look === "rule") {
            return slide.replace(
                HEADING_LINE,
                `<p class="slidey-kick">${section} / ${Math.max(sections, section)}</p>\n\n$1`,
            );
        }
        if (layout === "statement" && look === "number") {
            return this.bigNumber(slide);
        }
        return slide;
    }

    // `73% of people…` → the number on its own line, counting up when the
    // slide arrives (whole numbers only), and the rest under it.
    private bigNumber(slide: string): string {
        const lines = slide.split(/\r?\n/);
        const at = lines.findIndex(
            (l) =>
                l.trim() && !SLIDE_COMMENT.test(l) && !/^\s*%%.*%%\s*$/.test(l),
        );
        if (at < 0) {
            return slide;
        }
        const m = LEADING_NUMBER.exec(lines[at]);
        if (!m) {
            return slide;
        }
        const token = m[2];
        const rest = lines[at].slice(m[0].length).trim();
        const whole = /^(\D*)(\d{1,6})(\D*)$/.exec(token);
        const big = whole
            ? `${whole[1]}<span class="slidey-count" style="--slidey-to:${whole[2]}"><span>${whole[2]}</span></span>${whole[3]}`
            : token;
        lines.splice(at, 1, `<span class="slidey-big">${big}</span>`, "", rest);
        return lines.join("\n");
    }

    private *eachSlide(markdown: string, options: Options): Generator<string> {
        for (const group of markdown.split(
            new RegExp(options.separator, "gmi"),
        )) {
            yield* group.split(new RegExp(options.verticalSeparator, "gmi"));
        }
    }
}
