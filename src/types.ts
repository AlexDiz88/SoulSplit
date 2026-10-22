export type Team = "player" | "enemy";

export type School = "ice" | "fire" | "iron" | "stealth";

export type AbilityId =
  | "ice_arrow"
  | "ice_shield"
  | "fireball"
  | "flame_cone"
  | "stun_strike"
  | "battle_cry"
  | "slash"
  | "shadow_strike";

export type TargetMode = "enemy" | "ally" | "self" | "cone" | "ally_aura" | "enemy_blast" | "zone";

export interface GridPos {
  col: number;
  row: number;
}

export interface StatusEffect {
  id: string;
  kind: "stun" | "shield" | "bleed" | "burn" | "atk_buff" | "slow" | "invuln";
  remaining: number;
  potency: number;
}

export type WeaponKind = "melee" | "spear" | "bow" | "staff";

export interface UnitStats {
  maxHp: number;
  atk: number;
  autoAttackCd: number;
  range: "melee" | "ranged";
  /** Дальность в рядах от героя. 1 — ближний ряд. */
  reach?: number;
}

export interface AbilityDef {
  id: AbilityId;
  name: string;
  school: School;
  glyph: string;
  description: string;
  cooldown: number;
  damage: number;
  targetMode: TargetMode;
  range: "melee" | "ranged" | "any";
  /** 0 — на себя. Иначе ряды от героя: 1 ближний … 4 дальний. */
  reach: number;
}
