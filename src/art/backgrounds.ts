import { Assets, type Texture } from "pixi.js";

/** Все файлы из assets/art/backgrounds - подхватываются автоматически. */
const backgroundModules = import.meta.glob<{ default: string }>(
  "../../assets/art/backgrounds/*.{png,jpg,jpeg,webp}",
  { eager: true },
);

function fileName(path: string): string {
  return path.split(/[/\\]/).pop()?.toLowerCase() ?? "";
}

/** Боевые фоны: только `battle_location*`. */
const BATTLE_BACKGROUND_URLS = Object.entries(backgroundModules)
  .filter(([path]) => fileName(path).startsWith("battle_location"))
  .map(([, mod]) => mod.default);

const BACKGROUND_TEXTURE_DATA = {
  autoGenerateMipmaps: true,
  scaleMode: "linear" as const,
};

/** Случайный URL боевого фона. */
export function pickRandomBackgroundUrl(): string {
  if (BATTLE_BACKGROUND_URLS.length === 0) {
    throw new Error(
      "Нет боевых фонов: добавьте assets/art/backgrounds/battle_location*.{png|jpg|jpeg|webp}",
    );
  }
  const index = Math.floor(Math.random() * BATTLE_BACKGROUND_URLS.length);
  return BATTLE_BACKGROUND_URLS[index]!;
}

export async function preloadBackgrounds(): Promise<void> {
  if (BATTLE_BACKGROUND_URLS.length === 0) return;

  await Assets.load(
    BATTLE_BACKGROUND_URLS.map((src, i) => ({
      alias: [`background:${i}`, src],
      src,
      data: BACKGROUND_TEXTURE_DATA,
    })),
  );
}

export function getBackgroundTexture(url: string): Texture {
  return Assets.get<Texture>(url);
}
