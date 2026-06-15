import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" makes the built app path-relative so the same /dist works on
// GitHub Pages project sites (https://user.github.io/repo/) without knowing
// the repo name ahead of time.
// PWA assets (manifest.json, sw.js, icons) live in /public so Vite copies
// them to the dist root verbatim — bundling would hash their filenames and
// break the manifest's icon paths and the sw.js registration URL.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
