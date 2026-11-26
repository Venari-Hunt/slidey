// reveal.js 6 ships the markdown plugin as dist/plugin/markdown.mjs (default
// export: a factory). Its .js build is a UMD file that a bundler sees as ESM
// (the package is "type": "module"), so require() gives an empty namespace.
import Markdown from "reveal.js/plugin/markdown";

export const md = Markdown();
