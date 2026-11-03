import frostboltIconUrl from "../../assets/art/skills/frostbolt.png";
import frostShieldIconUrl from "../../assets/art/skills/frost_shield.png";
import fireballIconUrl from "../../assets/art/skills/fireball.png";
import hammerThrowIconUrl from "../../assets/art/skills/hammer_throw.png";
import severArteryIconUrl from "../../assets/art/skills/sever_artery.png";
import rejuvenationIconUrl from "../../assets/art/skills/rejuvenation.png";
import rootGraspIconUrl from "../../assets/art/skills/root_grasp.png";
import titanMightIconUrl from "../../assets/art/skills/titan_might.png";
import demoralizingShoutIconUrl from "../../assets/art/skills/demoralizing_shout.png";
import windSpeedIconUrl from "../../assets/art/skills/wind_speed.png";
import shadowStrikeIconUrl from "../../assets/art/skills/shadow_strike.png";
import { ABILITIES, describeAbility } from "../abilities/definitions";
import { ABILITY_ICON_URLS } from "../art/abilityIcons";
import type { AbilityId, StatusEffect } from "../types";

/** Полярность kind или итогового UI-пакета. `mixed` - усиление и ослабление в одном пакете. */
export type StatusPolarity = "buff" | "debuff" | "mixed";

export interface CombatStatusMeta {
  kind: StatusEffect["kind"];
  /** У kind только buff|debuff; mixed бывает у пакета. */
  polarity: "buff" | "debuff";
  name: string;
  /** Краткое описание для тултипа. */
  description: string;
  /** Иконка, если нет sourceAbilityId. */
  fallbackIconUrl: string;
}

/** Один UI-пакет баффа/дебаффа (канон: 1 способность = 1 иконка). */
export interface StatusDisplayPackage {
  key: string;
  polarity: StatusPolarity;
  remaining: number;
  /** Представитель для иконки / hit-test. */
  representative: StatusEffect;
  members: StatusEffect[];
}

const META: Record<StatusEffect["kind"], CombatStatusMeta> = {
  stun: {
    kind: "stun",
    polarity: "debuff",
    name: "Оглушение",
    description: "Цель не может атаковать и применять способности.",
    fallbackIconUrl: hammerThrowIconUrl,
  },
  shield: {
    kind: "shield",
    polarity: "buff",
    name: "Щит",
    description: "Поглощает входящий урон, пока запас щита не иссякнет.",
    fallbackIconUrl: frostShieldIconUrl,
  },
  bleed: {
    kind: "bleed",
    polarity: "debuff",
    name: "Кровотечение",
    description: "Периодический физический урон.",
    fallbackIconUrl: severArteryIconUrl,
  },
  burn: {
    kind: "burn",
    polarity: "debuff",
    name: "Горение",
    description: "Периодический магический урон огнём.",
    fallbackIconUrl: fireballIconUrl,
  },
  poison: {
    kind: "poison",
    polarity: "debuff",
    name: "Яд",
    description: "Периодический магический урон природы.",
    fallbackIconUrl: rootGraspIconUrl,
  },
  regen: {
    kind: "regen",
    polarity: "buff",
    name: "Регенерация",
    description: "Восстановление здоровья со временем.",
    fallbackIconUrl: rejuvenationIconUrl,
  },
  root: {
    kind: "root",
    polarity: "debuff",
    name: "Удержание",
    description: "Цель не может сменить клетку.",
    fallbackIconUrl: rootGraspIconUrl,
  },
  atk_buff: {
    kind: "atk_buff",
    polarity: "buff",
    name: "Усиление атаки",
    description: "Повышает наносимый урон.",
    fallbackIconUrl: titanMightIconUrl,
  },
  atk_debuff: {
    kind: "atk_debuff",
    polarity: "debuff",
    name: "Ослабление атаки",
    description: "Снижает наносимый урон.",
    fallbackIconUrl: demoralizingShoutIconUrl,
  },
  slow: {
    kind: "slow",
    polarity: "debuff",
    name: "Замедление",
    description: "Снижает скорость атаки.",
    fallbackIconUrl: frostboltIconUrl,
  },
  haste: {
    kind: "haste",
    polarity: "buff",
    name: "Ускорение",
    description: "Повышает скорость атаки.",
    fallbackIconUrl: windSpeedIconUrl,
  },
  invuln: {
    kind: "invuln",
    polarity: "buff",
    name: "Неуязвимость",
    description: "Блокирует входящий урон.",
    fallbackIconUrl: shadowStrikeIconUrl,
  },
};

