import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import less from "less";

const STATIC_COPY_SOURCES = ["static/system.json", "src/templates", "src/lang", "src/assets"];

const LESS_ENTRY = "src/styles/100dos.less";
const LESS_OUTPUT = "dist/styles/100dos.css";

function listFiles(path: string): string[] {
  const stat = readdirSync(path, { withFileTypes: true, recursive: true }).filter((entry) => entry.isFile());
  return stat.map((entry) => join(entry.parentPath, entry.name));
}

// `vite build --watch` only rebuilds when a file registered with
// `this.addWatchFile()` changes. vite-plugin-static-copy's own chokidar
// watcher only runs under `configureServer` (Vite's dev server), which this
// build mode never invokes, so without this, edits under the directories it
// copies (templates/lang/assets) are silently never rebuilt.
function watchStaticCopySources(): Plugin {
  return {
    name: "watch-static-copy-sources",
    buildStart() {
      for (const source of STATIC_COPY_SOURCES) {
        const files = source.endsWith(".json") ? [source] : listFiles(source);
        for (const file of files) this.addWatchFile(file);
      }
    },
  };
}

// Compiles src/styles/100dos.less (which @imports every partial under
// src/styles/) into a single dist/styles/100dos.css, matching the fixed
// stylesheet path system.json's manifest expects. Not routed through Vite's
// own CSS-import pipeline (import "*.less" from a JS/TS module) because
// this stylesheet isn't imported by any module — it's delivered to Foundry
// as its own static file, the same way templates/lang/assets are.
function compileLess(): Plugin {
  return {
    name: "compile-less",
    buildStart() {
      for (const file of listFiles("src/styles")) this.addWatchFile(file);
    },
    async writeBundle() {
      const source = readFileSync(LESS_ENTRY, "utf-8");
      const result = await less.render(source, { filename: resolve(LESS_ENTRY) });
      mkdirSync(dirname(LESS_OUTPUT), { recursive: true });
      writeFileSync(LESS_OUTPUT, result.css);
    },
  };
}

export default defineConfig({
  build: {
    lib: {
      entry: "src/module/index.ts",
      formats: ["es"],
      fileName: () => "100dos.mjs",
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
  plugins: [
    watchStaticCopySources(),
    compileLess(),
    viteStaticCopy({
      targets: STATIC_COPY_SOURCES.map((src) => ({ src, dest: "." })),
    }),
  ],
});
