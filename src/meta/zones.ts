import { ALL_ZONE_IDS, type ZoneId } from "./gameState";

/** Обязательный слот пачки (всегда в бою, тратит бюджет угрозы). */
export interface EncounterGuarantee {
  id: string;
  count: number;
}

/** Правила генерации пачки локации. */
export interface EncounterDef {
  /** Диапазон бюджета угрозы; на вход роллится одно значение. */
  threatBudget: [number, number];
  /** Пул для добора остатка бюджета. */
  pool: string[];
  /** Гарантированный минимум состава. */
  guarantee?: EncounterGuarantee[];
}

/** Точка внутри зоны: свой бюджет и пул врагов. */
export interface ZonePointDef {
  id: string;
  name: string;
  encounter: EncounterDef;
  /** Уровень предмета и скейл лута. */
  itemLevel: number;
  /** Шанс элитного модификатора на каждого врага (0 = нет). */
  eliteChance?: number;
}

export interface ZoneDef {
  id: ZoneId;
  name: string;
  description: string;
  /** Рекомендуемый уровень героя для открытия зоны. */
  minLevel: number;
  /** Названия квестов зоны (пока заглушки / будущий квестлог). */
  quests: string[];
  /** Stem арта превью в `assets/art/regions` (обычно = ZoneId). */
  previewStem: string;
  /** Точки внутри зоны. У разных зон разное число. */
  points: ZonePointDef[];
}

const NORTH_BANDITS_CORE = [
  "bandit_vagabond",
  "bandit_slinger",
  "bandit_magpie",
  "bandit_brigadier",
] as const;

/** Заглушка региона: без локаций и врагов, пока нет своего контента. */
function stubZone(
  id: ZoneId,
  name: string,
  description: string,
  minLevel = 1,
): ZoneDef {
  return {
    id,
    name,
    description,
    minLevel,
    quests: [],
    previewStem: id,
    points: [],
  };
}

