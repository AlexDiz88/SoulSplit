import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    // Туннели для превью с телефона (cloudflared, localtunnel).
    allowedHosts: [".trycloudflare.com", ".loca.lt"],
  },
  build: {
    // Не инлайнить картинки в base64 - отдавать файлы как есть.
    assetsInlineLimit: 0,
  },
});
