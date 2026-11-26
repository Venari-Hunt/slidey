// Keys a presentation clicker (a USB keyboard to the computer) or a keyboard
// sends → the reveal.js postMessage API method that does the same. Clickers
// almost always send PageUp/PageDown (some send arrows); Space is the common
// "advance" on the ones that double as a laser pointer. The "blank screen"
// button sends `.` or `b` (Logitech, Kensington, most no-name remotes); it
// blacks the slides out until pressed again, as in PowerPoint.
export const CLICKER_KEYS: Readonly<Record<string, string>> = {
    PageDown: "next",
    PageUp: "prev",
    ArrowRight: "next",
    ArrowLeft: "prev",
    ArrowDown: "down",
    ArrowUp: "up",
    " ": "next",
    Spacebar: "next",
    ".": "togglePause",
    b: "togglePause",
    B: "togglePause",
};
