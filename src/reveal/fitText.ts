// Shrinks a slide's text until it fits the slide (0.17.0). Runs inside the
// deck page: the template drops FIT_TEXT_SCRIPT into its `slideyScript` slot,
// after Reveal.initialize.
//
// A slide overflows when its content box is taller than the slide. The drop
// wrapper (`section > div`, absolutely positioned, full slide size) holds the
// content in most slides; plain sections are measured directly. The font
// size is scaled down by binary search, never below MIN_SCALE; headings and
// lists use em sizes, so they shrink with it. Pictures already fit on their
// own (IMAGE_FIT_CSS), so they are left out of the measurement by the CSS
// that caps them.
//
// Hidden slides have no layout (display:none), so each slide is fitted when
// reveal shows it, and again once its pictures finish loading. In print
// (PDF) mode every page is laid out at once, so all are fitted on
// `pdf-ready`.

export const MIN_SCALE = 0.5;

export const FIT_TEXT_SCRIPT = `(function () {
    var MIN_SCALE = ${MIN_SCALE};
    var STEPS = 7;
    var TOLERANCE = 4;
    var MEDIA = /^(IMG|VIDEO|IFRAME|CANVAS|svg|SVG|PICTURE|OBJECT|EMBED)$/;

    function leafSlides(root) {
        return Array.prototype.filter.call(
            (root || document).querySelectorAll(".reveal .slides section"),
            function (s) { return !s.querySelector("section"); }
        );
    }

    // How far the slide's content sticks out past the slide's right or bottom
    // edge, in slide px (0 = it fits). Text pushed sideways by CSS columns
    // (two-column) widens its box, so it counts too. Left out: pictures and
    // other media (they fit themselves, and layouts may bleed them past an
    // edge on purpose), and anything inside a scrolling or clipping box (a
    // code block), which can't spill.
    function excess(section) {
        // Measured from the section's own corner, so a slide still moving in
        // (slide transition) measures the same as one at rest.
        var config = (Reveal.getConfig && Reveal.getConfig()) || {};
        var scale = section.closest(".pdf-page") ? 1 : (Reveal.getScale ? Reveal.getScale() : 1) || 1;
        var corner = section.getBoundingClientRect();
        var frame = {
            left: corner.left,
            top: corner.top,
            right: corner.left + (config.width || 960) * scale,
            bottom: corner.top + (config.height || 700) * scale
        };
        var worst = 0;
        var all = section.querySelectorAll("*");
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (MEDIA.test(el.tagName) || clipped(el, section)) {
                continue;
            }
            var r = el.getBoundingClientRect();
            if (!r.width && !r.height) {
                continue;
            }
            worst = Math.max(worst, r.right - frame.right, r.bottom - frame.bottom);
        }
        return worst / scale;
    }

    function clipped(el, section) {
        for (var p = el.parentElement; p && p !== section; p = p.parentElement) {
            if (getComputedStyle(p).overflow !== "visible") {
                return true;
            }
        }
        return false;
    }

    function fit(section) {
        if (section.hasAttribute("data-slidey-nofit")) {
            return;
        }
        if (section.dataset.slideyBaseFont === undefined) {
            section.dataset.slideyBaseFont = section.style.fontSize || "";
        }
        section.style.fontSize = section.dataset.slideyBaseFont;
        section.removeAttribute("data-slidey-fit");
        if (!section.offsetParent && getComputedStyle(section).display === "none") {
            return;
        }
        var over = excess(section);
        if (over <= TOLERANCE) {
            return;
        }
        var base = parseFloat(getComputedStyle(section).fontSize);
        // Overflow that smaller text doesn't reduce (a picture, a wide
        // table, rounding in a layout) is not the text's fault: leave it.
        section.style.fontSize = (base * MIN_SCALE) + "px";
        if (excess(section) >= over - TOLERANCE) {
            section.style.fontSize = section.dataset.slideyBaseFont;
            return;
        }
        var lo = MIN_SCALE, hi = 1;
        for (var i = 0; i < STEPS; i++) {
            var mid = (lo + hi) / 2;
            section.style.fontSize = (base * mid) + "px";
            if (excess(section) > TOLERANCE) { hi = mid; } else { lo = mid; }
        }
        section.style.fontSize = (base * lo) + "px";
        section.setAttribute("data-slidey-fit", lo.toFixed(2));
    }

    function fitWhenLoaded(section) {
        fit(section);
        Array.prototype.forEach.call(section.querySelectorAll("img"), function (img) {
            if (!img.complete) {
                img.addEventListener("load", function () { fit(section); }, { once: true });
            }
        });
    }

    function fitShown() {
        leafSlides().forEach(function (s) {
            if (s.offsetParent || getComputedStyle(s).display !== "none") {
                fitWhenLoaded(s);
            }
        });
    }

    function start() {
        var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        ready.then(fitShown);
        Reveal.on("slidechanged", fitShown);
        Reveal.on("slidetransitionend", fitShown);
        Reveal.on("resize", fitShown);
        Reveal.on("pdf-ready", function () { leafSlides().forEach(fitWhenLoaded); });
    }

    window.slideyFitText = { fit: fit, fitShown: fitShown };
    if (Reveal.isReady && Reveal.isReady()) { start(); } else { Reveal.on("ready", start); }
})();`;
