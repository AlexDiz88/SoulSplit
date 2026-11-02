/** Все UI-фоны из assets/art/backgrounds - png / jpg / jpeg / webp. */
const menuBgModules = import.meta.glob<{ default: string }>(
  "../../assets/art/backgrounds/*.{png,jpg,jpeg,webp}",
  { eager: true },
);

const EXT_PRIORITY = ["png", "jpg", "jpeg", "webp"] as const;

function fileStem(path: string): string {
  const file = path.split(/[/\\]/).pop() ?? "";
  return file.replace(/\.(png|jpe?g|webp)$/i, "");
}

function fileExt(path: string): string {
  const m = path.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "";
}

/** URL файла с точным именем stem (без расширения). Формат любой из поддерживаемых. */
function resolveAssetBgUrl(stem: string): string {
  const needle = stem.toLowerCase();
  const hits = Object.entries(menuBgModules)
    .filter(([path]) => fileStem(path).toLowerCase() === needle)
    .sort((a, b) => {
      const ai = EXT_PRIORITY.indexOf(fileExt(a[0]) as (typeof EXT_PRIORITY)[number]);
      const bi = EXT_PRIORITY.indexOf(fileExt(b[0]) as (typeof EXT_PRIORITY)[number]);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

  const url = hits[0]?.[1]?.default;
  if (!url) {
    throw new Error(
      `Нет фона "${stem}": положи файл в assets/art/backgrounds/${stem}.{png|jpg|jpeg|webp}`,
    );
  }
  return url;
}

export type TownTimeOfDay = "day" | "evening";

/** URL фона города по времени суток (`town-day` / `town-evening`). */
export function getTownBackgroundUrl(time: TownTimeOfDay): string {
  return resolveAssetBgUrl(time === "day" ? "town-day" : "town-evening");
}

/** Узкий портрет / телефон: те же брейкпоинты, что у HUD и Кодекса. */
export const PHONE_UI_MQ = "(max-width: 480px)";

export function isPhoneUi(): boolean {
  return window.matchMedia(PHONE_UI_MQ).matches;
}

/** Картинка фона как отдельный слой (чёще, чем CSS background + градиенты поверх). */
function createBackgroundImgFromUrl(src: string): HTMLImageElement {
  const img = document.createElement("img");
  img.className = "title-bg-img";
  img.src = src;
  img.alt = "";
  img.draggable = false;
  img.decoding = "async";
  img.setAttribute("aria-hidden", "true");
  return img;
}

function createBackgroundImgFromStem(stem: string): HTMLImageElement {
  return createBackgroundImgFromUrl(resolveAssetBgUrl(stem));
}

/** На телефоне не грузим main_menu - только фон из CSS. */
export function createMenuBackgroundImg(): HTMLImageElement | null {
  if (isPhoneUi()) return null;
  return createBackgroundImgFromStem("main_menu");
}

export function createTownBackgroundImg(): HTMLImageElement {
  return createBackgroundImgFromUrl(getTownBackgroundUrl("evening"));
}

export function createChooseSlotBackgroundImg(): HTMLImageElement {
  return createBackgroundImgFromStem("choose_slot_screen");
}

export function createWorldMapBackgroundImg(): HTMLImageElement {
  return createBackgroundImgFromStem("map_01");
}

/** URL портрета торговца (`weaponsmith`, `armorsmith`, `jeweler`, …). */
export function resolveMerchantPortraitUrl(stem: string): string {
  return resolveAssetBgUrl(stem);
}
