/**
 * Боевые SFX из assets/audio/sfx/.
 * Имя без расширения (stem); формат любой из поддерживаемых.
 */

type MeleeHitKind = "hero" | "enemy";

const sfxModules = import.meta.glob<{ default: string }>(
  "../../assets/audio/sfx/*.{ogg,mp3,wav,m4a,aac,webm,flac}",
  { eager: true },
);

const EXT_PRIORITY = ["ogg", "mp3", "m4a", "aac", "webm", "wav", "flac"] as const;

const AUDIO_EXTS = EXT_PRIORITY.join("|");
const STEM_RE = new RegExp(`\\.(${AUDIO_EXTS})$`, "i");

function fileStem(path: string): string {
  const file = path.split(/[/\\]/).pop() ?? "";
  return file.replace(STEM_RE, "");
}

function fileExt(path: string): string {
  const m = path.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "";
}

/** URL по stem. Если несколько форматов - берём предпочтительный. */
function resolveSfxUrl(stem: string): string | null {
  const needle = stem.toLowerCase();
  const hits = Object.entries(sfxModules)
    .filter(([path]) => fileStem(path).toLowerCase() === needle)
    .sort((a, b) => {
      const ai = EXT_PRIORITY.indexOf(fileExt(a[0]) as (typeof EXT_PRIORITY)[number]);
      const bi = EXT_PRIORITY.indexOf(fileExt(b[0]) as (typeof EXT_PRIORITY)[number]);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  return hits[0]?.[1]?.default ?? null;
}

const MELEE_STEM: Record<MeleeHitKind, string> = {
  hero: "melee_hit_hero",
  enemy: "melee_hit_enemy",
};

/** Разбудить аудио после жеста пользователя (клик / старт боя). */
export function unlockAudio(): void {
  // HTMLAudioElement сам разблокируется после user gesture;
  // держим API для вызовов из Battle.
  try {
    const warm = new Audio();
    warm.volume = 0;
    void warm.play().then(() => warm.pause()).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

/**
 * Короткий удар ближнего боя.
 * Файлы: assets/audio/sfx/melee_hit_hero.* и melee_hit_enemy.*
 */
export function playMeleeHit(kind: MeleeHitKind = "hero"): void {
  const url = resolveSfxUrl(MELEE_STEM[kind]);
  if (!url) {
    if (import.meta.env.DEV) {
      console.warn(
        `[sfx] Нет файла "${MELEE_STEM[kind]}.*" в assets/audio/sfx/ (ogg/mp3/wav/m4a/...)`,
      );
    }
    return;
  }
  const a = new Audio(url);
  a.volume = kind === "hero" ? 0.72 : 0.68;
  // Лёгкий разброс, чтобы частые удары не звучали как один луп.
  a.playbackRate = 0.96 + Math.random() * 0.08;
  void a.play().catch(() => {
    // Автоплей до жеста - молча; следующий удар после клика уже сыграет.
  });
}
