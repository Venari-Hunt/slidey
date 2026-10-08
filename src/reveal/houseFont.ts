// The auto-deck font (Poppins, latin, SIL Open Font License), inlined as data
// URLs so decks, PDF/PPTX export and HTML export all carry it with nothing to
// download. 800 is for title cards. See HOUSE_FONT in presets.ts.

import poppins400Italic from "../assets/fonts/poppins-latin-400-italic.woff2";
import poppins400 from "../assets/fonts/poppins-latin-400-normal.woff2";
import poppins700Italic from "../assets/fonts/poppins-latin-700-italic.woff2";
import poppins700 from "../assets/fonts/poppins-latin-700-normal.woff2";
import poppins800 from "../assets/fonts/poppins-latin-800-normal.woff2";
import { HOUSE_FONT_NAME } from "../presets";

const face = (src: string, weight: number, style: string) =>
    `@font-face{font-family:"${HOUSE_FONT_NAME}";src:url(${src}) format("woff2");font-weight:${weight};font-style:${style};font-display:block}`;

export const HOUSE_FONT_FACES = [
    face(poppins400, 400, "normal"),
    face(poppins400Italic, 400, "italic"),
    face(poppins700, 700, "normal"),
    face(poppins700Italic, 700, "italic"),
    face(poppins800, 800, "normal"),
].join("\n");
