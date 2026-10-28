import { defineConfig } from "vite";

export default defineConfig({
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
