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

/** Пул фонов города: `town-day`, `town-evening`, … */
function isTownPoolStem(stem: string): boolean {
  return stem.toLowerCase().startsWith("town-");
}

const TOWN_BACKGROUND_URLS = (() => {
  const byStem = new Map<string, { ext: string; url: string }>();
  for (const [path, mod] of Object.entries(menuBgModules)) {
    const stem = fileStem(path);
    if (!isTownPoolStem(stem)) continue;
    const key = stem.toLowerCase();
    const ext = fileExt(path);
    const prev = byStem.get(key);
    const ai = EXT_PRIORITY.indexOf(ext as (typeof EXT_PRIORITY)[number]);
    const bi = prev
      ? EXT_PRIORITY.indexOf(prev.ext as (typeof EXT_PRIORITY)[number])
      : 99;
    if (!prev || (ai < 0 ? 99 : ai) < (bi < 0 ? 99 : bi)) {
      byStem.set(key, { ext, url: mod.default });
    }
  }
  return [...byStem.values()].map((v) => v.url);
})();

/** Случайный URL фона города (`town-day`, `town-evening`, …). */
export function pickRandomTownBackgroundUrl(): string {
  if (TOWN_BACKGROUND_URLS.length === 0) {
    throw new Error(
      "Нет фона города: положи assets/art/backgrounds/town-day|town-evening.{png|jpg|jpeg|webp}",
    );
  }
  const index = Math.floor(Math.random() * TOWN_BACKGROUND_URLS.length);
  return TOWN_BACKGROUND_URLS[index]!;
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

export function createMenuBackgroundImg(): HTMLImageElement {
  return createBackgroundImgFromStem("main_menu");
}

export function createTownBackgroundImg(): HTMLImageElement {
  return createBackgroundImgFromUrl(pickRandomTownBackgroundUrl());
}

export function createChooseSlotBackgroundImg(): HTMLImageElement {
  return createBackgroundImgFromStem("choose_slot_screen");
}

export function createWorldMapBackgroundImg(): HTMLImageElement {
  return createBackgroundImgFromStem("map_01");
}

/** URL портрета торговца (`weaponsmith`, `armorsmith`, …). */
export function resolveMerchantPortraitUrl(stem: string): string {
  return resolveAssetBgUrl(stem);
}
