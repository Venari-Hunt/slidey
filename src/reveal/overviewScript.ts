// Runs inside the deck page when it's shown in the slide overview panel
// (0.19.0): the deck is loaded in print layout (`?print-pdf`, one page per
// slide, fragments not split) with `slidey-overview` in the query. The script
// scales the pages to the panel's width, reports a click on a page to the
// panel as `{slidey: "overview-click", page}`, and outlines the page the
// panel names in `{slidey: "overview-current", page}`.
//
// Print layout flattens vertical stacks, so a page is only its position in
// the deck; the panel maps it to a note line with the same slide-start list
// the preview's cursor sync uses (slides in note order).

export const OVERVIEW_QUERY =
    "print-pdf&pdfSeparateFragments=false&slidey-overview";

export const OVERVIEW_SCRIPT = `(function () {
    if (!/[?&]slidey-overview\\b/.test(location.search)) {
        return;
    }
    var current = -1;

    function pages() {
        return Array.prototype.slice.call(document.querySelectorAll(".pdf-page"));
    }

    function scale() {
        var first = pages()[0];
        if (!first) {
            return;
        }
        document.documentElement.style.zoom = "";
        var width = first.getBoundingClientRect().width;
        if (width > 0) {
            document.documentElement.style.zoom = String(window.innerWidth / width);
        }
    }

    function mark(index, scroll) {
        current = index;
        pages().forEach(function (page, i) {
            page.classList.toggle("slidey-overview-current", i === index);
        });
        var page = pages()[index];
        if (scroll && page) {
            page.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }

    function setup() {
        var style = document.createElement("style");
        style.textContent =
            "html,body{overflow-x:hidden!important;background:transparent!important}" +
            ".pdf-page{cursor:pointer;position:relative}" +
            ".pdf-page::after{content:'';position:absolute;inset:0;pointer-events:none;" +
            "border:6px solid transparent;box-sizing:border-box}" +
            ".pdf-page:hover::after{border-color:rgba(255,255,255,.35)}" +
            ".pdf-page.slidey-overview-current::after{border-color:#ff9e64}";
        document.head.appendChild(style);
        pages().forEach(function (page, i) {
            page.addEventListener("click", function () {
                mark(i, false);
                window.parent.postMessage(JSON.stringify({ slidey: "overview-click", page: i }), "*");
            });
        });
        scale();
        if (current >= 0) {
            mark(current, true);
        }
        window.parent.postMessage(JSON.stringify({ slidey: "overview-ready", pages: pages().length }), "*");
    }

    window.addEventListener("resize", scale);
    window.addEventListener("message", function (event) {
        var data;
        try {
            data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        } catch (e) {
            return;
        }
        if (data && data.slidey === "overview-current" && typeof data.page === "number") {
            mark(data.page, true);
        }
    });
    if (pages().length) {
        setup();
    } else {
        Reveal.on("pdf-ready", setup);
    }
})();`;
