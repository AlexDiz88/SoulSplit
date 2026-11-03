import alchemyIconUrl from "../../assets/art/aspects/alchemy.png";
import arcaneIconUrl from "../../assets/art/aspects/arcane.png";
import airIconUrl from "../../assets/art/aspects/air.png";
import beastIconUrl from "../../assets/art/aspects/beast.png";
import earthIconUrl from "../../assets/art/aspects/earth.png";
import illusionIconUrl from "../../assets/art/aspects/illusion.png";
import witchcraftIconUrl from "../../assets/art/aspects/witchcraft.png";
import bloodIconUrl from "../../assets/art/aspects/blood.png";
import iceIconUrl from "../../assets/art/aspects/ice.png";
import mechanicsIconUrl from "../../assets/art/aspects/mechanics.png";
import lightningIconUrl from "../../assets/art/aspects/lightning.png";
import necromancyIconUrl from "../../assets/art/aspects/necromancy.png";
import fireIconUrl from "../../assets/art/aspects/fire.png";
import natureIconUrl from "../../assets/art/aspects/nature.png";
import mindIconUrl from "../../assets/art/aspects/mind.png";
import lightIconUrl from "../../assets/art/aspects/light.png";
import mightIconUrl from "../../assets/art/aspects/might.png";
import stealthIconUrl from "../../assets/art/aspects/stealth.png";
import huntIconUrl from "../../assets/art/aspects/hunt.png";
import darkIconUrl from "../../assets/art/aspects/dark.png";
import type { Aspect } from "../types";

/** URL иконок аспектов (ключи = Aspect id, файлы в assets/art/aspects/). */
export const ASPECT_ICON_URLS: Record<Aspect, string> = {
  alchemy: alchemyIconUrl,
  arcane: arcaneIconUrl,
  air: airIconUrl,
  beast: beastIconUrl,
  earth: earthIconUrl,
  illusion: illusionIconUrl,
  witchcraft: witchcraftIconUrl,
  blood: bloodIconUrl,
  ice: iceIconUrl,
  mechanics: mechanicsIconUrl,
  lightning: lightningIconUrl,
  necromancy: necromancyIconUrl,
  fire: fireIconUrl,
  nature: natureIconUrl,
  mind: mindIconUrl,
  light: lightIconUrl,
  might: mightIconUrl,
  stealth: stealthIconUrl,
  hunt: huntIconUrl,
  dark: darkIconUrl,
};

export function aspectIconUrl(aspect: Aspect): string {
  return ASPECT_ICON_URLS[aspect];
}
