import { Assets, type Texture } from "pixi.js";

/** Все фоны из assets/art/backgrounds - подхватываются автоматически. */
const backgroundModules = import.meta.glob<{ default: string }>(
  "../../assets/art/backgrounds/*.{png,jpg,jpeg,webp}",
  { eager: true },
);

function isMenuBackground(path: string): boolean {
  const file = path.split(/[/\\]/).pop()?.toLowerCase() ?? "";
  return file.startsWith("main_menu");
}

const ALL_BACKGROUND_ENTRIES = Object.entries(backgroundModules).map(([path, mod]) => ({
  path,
  url: mod.default,
  menu: isMenuBackground(path),
}));

/** Боевые фоны (без стартового меню). */
const BATTLE_BACKGROUND_URLS = ALL_BACKGROUND_ENTRIES.filter((e) => !e.menu).map((e) => e.url);

const BACKGROUND_TEXTURE_DATA = {
  autoGenerateMipmaps: true,
  scaleMode: "linear" as const,
};

/** Случайный URL боевого фона. */
export function pickRandomBackgroundUrl(): string {
  if (BATTLE_BACKGROUND_URLS.length === 0) {
    throw new Error("Нет фонов: добавьте файлы в assets/art/backgrounds");
  }
  const index = Math.floor(Math.random() * BATTLE_BACKGROUND_URLS.length);
  return BATTLE_BACKGROUND_URLS[index]!;
}

export async function preloadBackgrounds(): Promise<void> {
  const urls = ALL_BACKGROUND_ENTRIES.map((e) => e.url);
  if (urls.length === 0) return;

  await Assets.load(
    urls.map((src, i) => ({
      alias: [`background:${i}`, src],
      src,
      data: BACKGROUND_TEXTURE_DATA,
    })),
  );
}

export function getBackgroundTexture(url: string): Texture {
  return Assets.get<Texture>(url);
}
