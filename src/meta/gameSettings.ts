const SETTINGS_KEY = "soul_split_game_settings_v1";

export interface GameSettings {
  soundMuted: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  soundMuted: false,
};

function readRaw(): unknown {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function normalize(raw: unknown): GameSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  const o = raw as Record<string, unknown>;
  return {
    soundMuted: o.soundMuted === true,
  };
}

export function loadGameSettings(): GameSettings {
  return normalize(readRaw());
}

function persist(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* quota / private mode */
  }
}

export function isSoundMuted(): boolean {
  return loadGameSettings().soundMuted;
}

export function setSoundMuted(muted: boolean): GameSettings {
  const next: GameSettings = { ...loadGameSettings(), soundMuted: muted };
  persist(next);
  return next;
}