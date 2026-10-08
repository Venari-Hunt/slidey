// The bundled title-card font (TeX Gyre Adventor Bold, GUST Font License),
// inlined as a data URL so decks, PDF/PPTX export and HTML export all carry
// it with nothing to download. See TITLE_CARD_FONT in presets.ts.

import adventorBold from "../assets/fonts/texgyreadventor-bold.woff2";
import { TITLE_CARD_FONT_NAME } from "../presets";

export const TITLE_CARD_FONT_FACE = `@font-face{font-family:"${TITLE_CARD_FONT_NAME}";src:url(${adventorBold}) format("woff2");font-weight:700;font-style:normal;font-display:block}`;
