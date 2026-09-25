// Runs inside the deck page for two-screen presenting (0.20.0).
//
// `slidey-audience` in the query: the deck the audience sees. After every
// move it tells its Obsidian window where it is: `{slidey: "state", h, v, f,
// index, total, notes, next}` (next = the following slide's h/v, or null).
//
// `slidey-mirror` in the query: a copy of the deck inside the speaker view
// (current and next slide). It never takes keyboard focus or navigates on
// its own; the speaker view moves it with reveal's postMessage API.
//
// reveal.js's own speaker view (S key) opens a popup window, which Obsidian
// blocks, so in Obsidian S asks the plugin to open the Slidey speaker view.

export const AUDIENCE_QUERY = "slidey-audience";
export const MIRROR_QUERY =
    "slidey-mirror&controls=false&progress=false&slideNumber=false&keyboard=false&transition=none&backgroundTransition=none&fragments=true&overview=false";

export const SPEAKER_SCRIPT = `(function () {
    var audience = /[?&]slidey-audience\\b/.test(location.search);
    var mirror = /[?&]slidey-mirror\\b/.test(location.search);
    var inObsidian = window.parent !== window;

    function post(data) {
        window.parent.postMessage(JSON.stringify(data), "*");
    }

    function state() {
        var slides = Reveal.getSlides();
        var current = Reveal.getCurrentSlide();
        var at = slides.indexOf(current);
        var next = slides[at + 1];
        var i = Reveal.getIndices();
        post({
            slidey: "state",
            h: i.h,
            v: i.v || 0,
            f: typeof i.f === "number" ? i.f : -1,
            index: at,
            total: slides.length,
            notes: Reveal.getSlideNotes ? Reveal.getSlideNotes(current) || "" : "",
            next: next ? Reveal.getIndices(next) : null,
            title: ((current && current.querySelector("h1,h2,h3")) || {}).textContent || ""
        });
    }

    function start() {
        if (audience) {
            Reveal.addKeyBinding({ keyCode: 27, key: "Esc", description: "End presentation" }, function () {
                post({ slidey: "end" });
            });
            ["slidechanged", "fragmentshown", "fragmenthidden"].forEach(function (e) {
                Reveal.on(e, state);
            });
            state();
        }
        if (mirror) {
            document.documentElement.classList.add("slidey-mirror");
            var style = document.createElement("style");
            style.textContent = ".slidey-mirror .reveal .controls,.slidey-mirror .reveal .progress{display:none!important}";
            document.head.appendChild(style);
        }
        if (inObsidian && !mirror) {
            // S: reveal's popup speaker view can't open in Obsidian.
            Reveal.addKeyBinding({ keyCode: 83, key: "S", description: "Speaker view" }, function () {
                post({ slidey: "open-speaker-view" });
            });
        }
    }

    if (!audience && !mirror && !inObsidian) {
        return;
    }
    if (Reveal.isReady && Reveal.isReady()) { start(); } else { Reveal.on("ready", start); }
})();`;
