import frostboltIconUrl from "../../assets/art/skills/frostbolt.png";
import type { AbilityId } from "../types";

/** URL иконок способностей (ключи = AbilityId) */
export const ABILITY_ICON_URLS: Partial<Record<AbilityId, string>> = {
  ice_arrow: frostboltIconUrl,
};
