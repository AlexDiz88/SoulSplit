import {
  cloneHeroProfile,
  createNewHeroProfile,
  type HeroProfile,
  type NewHeroOptions,
} from "./heroProfile";
import { cloneMarketState, refreshMarketStock, type MarketState } from "./market";

export type ZoneId = "north_road" | "ruins";

export interface GameState {
  hero: HeroProfile;
  unlockedZones: ZoneId[];
  lastZoneId: ZoneId | null;
  /** Ассортимент рынка (реролл после похода / кнопкой). */
  market: MarketState;
}

export function createNewGameState(opts?: Partial<NewHeroOptions>): GameState {
  const state: GameState = {
    hero: createNewHeroProfile(opts),
    unlockedZones: ["north_road", "ruins"],
    lastZoneId: null,
    market: cloneMarketState(null),
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
  };
}
