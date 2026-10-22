import battleCryIconUrl from "../../assets/art/skills/battle_cry.png";
import dragonBreathIconUrl from "../../assets/art/skills/dragon_breath.png";
import fireballIconUrl from "../../assets/art/skills/fireball.png";
import frostShieldIconUrl from "../../assets/art/skills/frost_shield.png";
import frostboltIconUrl from "../../assets/art/skills/frostbolt.png";
import hammerThrowIconUrl from "../../assets/art/skills/hammer_throw.png";
import emptySkillIconUrl from "../../assets/art/skills/no_image.png";
import severArteryIconUrl from "../../assets/art/skills/sever_artery.png";
import shadowStrikeIconUrl from "../../assets/art/skills/shadow_strike.png";
import type { AbilityId } from "../types";

/** Круглый плейсхолдер пустого слота панели способностей. */
export const EMPTY_SKILL_ICON_URL = emptySkillIconUrl;

/** URL иконок способностей (ключи = AbilityId) */
export const ABILITY_ICON_URLS: Partial<Record<AbilityId, string>> = {
  ice_arrow: frostboltIconUrl,
  ice_shield: frostShieldIconUrl,
  fireball: fireballIconUrl,
  flame_cone: dragonBreathIconUrl,
  stun_strike: hammerThrowIconUrl,
  battle_cry: battleCryIconUrl,
  sever_artery: severArteryIconUrl,
  shadow_strike: shadowStrikeIconUrl,
};
