export type Team = "player" | "enemy";

export type School = "ice" | "fire" | "iron" | "stealth" | "light";

export type AbilityId =
  | "ice_arrow"
  | "ice_shield"
  | "fireball"
  | "flame_cone"
  | "stun_strike"
  | "battle_cry"
  | "sever_artery"
  | "shadow_strike";

/** enemy - нужна живая цель-враг; cell - одна клетка (можно пустая); zone - форма из клеток. */
export type TargetMode = "enemy" | "ally" | "self" | "cone" | "ally_aura" | "enemy_blast" | "zone" | "cell";

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

/** Числовые эффекты способности. Описания и бой читают отсюда, не из хардкода в тексте. */
export interface AbilityEffects {
  slowDuration?: number;
  /** Прибавка к множителю интервала автоатаки (0.35 → ×1.35). */
  slowPotency?: number;
  shieldAmount?: number;
  shieldDuration?: number;
  burnPerSec?: number;
  burnDuration?: number;
  bleedPerSec?: number;
  bleedDuration?: number;
  stunDuration?: number;
  atkBuffDuration?: number;
  /** Прибавка к урону атаки (0.35 → +35% / ×1.35). */
  atkBuffPotency?: number;
  /** Доля урона вторичных клеток зоны от damage (0.55 → 55%). */
  zoneSecondaryRatio?: number;
  invulnerableDuringCast?: boolean;
}

export interface AbilityDef {
  id: AbilityId;
  name: string;
  school: School;
  glyph: string;
  cooldown: number;
  damage: number;
  targetMode: TargetMode;
  range: "melee" | "ranged" | "any";
  /** 0 — на себя. Иначе ряды от героя: 1 ближний … 4 дальний. */
  reach: number;
  effects?: AbilityEffects;
}
