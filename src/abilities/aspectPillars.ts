import type { Aspect } from "../types";
import { ASPECT_LABEL } from "./aspects";

/** Столбы школ: канон из design/meta/ASPECTS.md (ориентир для генерации). */
export type AspectPillarRow = {
  aspectId: Aspect;
  /** Урон (тег) */
  damageTag: string;
  /** DoT / длительное */
  dot: string;
  /** Контроль / темп */
  control: string;
  /** Защита / себя */
  defense: string;
  /** Метки и крючки внутри школы */
  hooks: string;
};

export const ASPECT_PILLAR_ROWS: readonly AspectPillarRow[] = [
  {
    aspectId: "fire",
    damageTag: "огонь",
    dot: "горение",
    control: "взрыв, след на клетке",
    defense: "-",
    hooks: "горящая клетка",
  },
  {
    aspectId: "ice",
    damageTag: "лёд",
    dot: "редко",
    control: "slow, root, хрупкость",
    defense: "щит",
    hooks: '"на льду" / shattered',
  },
  {
    aspectId: "lightning",
    damageTag: "молния",
    dot: "редко",
    control: "цепь, прыжок по клеткам",
    defense: "перегрузка (след. каст)",
    hooks: "шок (+15%/стак, только урон Молнии)",
  },
  {
    aspectId: "air",
    damageTag: "воздух",
    dot: "поле-тик (смерч и т.п.)",
    control: "отброс, slow",
    defense: "haste",
    hooks: "позиция на сетке",
  },
  {
    aspectId: "earth",
    damageTag: "земля",
    dot: "шип / поле",
    control: "тяжёлый slow",
    defense: "броня, щит",
    hooks: "закреплён",
  },
  {
    aspectId: "nature",
    damageTag: "природа, яд",
    dot: "яд",
    control: "root, удержание",
    defense: "реген",
    hooks: "лоза на клетке",
  },
  {
    aspectId: "alchemy",
    damageTag: "кислота",
    dot: "кислота",
    control: "ослабление атаки",
    defense: "эликсир HP",
    hooks: "катализ (переплавка любого DoT)",
  },
  {
    aspectId: "blood",
    damageTag: "кровь",
    dot: "кровотечение",
    control: "-",
    defense: "сила при низком HP, лечение от раны",
    hooks: "цена своим HP",
  },
  {
    aspectId: "death",
    damageTag: "смерть",
    dot: 'drain / "жизнь"',
    control: "страх",
    defense: "-",
    hooks: "труп на клетке, порог добивания",
  },
  {
    aspectId: "dark",
    damageTag: "тьма",
    dot: "редко",
    control: 'зона "бьют реже"',
    defense: "вампиризм",
    hooks: "слабость",
  },
  {
    aspectId: "light",
    damageTag: "свет",
    dot: "-",
    control: "ослепление",
    defense: "лечение, барьер, снятие 1 дебаффа",
    hooks: "бонус vs тьма / нежить",
  },
  {
    aspectId: "arcane",
    damageTag: "аркан",
    dot: "нестабильный тик",
    control: "сдвиг по клетке",
    defense: "мана-щит",
    hooks: "разрыв",
  },
  {
    aspectId: "illusion",
    damageTag: "эфир",
    dot: "редко",
    control: "промах",
    defense: "двойник (1 удар)",
    hooks: "удар в пустую клетку",
  },
  {
    aspectId: "mind",
    damageTag: "разум, часто без урона",
    dot: "-",
    control: "страх, charm, stun",
    defense: "-",
    hooks: "смена фокуса цели",
  },
  {
    aspectId: "witchcraft",
    damageTag: "порча",
    dot: "порча (накопление → срыв)",
    control: "связка двух врагов",
    defense: "-",
    hooks: "hex на пару",
  },
  {
    aspectId: "mechanics",
    damageTag: "механика",
    dot: "турель-тик",
    control: "капкан",
    defense: "-",
    hooks: "устройство на клетке",
  },
  {
    aspectId: "beast",
    damageTag: "физический",
    dot: "-",
    control: "рев (−atk)",
    defense: "шкура",
    hooks: "метка добычи (+урон Зверя)",
  },
  {
    aspectId: "might",
    damageTag: "физический",
    dot: "-",
    control: "stun, отброс телом",
    defense: "atk buff",
    hooks: "деморализация",
  },
  {
    aspectId: "stealth",
    damageTag: "физический",
    dot: "кровотечение",
    control: "невидимость на каст",
    defense: "-",
    hooks: "слепая зона, удар по метке",
  },
  {
    aspectId: "hunt",
    damageTag: "физический",
    dot: "капкан-тик",
    control: "метка",
    defense: "-",
    hooks: "метка охоты, дальность",
  },
] as const;

export function aspectSchoolLabel(aspectId: Aspect): string {
  return ASPECT_LABEL[aspectId];
}
