import femaleFrostPortraitUrl from "../../assets/art/portraits/female_frost_01.png";
import goblinSpearUrl from "../../assets/art/enemies/goblin_spear.png";
import huntressUrl from "../../assets/art/enemies/huntress.png";
import skeletonGuardUrl from "../../assets/art/enemies/skeleton_guard.png";
import skeletonMageUrl from "../../assets/art/enemies/skeleton_mage.png";
import { Assets, type Texture } from "pixi.js";

/** URL портретов для юнитов. */
export const PORTRAIT_URLS = {
  aira: femaleFrostPortraitUrl,
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

export async function preloadPortraits(): Promise<void> {
  const urls = Object.entries(PORTRAIT_URLS);
  if (urls.length === 0) return;

  await Assets.load(
    urls.map(([id, src]) => ({
      alias: [`portrait:${id}`, src],
      src,
      data: PORTRAIT_TEXTURE_DATA,
    })),
  );

  for (const [, src] of urls) {
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
