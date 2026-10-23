import { cloneHeroProfile, createNewHeroProfile, type HeroProfile } from "./heroProfile";

export type ZoneId = "outskirts" | "ruins";

export interface GameState {
  hero: HeroProfile;
  unlockedZones: ZoneId[];
  lastZoneId: ZoneId | null;
}

export function createNewGameState(): GameState {
  return {
    hero: createNewHeroProfile(),
    unlockedZones: ["outskirts"],
    lastZoneId: null,
  };
}

export function cloneGameState(src: GameState): GameState {
  return {
    hero: cloneHeroProfile(src.hero),
    unlockedZones: [...src.unlockedZones],
    lastZoneId: src.lastZoneId,
  };
}
