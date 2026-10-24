/** Фон стартового меню из public/ - Vite отдаёт файл без обработки. */
export const MAIN_MENU_BG_URL = `${import.meta.env.BASE_URL}art/backgrounds/main_menu.png`;

/** Картинка фона как отдельный слой (чёще, чем CSS background + градиенты поверх). */
export function createMenuBackgroundImg(): HTMLImageElement {
  const img = document.createElement("img");
  img.className = "title-bg-img";
  img.src = MAIN_MENU_BG_URL;
  img.alt = "";
  img.draggable = false;
  img.decoding = "async";
  img.setAttribute("aria-hidden", "true");
  return img;
}
