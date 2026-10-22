import { Assets, type Texture } from "pixi.js";

/** Все фоны из assets/art/backgrounds — подхватываются автоматически. */
const backgroundModules = import.meta.glob<{ default: string }>(
  "../../assets/art/backgrounds/*.{png,jpg,jpeg,webp}",
  { eager: true },
);

const BACKGROUND_URLS = Object.values(backgroundModules).map((m) => m.default);

const BACKGROUND_TEXTURE_DATA = {
  autoGenerateMipmaps: true,
  scaleMode: "linear" as const,
};

/** Случайный URL фона из папки backgrounds. */
export function pickRandomBackgroundUrl(): string {
  if (BACKGROUND_URLS.length === 0) {
    throw new Error("Нет фонов: добавьте файлы в assets/art/backgrounds");
  }
  const index = Math.floor(Math.random() * BACKGROUND_URLS.length);
  return BACKGROUND_URLS[index]!;
}

export async function preloadBackgrounds(): Promise<void> {
  if (BACKGROUND_URLS.length === 0) return;

  await Assets.load(
    BACKGROUND_URLS.map((src, i) => ({
      alias: [`background:${i}`, src],
      src,
      data: BACKGROUND_TEXTURE_DATA,
    })),
  );
}

export function getBackgroundTexture(url: string): Texture {
  return Assets.get<Texture>(url);
}
