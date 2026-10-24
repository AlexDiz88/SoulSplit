import type { Aspect } from "../types";

/** Канон: двадцать аспектов героя (см. `.cursor/skills/create-ability/aspects.md`). */
export const ALL_ASPECTS: readonly Aspect[] = [
  "alchemy",
  "arcane",
  "air",
  "beast",
  "earth",
  "illusion",
  "witchcraft",
  "blood",
  "ice",
  "mechanics",
  "lightning",
  "death",
  "fire",
  "nature",
  "mind",
  "light",
  "might",
  "stealth",
  "hunt",
  "dark",
] as const;

export const ASPECT_LABEL: Record<Aspect, string> = {
  alchemy: "Алхимия",
  arcane: "Аркан",
  air: "Воздух",
  beast: "Дух Зверя",
  earth: "Земля",
  illusion: "Иллюзии/Эфир",
  witchcraft: "Колдовство",
  blood: "Кровь",
  ice: "Лёд",
  mechanics: "Механика",
  lightning: "Молния",
  death: "Некромантия/Смерть",
  fire: "Огонь",
  nature: "Природа",
  mind: "Разум",
  light: "Свет",
  might: "Сила",
  stealth: "Скрытность",
  hunt: "Стрельба/Охота",
  dark: "Тьма",
};

/** Pixi / VFX (0xRRGGBB). */
export const ASPECT_COLOR: Record<Aspect, number> = {
  alchemy: 0x8aaa55,
  arcane: 0xc45ad4,
  air: 0xa8c8dc,
  beast: 0xd08a45,
  earth: 0xc4a06a,
  illusion: 0x8eb8d4,
  witchcraft: 0xa57ad4,
  blood: 0xd45454,
  ice: 0x7ec8e8,
  mechanics: 0xd0a060,
  lightning: 0xe6d36a,
  death: 0x8aaa78,
  fire: 0xff7a3d,
  nature: 0x6aaa62,
  mind: 0xe0a0c4,
  light: 0xf0e2b0,
  might: 0xc9b896,
  stealth: 0x9b7bb8,
  hunt: 0xa3b56a,
  dark: 0x8a74b0,
};

/** CSS hex для UI (гримуар, скилл-кнопки). */
export const ASPECT_HEX: Record<Aspect, string> = {
  alchemy: "#8aaa55",
  arcane: "#c45ad4",
  air: "#a8c8dc",
  beast: "#d08a45",
  earth: "#c4a06a",
  illusion: "#8eb8d4",
  witchcraft: "#a57ad4",
  blood: "#d45454",
  ice: "#7ec8e8",
  mechanics: "#d0a060",
  lightning: "#e6d36a",
  death: "#8aaa78",
  fire: "#ff7a3d",
  nature: "#6aaa62",
  mind: "#e0a0c4",
  light: "#f0e2b0",
  might: "#c9b896",
  stealth: "#9b7bb8",
  hunt: "#a3b56a",
  dark: "#8a74b0",
};

/** Старый id прототипа → актуальный. */
export const ASPECT_ID_REMAP: Record<string, Aspect> = {
  iron: "might",
};

export function remapAspectId(id: string): Aspect | null {
  if ((ALL_ASPECTS as readonly string[]).includes(id)) return id as Aspect;
  return ASPECT_ID_REMAP[id] ?? null;
}
