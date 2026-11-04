import { cloneQuestLog, createEmptyQuestLog } from "../quests/questLog";
import type { QuestLogState } from "../quests/types";
import {
  cloneHeroProfile,
  createNewHeroProfile,
  type HeroProfile,
  type NewHeroOptions,
} from "./heroProfile";
import { cloneMarketState, refreshMarketStock, type MarketState } from "./market";

export type ZoneId =
  | "north_road"
  | "witch_house"
  | "crossing"
  | "grey_fang_foothills"
  | "oak_grove"
  | "black_forest"
  | "miles_farm"
  | "mire"
  | "flooded_barn"
  | "willheim"
  | "stone_cliff"
  | "cursed_mine"
  | "south_meadow"
  | "bog_fangs"
  | "skull_stone"
  | "ruined_temple"
  | "abandoned_house"
  | "aria_hut"
  | "una_altar";

export const ALL_ZONE_IDS: readonly ZoneId[] = [
  "north_road",
  "witch_house",
  "crossing",
  "grey_fang_foothills",
  "oak_grove",
  "black_forest",
  "miles_farm",
  "mire",
  "flooded_barn",
  "willheim",
  "stone_cliff",
  "cursed_mine",
  "south_meadow",
  "bog_fangs",
  "skull_stone",
  "ruined_temple",
  "abandoned_house",
  "aria_hut",
  "una_altar",
] as const;

export interface GameState {
  hero: HeroProfile;
  unlockedZones: ZoneId[];
  lastZoneId: ZoneId | null;
  /** Ассортимент рынка (реролл после похода / кнопкой). */
  market: MarketState;
  /** Журнал квестов и пины трекера. */
  quests: QuestLogState;
}

export function createNewGameState(opts?: Partial<NewHeroOptions>): GameState {
  const state: GameState = {
    hero: createNewHeroProfile(opts),
    unlockedZones: [...ALL_ZONE_IDS],
    lastZoneId: null,
    market: cloneMarketState(null),
    quests: createEmptyQuestLog(),
  };
  refreshMarketStock(state);
  return state;
}

export function cloneGameState(src: GameState): GameState {
  return {
    hero: cloneHeroProfile(src.hero),
    unlockedZones: [...src.unlockedZones],
    lastZoneId: src.lastZoneId,
    market: cloneMarketState(src.market),
    quests: cloneQuestLog(src.quests),
  };
}
