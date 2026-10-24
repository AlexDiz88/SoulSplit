import goblinSpearUrl from "../../assets/art/enemies/goblin_spear.png";
import huntressUrl from "../../assets/art/enemies/huntress.png";
import skeletonGuardUrl from "../../assets/art/enemies/skeleton_guard.png";
import skeletonMageUrl from "../../assets/art/enemies/skeleton_mage.png";
import { Assets, type Texture } from "pixi.js";

export type HeroGender = "male" | "female";

/** Все портреты героя с префиксом hero_ - подхватываются автоматически. */
const heroPortraitModules = import.meta.glob<{ default: string }>(
  "../../assets/art/portraits/hero_*.{png,jpg,jpeg,webp}",
  { eager: true },
);

function genderFromPortraitPath(path: string): HeroGender | null {
  // female раньше male: иначе "female" ловится как male через подстроку.
  if (/hero_female(?:[-_.]|$)/i.test(path)) return "female";
  if (/hero_male(?:[-_.]|$)/i.test(path)) return "male";
  return null;
}

const HERO_PORTRAITS: { url: string; gender: HeroGender | null }[] = Object.entries(
  heroPortraitModules,
).map(([path, mod]) => ({
  url: mod.default,
  gender: genderFromPortraitPath(path) ?? genderFromPortraitPath(mod.default),
}));

const HERO_PORTRAIT_URLS = HERO_PORTRAITS.map((p) => p.url);

/** URL портретов врагов (герой - через pickRandomHeroPortraitUrl). */
export const PORTRAIT_URLS = {
  goblin_spear: goblinSpearUrl,
  skeleton_guard: skeletonGuardUrl,
  huntress: huntressUrl,
  skeleton_mage: skeletonMageUrl,
};

/** Настройки даунскейла: без mipmaps GPU семплит full-res и даёт зерно/кашу. */
const PORTRAIT_TEXTURE_DATA = {
  autoGenerateMipmaps: true,
  scaleMode: "linear" as const,
};

/** Все URL портретов героя (файлы hero_*). */
export function listHeroPortraitUrls(gender?: HeroGender): readonly string[] {
  if (!gender) return HERO_PORTRAIT_URLS;
  return HERO_PORTRAITS.filter((p) => p.gender === gender).map((p) => p.url);
}

/** Случайный портрет героя из папки portraits (файлы hero_*). */
export function pickRandomHeroPortraitUrl(gender?: HeroGender): string {
  const pool = listHeroPortraitUrls(gender);
  if (pool.length === 0) {
    throw new Error(
      gender
        ? `Нет портретов героя (${gender}): добавьте файлы hero_${gender}-* в assets/art/portraits`
        : "Нет портретов героя: добавьте файлы hero_* в assets/art/portraits",
    );
  }
  const index = Math.floor(Math.random() * pool.length);
  return pool[index]!;
}

export async function preloadPortraits(): Promise<void> {
  const entries: [string, string][] = [
    ...Object.entries(PORTRAIT_URLS),
    ...HERO_PORTRAIT_URLS.map((src, i) => [`hero_${i}`, src] as [string, string]),
  ];
  if (entries.length === 0) return;

  await Assets.load(
    entries.map(([id, src]) => ({
      alias: [`portrait:${id}`, src],
      src,
      data: PORTRAIT_TEXTURE_DATA,
    })),
  );

  for (const [, src] of entries) {
    sharpenPortraitTexture(Assets.get<Texture>(src));
  }
}

export function sharpenPortraitTexture(texture: Texture | undefined): void {
  if (!texture || !texture.source) return;
  const src = texture.source;
  src.autoGenerateMipmaps = true;
  src.scaleMode = "linear";
  src.magFilter = "linear";
  src.minFilter = "linear";
  src.mipmapFilter = "linear";
  src.updateMipmaps();
}
