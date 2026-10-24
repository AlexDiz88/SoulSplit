import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
  },
  build: {
    // Не инлайнить картинки в base64 - отдавать файлы как есть.
    assetsInlineLimit: 0,
  },
});
