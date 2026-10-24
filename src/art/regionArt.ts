/** Превью регионов: `assets/art/regions/{zoneId}.{png|jpg|jpeg|webp}`. */
const regionModules = import.meta.glob<{ default: string }>(
  "../../assets/art/regions/*.{png,jpg,jpeg,webp}",
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

/** URL арта региона по stem (= ZoneId). `null`, если файла нет. */
export function tryResolveRegionArtUrl(stem: string): string | null {
  const needle = stem.toLowerCase();
  const hits = Object.entries(regionModules)
    .filter(([path]) => fileStem(path).toLowerCase() === needle)
    .sort((a, b) => {
      const ai = EXT_PRIORITY.indexOf(fileExt(a[0]) as (typeof EXT_PRIORITY)[number]);
      const bi = EXT_PRIORITY.indexOf(fileExt(b[0]) as (typeof EXT_PRIORITY)[number]);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

  return hits[0]?.[1]?.default ?? null;
}
