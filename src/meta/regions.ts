import { ALL_REGION_IDS, type RegionId } from "./gameState";

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

/** Локация внутри региона: свой бюджет и пул врагов. */
export interface LocationDef {
  id: string;
  name: string;
  encounter: EncounterDef;
  /** Уровень предмета и скейл лута. */
  itemLevel: number;
  /** Шанс элитного модификатора на каждого врага (0 = нет). */
  eliteChance?: number;
}

export interface RegionDef {
  id: RegionId;
  name: string;
  description: string;
  /** Рекомендуемый уровень героя для открытия региона. */
  minLevel: number;
  /** Названия квестов региона (пока заглушки / будущий квестлог). */
  quests: string[];
  /** Stem арта превью в `assets/art/regions` (обычно = RegionId). */
  previewStem: string;
  /** Локации внутри региона. У разных регионов разное число. */
  locations: LocationDef[];
}

const NORTH_BANDITS_CORE = [
  "bandit_vagabond",
  "bandit_slinger",
  "bandit_magpie",
  "bandit_brigadier",
] as const;

/** Заглушка региона: без локаций и врагов, пока нет своего контента. */
function stubRegion(
  id: RegionId,
  name: string,
  description: string,
  minLevel = 1,
): RegionDef {
  return {
    id,
    name,
    description,
    minLevel,
    quests: [],
    previewStem: id,
    locations: [],
  };
}

