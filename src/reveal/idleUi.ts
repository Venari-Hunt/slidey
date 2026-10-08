// Fades reveal's arrows, progress bar and slide number after the mouse has
// been still for IDLE_MS, and brings them back on the next mouse move. Keys
// (a clicker) don't wake them, so they stay out of the way while presenting.
// Runs in the deck page through the template's `slideyScript` slot; the CSS
// goes in the `presetStyles` slot.

const IDLE_MS = 2000;

export const IDLE_UI_SCRIPT = `(function () {
    var deck = document.querySelector(".reveal");
    if (!deck) return;
    var timer;
    function wake() {
        deck.classList.remove("slidey-idle");
        clearTimeout(timer);
        timer = setTimeout(function () {
            deck.classList.add("slidey-idle");
        }, ${IDLE_MS});
    }
    ["mousemove", "pointerdown", "touchstart"].forEach(function (type) {
        document.addEventListener(type, wake, { passive: true });
    });
    wake();
})();`;

export const IDLE_UI_CSS = `.reveal :is(.controls,.progress,.slide-number){transition:opacity .4s ease}
.reveal.slidey-idle :is(.controls,.progress,.slide-number){opacity:0!important;pointer-events:none}`;
