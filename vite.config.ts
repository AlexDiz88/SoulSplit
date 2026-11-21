import { defineConfig } from "vite";

/** GitHub Pages project site: /RepoName/ (задаётся в CI через VITE_BASE_PATH). */
const base = process.env.VITE_BASE_PATH ?? "/";

// Cursor/VS Code могут подставить свой BROWSER-скрипт (встроенный Simple Browser).
// Явно открываем системный Chrome при старте dev-сервера.
process.env.BROWSER = "chrome";

export default defineConfig({
  base,
  server: {
    host: true,
    open: true,
    // Любой Host из туннеля (bore, cloudflared, loca.lt и т.д.).
    allowedHosts: true,
  },
  build: {
    // Не инлайнить картинки в base64 - отдавать файлы как есть.
    assetsInlineLimit: 0,
  },
});
