import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

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
    viteStaticCopy({
      targets: [
        { src: "static/system.json", dest: "." },
        { src: "src/templates", dest: "." },
        { src: "src/lang", dest: "." },
        { src: "src/assets", dest: "." },
        { src: "src/styles", dest: "." },
      ],
    }),
  ],
});