export const STATUS_BUFF_FRAME = 0x5a9e5a;
export const STATUS_DEBUFF_FRAME = 0xc45a4a;
/** Усиление + ослабление в одном пакете. */
export const STATUS_MIXED_FRAME = 0xd4a84a;
export const STATUS_ICON_MAX_VISIBLE = 4;

export function combatStatusMeta(kind: StatusEffect["kind"]): CombatStatusMeta {
  return META[kind];
}

export function statusPolarity(kind: StatusEffect["kind"]): "buff" | "debuff" {
  return META[kind].polarity;
}

export function frameColorForPolarity(polarity: StatusPolarity): number {
  if (polarity === "buff") return STATUS_BUFF_FRAME;
  if (polarity === "debuff") return STATUS_DEBUFF_FRAME;
  return STATUS_MIXED_FRAME;
}

export function packagePolarity(members: StatusEffect[]): StatusPolarity {
  let hasBuff = false;
  let hasDebuff = false;
  for (const m of members) {
    if (statusPolarity(m.kind) === "buff") hasBuff = true;
    else hasDebuff = true;
  }
  if (hasBuff && hasDebuff) return "mixed";
  return hasDebuff ? "debuff" : "buff";
}

export function resolveStatusIconUrl(status: StatusEffect): string {
  if (status.sourceAbilityId) {
    const fromAbility = ABILITY_ICON_URLS[status.sourceAbilityId as AbilityId];
    if (fromAbility) return fromAbility;
  }
  return META[status.kind].fallbackIconUrl;
}

/**
 * Свернуть внутренние kind в пакеты для UI.
 * С одним `sourceAbilityId` - один пакет (даже если kind несколько: root+poison+slow).
 */
export function groupStatusesForDisplay(statuses: StatusEffect[]): StatusDisplayPackage[] {
  const buckets = new Map<string, StatusEffect[]>();
  for (const s of statuses) {
    const key = s.sourceAbilityId ? `ability:${s.sourceAbilityId}` : `kind:${s.kind}`;
    const list = buckets.get(key);
    if (list) list.push(s);
    else buckets.set(key, [s]);
  }

  const packages: StatusDisplayPackage[] = [];
  for (const [key, members] of buckets) {
    const polarity = packagePolarity(members);
    let remaining = 0;
    for (const m of members) remaining = Math.max(remaining, m.remaining);
    // Предпочитаем запись с DoT / контролем, иначе первую.
    const representative =
      members.find((m) => m.kind === "poison" || m.kind === "bleed" || m.kind === "burn") ??
      members.find((m) => m.kind === "root" || m.kind === "stun") ??
      members.find((m) => statusPolarity(m.kind) === "buff") ??
      members[0]!;
    packages.push({ key, polarity, remaining, representative, members });
  }

  const polarityRank = (p: StatusPolarity): number =>
    p === "debuff" ? 0 : p === "mixed" ? 1 : 2;

  packages.sort((a, b) => {
    const ra = polarityRank(a.polarity);
    const rb = polarityRank(b.polarity);
    if (ra !== rb) return ra - rb;
    return a.remaining - b.remaining;
  });
  return packages;
}

export function statusTooltipTitle(status: StatusEffect): string {
  if (status.sourceAbilityId) {
    const def = ABILITIES[status.sourceAbilityId as AbilityId];
    if (def) return def.name;
  }
  return META[status.kind].name;
}

export function statusTooltipDesc(status: StatusEffect): string {
  const time = Math.max(0, Math.ceil(status.remaining));
  if (status.sourceAbilityId) {
    const def = ABILITIES[status.sourceAbilityId as AbilityId];
    if (def) return `${describeAbility(def)} Осталось ${time} с.`;
  }
  const meta = META[status.kind];
  return `${meta.description} Осталось ${time} с.`;
}

export function packageTooltipTitle(pkg: StatusDisplayPackage): string {
  return statusTooltipTitle(pkg.representative);
}

export function packageTooltipDesc(pkg: StatusDisplayPackage): string {
  const time = Math.max(0, Math.ceil(pkg.remaining));
  const id = pkg.representative.sourceAbilityId;
  if (id) {
    const def = ABILITIES[id as AbilityId];
    if (def) return `${describeAbility(def)} Осталось ${time} с.`;
  }
  const meta = META[pkg.representative.kind];
  return `${meta.description} Осталось ${time} с.`;
}

export function formatStatusTimer(remaining: number): string {
  return String(Math.max(0, Math.ceil(remaining)));
}
