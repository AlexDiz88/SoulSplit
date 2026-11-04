const portraitModules = import.meta.glob("../../assets/art/enemies/*.{png,jpg,jpeg,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const PORTRAITS: Record<string, string> = {};
for (const [path, url] of Object.entries(portraitModules)) {
  const file = path.replaceAll("\\", "/").split("/").pop() ?? "";
  PORTRAITS[file] = url;
  PORTRAITS[file.replace(/\.(png|jpe?g|webp)$/i, "")] = url;
}

export const FALLBACK_ENEMY_PORTRAIT =
  PORTRAITS["no_image.png"] ?? PORTRAITS["no_image"] ?? "";

/** URL портрета по имени файла или stem (`skeleton_king.png` / `skeleton_king`). */
export function resolveEnemyPortraitUrl(portrait: string): string {
  if (!portrait) return FALLBACK_ENEMY_PORTRAIT;
  return (
    PORTRAITS[portrait] ??
    PORTRAITS[portrait.replace(/\.(png|jpe?g|webp)$/i, "")] ??
    FALLBACK_ENEMY_PORTRAIT
  );
}
