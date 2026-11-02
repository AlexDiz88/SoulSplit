import type { Aspect } from "../types";
import { ASPECT_LABEL } from "./aspects";

/** Столбы школ: канон из design/meta/ASPECTS.md (ориентир для генерации). */
export type AspectPillarRow = {
  aspectId: Aspect;
  /** Вкус урона (внутренний ярлык, не показывать в UI кодекса) */
  damageTag: string;
  /** DoT / длительное */
  dot: string;
  /** Эффекты */
  control: string;
  /** Защита / Восстановление */
  defense: string;
  /** Особенности / Назначение */
  hooks: string;
};

export const ASPECT_PILLAR_ROWS: readonly AspectPillarRow[] = [
  {
    aspectId: "fire",
    damageTag: "огонь",
    dot: "горение",
    control: "AoE-урон, длительный урон по клетке",
    defense: "снижение % физ. и маг. урона и урон в ответ",
    hooks: "одновременный урон по нескольким целям",
  },
  {
    aspectId: "ice",
    damageTag: "лёд",
    dot: "-",
    control: "замедление, обездвиживание, оглушение",
    defense: "поглощение урона и замедление в ответ, неуязвимость",
    hooks: "снижение атакующих возможностей цели",
  },
  {
    aspectId: "lightning",
    damageTag: "молния",
    dot: "-",
    control: "урон по цепи, шок",
    defense: "-",
    hooks: "возрастающий урон по цели при повторных применениях",
  },
  {
    aspectId: "air",
    damageTag: "воздух",
    dot: "движущийся урон поля",
    control: "замедление, смещение позиций",
    defense: "ускорение атак",
    hooks: "манипуляции позициями, мгновенное применение",
  },
  {
    aspectId: "earth",
    damageTag: "земля",
    dot: "урон поля",
    control: "замедление, оглушение",
    defense: "повышение брони, щит с поглощением урона",
    hooks: "стабильный урон",
  },
  {
    aspectId: "nature",
    damageTag: "природа, яд",
    dot: "яд в цель",
    control: "обездвиживание, замедление, суммон, тотемы",
    defense: "постепенное лечение",
    hooks: "универсальность",
  },
  {
    aspectId: "alchemy",
    damageTag: "кислота",
    dot: "урон поля",
    control: "ослабление урона и защиты",
    defense: "лечение с эффектом",
    hooks: "усиление периодического урона",
  },
  {
    aspectId: "blood",
    damageTag: "кровь",
    dot: "кровотечение в цель",
    control: "повышение урона в цель",
    defense: "вампиризм",
    hooks: "трата своего здоровья за усиление",
  },
  {
    aspectId: "necromancy",
    damageTag: "смерть",
    dot: "разложение цели",
    control: "суммон",
    defense: "вытягивание жизни",
    hooks: "поглощение призванных существ",
  },
  {
    aspectId: "dark",
    damageTag: "тьма",
    dot: "-",
    control: "AoE-воздействия и урон, страх, паралич",
    defense: "бестелесность",
    hooks: "массовое управление толпой",
  },
  {
    aspectId: "light",
    damageTag: "свет",
    dot: "-",
    control: "ослепление, оглушение",
    defense: "щит, лечение, регенерация, усиления, очищение",
    hooks: "выживание, слабый урон",
  },
  {
    aspectId: "arcane",
    damageTag: "аркан",
    dot: "нестабильный урон в цель",
    control: "AoE-урон, прерывание каста, смещение",
    defense: "мана-щит, восстановление маны",
    hooks: "накопление усиления при множественных кастах (повышенный расход маны)",
  },
  {
    aspectId: "illusion",
    damageTag: "эфир",
    dot: "-",
    control: "промах, очарование, суммон",
    defense: "неуязвимость, повышение уворота",
    hooks: "выживаемость",
  },
  {
    aspectId: "mind",
    damageTag: "разум, часто без урона",
    dot: "в цель",
    control: "подчинение, молчание, AoE-страх / ослепление",
    defense: "-",
    hooks: "контроль толпы",
  },
  {
    aspectId: "witchcraft",
    damageTag: "порча",
    dot: "порча (растущий урон), перенос на новую цель",
    control: "цепные DoT, превращение, связывание врагов (link)",
    defense: "обмен маны на здоровье",
    hooks: "накапливающийся AoE-урон",
  },
  {
    aspectId: "mechanics",
    damageTag: "механика",
    dot: "зоны DoT",
    control: "суммон, бомбы, мины",
    defense: "снижение % физ. урона, дрон-защитник",
    hooks: "урон с задержкой, использование поля боя",
  },
  {
    aspectId: "beast",
    damageTag: "физический",
    dot: "кровотечение в цель",
    control: "усиление себя, массовое ослабление врагов, снижение брони, добивание",
    defense: "снижение % физ. и маг. урона, возврат урона (шипы), трансформация",
    hooks: "режим оборотня, выживание, скорость атаки",
  },
  {
    aspectId: "might",
    damageTag: "физический",
    dot: "-",
    control: "AoE-оглушение, притягивание, снижение лечения",
    defense: "отражение заклинаний, повышенный блок",
    hooks: "стабильный урон, выживание",
  },
  {
    aspectId: "stealth",
    damageTag: "физический",
    dot: "кровотечение в цель",
    control: "молчание, стаки DoT, 100% крит, ускорение",
    defense:
      "увертливость от физ. атак, уход в тень (временная неуязвимость и усиленный первый удар)",
    hooks: "урон и контроль одной цели, скорость атаки, криты",
  },
  {
    aspectId: "hunt",
    damageTag: "физический",
    dot: "урон поля после активации (капкан)",
    control: "суммон, метка",
    defense: "-",
    hooks: "разнообразный суммон, урон в цель",
  },
] as const;

export function aspectSchoolLabel(aspectId: Aspect): string {
  return ASPECT_LABEL[aspectId];
}
