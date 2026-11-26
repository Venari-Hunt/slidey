// Static render check of reveal-dist template with reveal.js 6: node render-check.mjs <buildDir> <outDir>
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const [build, out] = process.argv.slice(2);
const require = createRequire(join(build, "../package.json"));
const Mustache = require("mustache");
mkdirSync(out, { recursive: true });

const slides = `
<section data-markdown data-separator="^\\n---\\n$" data-separator-vertical="^\\n--\\n$"><textarea data-template>
# Slide one

- alpha
- beta <!-- .element: class="fragment" -->

Inline math $E=mc^2$

> [!tip] Handy
> callout body

---

## Code

FENCEDCODEjs:1:${Buffer.from("```js\nconst placeholder = 1;\n```").toString("base64")}ECODDECNEF

\`\`\`js
const a = 1;
console.log(a);
\`\`\`

Note:
speaker note here
</textarea></section>`;

const html = Mustache.render(readFileSync(join(build, "template/reveal.html"), "utf8"), {
    title: "check",
    base: "/",
    themeUrl: "dist/theme/black.css",
    highlightThemeUrl: "plugin/highlight/monokai.css",
    slides,
    isKaTeX: true,
    enableMenu: true,
    enablePointer: true,
    enableChalkboard: true,
    enableCustomControls: true,
    enableAudioSlideshow: false,
    revealOptionsStr: "{}",
    slideyScript: "window.__ready = 'slidey-script-ran';",
});
writeFileSync(join(out, "index.html"), html);

const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".woff2": "font/woff2" };
const root = resolve(build);
const server = createServer((req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]);
    const f = p === "/" ? join(out, "index.html") : resolve(root, `.${p}`);
    // Local test server: only ever serve the built folder (or the page).
    if (p !== "/" && !f.startsWith(root + sep)) { res.statusCode = 403; return res.end(); }
    if (!existsSync(f)) { console.log("404", p); res.statusCode = 404; return res.end(); }
    res.setHeader("content-type", types[extname(f)] || "application/octet-stream");
    res.end(readFileSync(f));
});
await new Promise((r) => server.listen(3999, r));

const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const run = (args) => new Promise((resolve) => {
    let stdout = "";
    const p = spawn(edge, ["--headless=new", "--disable-gpu", "--window-size=1280,720", `--user-data-dir=${join(out, "profile")}`, "--virtual-time-budget=6000", ...args]);
    p.stdout.on("data", (d) => { stdout += d; });
    const t = setTimeout(() => p.kill(), 45000);
    p.on("exit", () => { clearTimeout(t); resolve({ stdout }); });
});
const shot = join(out, "shot.png");
await run([`--screenshot=${shot}`, "http://localhost:3999/"]);
const dom = (await run(["--dump-dom", "http://localhost:3999/"])).stdout || "";
writeFileSync(join(out, "dom.html"), dom);
console.log("screenshot", existsSync(shot));
console.log("reveal classes:", /class="reveal[^"]*"/.exec(dom)?.[0]);
console.log("h1:", /<h1[^>]*>Slide one/.test(dom), "callout:", /class="callout callout-color2"/.test(dom), "placeholder code:", /hljs-keyword">const<\/span> placeholder/.test(dom), "code blocks:", (dom.match(/<pre class="code-wrapper">/g) || []).length, "katex-ish:", /katex/.test(dom));
console.log("sections:",(dom.match(/<section/g) || []).length, "fragment:", /class="fragment/.test(dom), "hljs:", /hljs/.test(dom), "katex:", /class="katex/.test(dom), "ready-marker:", /slidey-script/.test(dom), "present:", /class="[^"]*present/.test(dom));
server.close();
