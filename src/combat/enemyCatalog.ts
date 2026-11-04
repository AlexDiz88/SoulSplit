import {
  FALLBACK_ENEMY_PORTRAIT,
  resolveEnemyPortraitUrl,
} from "../art/enemyPortraits";
import {
  ALL_ENEMY_DEFS,
  abilityIdsToBestiaryLabel,
  getEnemyDef,
  type EnemyDef,
} from "./enemyDefs";
import { rowsLabel } from "./enemies";

export interface EnemyCard {
  id: string;
  name: string;
  short: string;
  group: string;
  groupId: string;
  region: string;
  regionId: string;
  status: string;
  portrait: string;
  baseLevel: number;
  description: string;
  hp: number;
  atk: number;
  cd: string;
  reach: number;
  spawnRowsLabel: string;
  weapon: string;
  aspect: string;
  abilities: string;
  extra: string;
  portraitUrl: string;
}

function defToCard(def: EnemyDef): EnemyCard {
  return {
    id: def.id.replace(/_/g, "-"),
    name: def.name,
    short: def.short,
    group: def.group,
    groupId: def.groupId,
    region: def.region,
    regionId: def.regionId,
    status: def.status,
    portrait: def.portrait,
    baseLevel: def.baseLevel,
    description: def.description,
    hp: def.hp,
    atk: def.atk,
    cd: `${def.cd.toFixed(1)} с`,
    reach: def.reach,
    spawnRowsLabel: rowsLabel(def.spawnRows),
    weapon: def.weapon,
    aspect: def.aspect,
    abilities: abilityIdsToBestiaryLabel(def.abilities),
    extra: def.extra ?? "",
    portraitUrl: resolveEnemyPortraitUrl(def.portrait),
  };
}

let cached: EnemyCard[] | null = null;

export function loadEnemyCards(): EnemyCard[] {
  if (cached) return cached;
  cached = ALL_ENEMY_DEFS.map(defToCard);
  return cached;
}

/** Карточка бестиария по боевому id (`bandit_leader`) или kebab (`bandit-leader`). */
export function getEnemyCardById(id: string): EnemyCard | undefined {
  const def = getEnemyDef(id);
  return def ? defToCard(def) : undefined;
}

export function enemyPortraitUrl(card: EnemyCard): string {
  return resolveEnemyPortraitUrl(card.portrait) || card.portraitUrl || FALLBACK_ENEMY_PORTRAIT;
}
