// The bundled title-card font (Poppins ExtraBold, latin, SIL Open Font
// License), inlined as a data URL so decks, PDF/PPTX export and HTML export
// all carry it with nothing to download. See TITLE_CARD_FONT in presets.ts.

import poppinsExtraBold from "../assets/fonts/poppins-latin-800-normal.woff2";
import { TITLE_CARD_FONT_NAME } from "../presets";

export const TITLE_CARD_FONT_FACE = `@font-face{font-family:"${TITLE_CARD_FONT_NAME}";src:url(${poppinsExtraBold}) format("woff2");font-weight:800;font-style:normal;font-display:block}`;