export const REGIONS: Record<RegionId, RegionDef> = {
  north_road: {
    id: "north_road",
    name: "Северная дорога",
    description: "Тракт от северных ворот. Редкие патрули и путники у стены.",
    minLevel: 1,
    quests: [],
    previewStem: "north_road",
    locations: [
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
  witch_house: stubRegion(
    "witch_house",
    "Ведьмин дом",
    "Старый двор у пруда на северо-западе. В амбаре пахнет травами и дымом.",
  ),
  crossing: stubRegion(
    "crossing",
    "Переправа",
    "Узкий мост через реку. Здесь удобно ждать тех, кто спешит в Грейстоун.",
  ),
  grey_fang_foothills: stubRegion(
    "grey_fang_foothills",
    "Предгорье Седого клыка",
    "Ельник в долине у Седого клыка. Холодный ветер с пиков и мало троп.",
  ),
  oak_grove: stubRegion(
    "oak_grove",
    "Дубовая роща",
    "Одинокий островок дубов в поле к востоку от Грейстоуна.",
  ),
  black_forest: stubRegion(
    "black_forest",
    "Черный лес",
    "Тёмный склон между рекой и горами. Под кронами почти нет света.",
  ),
  miles_farm: stubRegion(
    "miles_farm",
    "Ферма Майлза",
    "Усадьба и длинные огороды на западном берегу реки.",
  ),
  mire: stubRegion(
    "mire",
    "Топь",
    "Зелёная трясина на юге. Камни торчат из воды, как чужие зубы.",
  ),
  flooded_barn: stubRegion(
    "flooded_barn",
    "Затопленный амбар",
    "Полусгнившая постройка у южного берега. Пол ушёл под воду.",
  ),
  willheim: stubRegion(
    "willheim",
    "Уиллхейм",
    "Деревня у восточного озера: колесо, сарай и вечный костёр у воды.",
  ),
  stone_cliff: stubRegion(
    "stone_cliff",
    "Каменный утёс",
    "Скалистый выступ над озером. Отсюда тропа уходит к горам.",
  ),
  cursed_mine: stubRegion(
    "cursed_mine",
    "Проклятая шахта",
    "Тёмный зев в северо-восточной скале. Из лаза тянет сыростью и железом.",
  ),
  south_hills: stubRegion(
    "south_hills",
    "Южные холмы",
    "Холмистый край на юго-востоке, южнее озера.",
  ),
  bog_fangs: stubRegion(
    "bog_fangs",
    "Болотные клыки",
    "Острые камни и лазы в юго-западной топи.",
  ),
  quarry: stubRegion(
    "quarry",
    "Каменоломня",
    "Каменный карьер у южной трясины. Обрывы, осыпи и старые выработки.",
  ),
  ruins: {
    id: "ruins",
    name: "Руины",
    description: "Старые камни и катакомбы. Чем глубже, тем крепче кости.",
    minLevel: 1,
    quests: [],
    previewStem: "ruins",
    locations: [
      {
        id: "courtyard",
        name: "Двор",
        encounter: {
          threatBudget: [8, 10],
          pool: ["scavenger", "wandering", "skeleton_archer"],
        },
        itemLevel: 3,
        eliteChance: 0.05,
      },
      {
        id: "lower_tier",
        name: "Нижний ярус",
        encounter: {
          threatBudget: [11, 13],
          pool: ["scavenger", "wandering", "skeleton_archer", "skeleton_guard"],
        },
        itemLevel: 4,
        eliteChance: 0.06,
      },
      {
        id: "catacombs",
        name: "Катакомбы",
        encounter: {
          threatBudget: [14, 16],
          pool: [
            "wandering",
            "skeleton_archer",
            "skeleton_guard",
            "skeleton_spearman",
            "skeleton_mage",
          ],
        },
        itemLevel: 5,
        eliteChance: 0.08,
      },
      {
        id: "crypt",
        name: "Склеп",
        encounter: {
          threatBudget: [19, 21],
          pool: [
            "skeleton_guard",
            "skeleton_archer",
            "skeleton_spearman",
            "skeleton_mage",
          ],
          guarantee: [{ id: "skeleton_king", count: 1 }],
        },
        itemLevel: 6,
        eliteChance: 0.1,
      },
    ],
  },
  aria_hut: stubRegion(
    "aria_hut",
    "Хижина Арии",
    "Одинокий дом у кромки юго-западного болота, рядом со старыми камнями.",
  ),
  outpost: stubRegion(
    "outpost",
    "Аванпост",
    "Форпост у тракта к северу от стен. Здесь ещё держат дозор.",
  ),
  karos_ruined_temple: stubRegion(
    "karos_ruined_temple",
    "Разрушенный храм Кароса",
    "Обломки храма Кароса. Камни помнят службу, которую давно бросили.",
  ),
  hart_manor: stubRegion(
    "hart_manor",
    "Поместье Харт",
    "Старое владение семьи Харт. Двор ещё цел, но хозяева давно молчат.",
  ),
  northville: stubRegion(
    "northville",
    "Нортвилл",
    "Северная деревня у тракта. Здесь ещё ждут обозы из Грейстоуна.",
  ),
  riverholt: stubRegion(
    "riverholt",
    "Риверхолт",
    "Поселение у реки и брода. Мокрые причалы и запах тины.",
  ),
  moon_lake: stubRegion(
    "moon_lake",
    "Лунное озеро",
    "Тихая вода на востоке провинции. Ночью зеркало, днём - серая гладь.",
  ),
};

/** Id врагов локации: пул ∪ guarantee (для UI). */
export function encounterEnemyIds(location: LocationDef): string[] {
  const ids = new Set(location.encounter.pool);
  for (const g of location.encounter.guarantee ?? []) ids.add(g.id);
  return [...ids];
}

export function getRegion(id: RegionId): RegionDef {
  return REGIONS[id];
}

export function getLocation(region: RegionDef, locationId?: string | null): LocationDef | null {
  if (locationId) {
    const found = region.locations.find((loc) => loc.id === locationId);
    if (found) return found;
  }
  return region.locations[0] ?? null;
}

export function isRegionUnlocked(id: RegionId, heroLevel: number, unlocked: RegionId[]): boolean {
  if (!unlocked.includes(id)) return false;
  return heroLevel >= getRegion(id).minLevel;
}

export function syncUnlockedRegions(_heroLevel: number, unlocked: RegionId[]): RegionId[] {
  const next = new Set<RegionId>(unlocked);
  for (const id of ALL_REGION_IDS) next.add(id);
  return [...next];
}
