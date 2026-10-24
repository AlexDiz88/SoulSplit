import titanMightIconUrl from "../../assets/art/skills/titan_might.png";
import dragonBreathIconUrl from "../../assets/art/skills/dragon_breath.png";
import fireballIconUrl from "../../assets/art/skills/fireball.png";
import frostShieldIconUrl from "../../assets/art/skills/frost_shield.png";
import frostboltIconUrl from "../../assets/art/skills/frostbolt.png";
import hammerThrowIconUrl from "../../assets/art/skills/hammer_throw.png";
import emptySkillIconUrl from "../../assets/art/skills/no_image.png";
import severArteryIconUrl from "../../assets/art/skills/sever_artery.png";
import shadowStrikeIconUrl from "../../assets/art/skills/shadow_strike.png";
import windGustIconUrl from "../../assets/art/skills/wind_gust.png";
import windSpeedIconUrl from "../../assets/art/skills/wind_speed.png";
import squallIconUrl from "../../assets/art/skills/squall.png";
import dustVeilIconUrl from "../../assets/art/skills/dust_veil.png";
import airPocketIconUrl from "../../assets/art/skills/air_pocket.png";
import tornadoIconUrl from "../../assets/art/skills/tornado.png";
import darkArrowIconUrl from "../../assets/art/skills/dark_arrow.png";
import demoralizingShoutIconUrl from "../../assets/art/skills/demoralizing_shout.png";
import type { AbilityId } from "../types";

/** Круглый плейсхолдер пустого слота панели способностей. */
export const EMPTY_SKILL_ICON_URL = emptySkillIconUrl;

/** URL иконок способностей (ключи = AbilityId) */
export const ABILITY_ICON_URLS: Partial<Record<AbilityId, string>> = {
  ice_arrow: frostboltIconUrl,
  ice_shield: frostShieldIconUrl,
  fireball: fireballIconUrl,
  flame_cone: dragonBreathIconUrl,
  hammer_throw: hammerThrowIconUrl,
  titan_might: titanMightIconUrl,
  demoralizing_shout: demoralizingShoutIconUrl,
  sever_artery: severArteryIconUrl,
  shadow_strike: shadowStrikeIconUrl,
  wind_gust: windGustIconUrl,
  wind_speed: windSpeedIconUrl,
  squall: squallIconUrl,
  dust_veil: dustVeilIconUrl,
  air_pocket: airPocketIconUrl,
  tornado: tornadoIconUrl,
  dark_arrow: darkArrowIconUrl,
};
