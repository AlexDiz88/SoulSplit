import { defineConfig } from "vite";

/** GitHub Pages project site: /RepoName/ (задаётся в CI через VITE_BASE_PATH). */
const base = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base,
  server: {
    host: true,
    // Любой Host из туннеля (bore, cloudflared, loca.lt и т.д.).
    allowedHosts: true,
  },
  build: {
    // Не инлайнить картинки в base64 - отдавать файлы как есть.
    assetsInlineLimit: 0,
  },
});
