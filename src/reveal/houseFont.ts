// The auto-deck fonts (latin, SIL Open Font License), inlined as data URLs so
// decks, PDF/PPTX export and HTML export all carry them with nothing to
// download: Poppins for headings, statements and title cards (800), Inter for
// body text. See HOUSE_FONT / BODY_FONT in presets.ts.

import inter400Italic from "../assets/fonts/inter-latin-400-italic.woff2";
import inter400 from "../assets/fonts/inter-latin-400-normal.woff2";
import inter700Italic from "../assets/fonts/inter-latin-700-italic.woff2";
import inter700 from "../assets/fonts/inter-latin-700-normal.woff2";
import poppins400 from "../assets/fonts/poppins-latin-400-normal.woff2";
import poppins700 from "../assets/fonts/poppins-latin-700-normal.woff2";
import poppins800 from "../assets/fonts/poppins-latin-800-normal.woff2";
import { BODY_FONT_NAME, HOUSE_FONT_NAME } from "../presets";

const face = (family: string, src: string, weight: number, style = "normal") =>
    `@font-face{font-family:"${family}";src:url(${src}) format("woff2");font-weight:${weight};font-style:${style};font-display:block}`;

export const HOUSE_FONT_FACES = [
    face(HOUSE_FONT_NAME, poppins400, 400),
    face(HOUSE_FONT_NAME, poppins700, 700),
    face(HOUSE_FONT_NAME, poppins800, 800),
    face(BODY_FONT_NAME, inter400, 400),
    face(BODY_FONT_NAME, inter400Italic, 400, "italic"),
    face(BODY_FONT_NAME, inter700, 700),
    face(BODY_FONT_NAME, inter700Italic, 700, "italic"),
].join("\n");