export const ZONES: Record<ZoneId, ZoneDef> = {
  north_road: {
    id: "north_road",
    name: "Северная дорога",
    description: "Тракт от северных ворот. Редкие патрули и путники у стены.",
    minLevel: 1,
    quests: [],
    previewStem: "north_road",
    points: [
      {
        id: "wall",
        name: "У стены",
        encounter: {
          threatBudget: [3, 6],
          pool: ["bandit_vagabond", "bandit_slinger", "bandit_magpie"],
          guarantee: [
            { id: "bandit_vagabond", count: 1 },
            { id: "bandit_slinger", count: 1 },
          ],
        },
        itemLevel: 1,
      },
      {
        id: "crossroads",
        name: "Перекрёсток",
        encounter: {
          threatBudget: [8, 12],
          pool: [...NORTH_BANDITS_CORE],
        },
        itemLevel: 2,
      },
      {
        id: "thicket",
        name: "Перелесок",
        encounter: {
          threatBudget: [10, 14],
          pool: [
            "bandit_vagabond",
            "bandit_slinger",
            "bandit_magpie",
            "bandit_brigadier",
            "bandit_ravager",
          ],
          guarantee: [
            { id: "bandit_brigadier", count: 1 },
            { id: "bandit_ravager", count: 1 },
          ],
        },
        itemLevel: 2,
      },
      {
        id: "bandit_camp",
        name: "Лагерь бандитов",
        encounter: {
          threatBudget: [15, 20],
          pool: ["bandit_vagabond", "bandit_slinger", "bandit_magpie", "bandit_brigadier", "bandit_ravager"],
          guarantee: [
            { id: "bandit_ravager", count: 1 },
            { id: "bandit_brigadier", count: 1 },
            { id: "bandit_magpie", count: 2 },
            { id: "bandit_leader", count: 1 },
          ],
        },
        itemLevel: 3,
      },
    ],
  },
  witch_house: stubZone(
    "witch_house",
    "Ведьмин дом",
    "Старый двор у пруда на северо-западе. В амбаре пахнет травами и дымом.",
  ),
  crossing: stubZone(
    "crossing",
    "Переправа",
    "Узкий мост через реку. Здесь удобно ждать тех, кто спешит в Грейстоун.",
  ),
  grey_fang_foothills: stubZone(
    "grey_fang_foothills",
    "Предгорье Седого клыка",
    "Ельник в долине у Седого клыка. Холодный ветер с пиков и мало троп.",
  ),
  oak_grove: stubZone(
    "oak_grove",
    "Дубовая роща",
    "Одинокий островок дубов в поле к востоку от Грейстоуна.",
  ),
  black_forest: stubZone(
    "black_forest",
    "Черный лес",
    "Тёмный склон между рекой и горами. Под кронами почти нет света.",
  ),
  miles_farm: stubZone(
    "miles_farm",
    "Ферма Майлза",
    "Усадьба и длинные огороды на западном берегу реки.",
  ),
  mire: stubZone(
    "mire",
    "Топь",
    "Зелёная трясина на юге. Камни торчат из воды, как чужие зубы.",
  ),
  flooded_barn: stubZone(
    "flooded_barn",
    "Затопленный амбар",
    "Полусгнившая постройка у южного берега. Пол ушёл под воду.",
  ),
  willheim: stubZone(
    "willheim",
    "Уиллхейм",
    "Деревня у восточного озера: колесо, сарай и вечный костёр у воды.",
  ),
  stone_cliff: stubZone(
    "stone_cliff",
    "Каменный утёс",
    "Скалистый выступ над озером. Отсюда тропа уходит к горам.",
  ),
  cursed_mine: stubZone(
    "cursed_mine",
    "Проклятая шахта",
    "Тёмный зев в северо-восточной скале. Из лаза тянет сыростью и железом.",
  ),
  south_hills: stubZone(
    "south_hills",
    "Южные холмы",
    "Холмистый край на юго-востоке, южнее озера.",
  ),
  bog_fangs: stubZone(
    "bog_fangs",
    "Болотные клыки",
    "Острые камни и лазы в юго-западной топи.",
  ),
  quarry: stubZone(
    "quarry",
    "Каменоломня",
    "Каменный карьер у южной трясины. Обрывы, осыпи и старые выработки.",
  ),
  ruins: {
    id: "ruins",
    name: "Руины",
    description: "Старые катакомбы. Враги крепче, лут заметно лучше.",
    minLevel: 1,
    quests: [],
    previewStem: "ruins",
    points: [
      {
        id: "courtyard",
        name: "Двор",
        encounter: {
          threatBudget: [10, 18],
          pool: ["goblin_spear", "skeleton_guard", "huntress", "skeleton_mage"],
        },
        itemLevel: 3,
        eliteChance: 0.05,
      },
      {
        id: "catacombs",
        name: "Катакомбы",
        encounter: {
          threatBudget: [14, 24],
          pool: ["skeleton_guard", "skeleton_mage", "huntress"],
        },
        itemLevel: 4,
        eliteChance: 0.08,
      },
    ],
  },
  aria_hut: stubZone(
    "aria_hut",
    "Хижина Арии",
    "Одинокий дом у кромки юго-западного болота, рядом со старыми камнями.",
  ),
  outpost: stubZone(
    "outpost",
    "Аванпост",
    "Форпост у тракта к северу от стен. Здесь ещё держат дозор.",
  ),
  karos_ruined_temple: stubZone(
    "karos_ruined_temple",
    "Разрушенный храм Кароса",
    "Обломки храма Кароса. Камни помнят службу, которую давно бросили.",
  ),
  hart_manor: stubZone(
    "hart_manor",
    "Поместье Харт",
    "Старое владение семьи Харт. Двор ещё цел, но хозяева давно молчат.",
  ),
  northville: stubZone(
    "northville",
    "Нортвилл",
    "Северная деревня у тракта. Здесь ещё ждут обозы из Грейстоуна.",
  ),
  riverholt: stubZone(
    "riverholt",
    "Риверхолт",
    "Поселение у реки и брода. Мокрые причалы и запах тины.",
  ),
  moon_lake: stubZone(
    "moon_lake",
    "Лунное озеро",
    "Тихая вода на востоке провинции. Ночью зеркало, днём - серая гладь.",
  ),
};

/** Id врагов локации: пул ∪ guarantee (для UI). */
export function encounterEnemyIds(point: ZonePointDef): string[] {
  const ids = new Set(point.encounter.pool);
  for (const g of point.encounter.guarantee ?? []) ids.add(g.id);
  return [...ids];
}

export function getZone(id: ZoneId): ZoneDef {
  return ZONES[id];
}

export function getZonePoint(zone: ZoneDef, pointId?: string | null): ZonePointDef | null {
  if (pointId) {
    const found = zone.points.find((p) => p.id === pointId);
    if (found) return found;
  }
  return zone.points[0] ?? null;
}

export function isZoneUnlocked(id: ZoneId, heroLevel: number, unlocked: ZoneId[]): boolean {
  if (!unlocked.includes(id)) return false;
  return heroLevel >= getZone(id).minLevel;
}

export function syncUnlockedZones(_heroLevel: number, unlocked: ZoneId[]): ZoneId[] {
  const next = new Set<ZoneId>(unlocked);
  for (const id of ALL_ZONE_IDS) next.add(id);
  return [...next];
}
