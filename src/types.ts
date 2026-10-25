export type Team = "player" | "enemy";

/** Игровые аспекты героя (канон: 20 штук). Кластер врагов - не аспект. */
export type Aspect =
  | "alchemy"
  | "arcane"
  | "air"
  | "beast"
  | "earth"
  | "illusion"
  | "witchcraft"
  | "blood"
  | "ice"
  | "mechanics"
  | "lightning"
  | "death"
  | "fire"
  | "nature"
  | "mind"
  | "light"
  | "might"
  | "stealth"
  | "hunt"
  | "dark";

export type AbilityId =
  | "ice_arrow"
  | "ice_shield"
  | "fireball"
  | "flame_cone"
  | "hammer_throw"
  | "titan_might"
  | "demoralizing_shout"
  | "sever_artery"
  | "shadow_strike"
  | "wind_gust"
  | "wind_speed"
  | "squall"
  | "dust_veil"
  | "air_pocket"
  | "tornado"
  | "dark_arrow"
  | "rejuvenation"
  | "root_grasp"
  | "poison_bush";

/** enemy - нужна живая цель-враг; cell - одна клетка (можно пустая); zone - форма из клеток; all_enemies - мгновенно по всем. */
export type TargetMode =
  | "enemy"
  | "ally"
  | "self"
  | "cone"
  | "ally_aura"
  | "enemy_blast"
  | "zone"
  | "cell"
  | "all_enemies";

export interface GridPos {
  col: number;
  row: number;
}

export interface StatusEffect {
  id: string;
  kind:
    | "stun"
    | "shield"
    | "bleed"
    | "burn"
    | "poison"
    | "regen"
    | "root"
    | "atk_buff"
    | "atk_debuff"
    | "slow"
    | "haste"
    | "invuln";
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
  atkDebuffDuration?: number;
  /** Множитель урона атаки врагов (0.7 → ×0.7). */
  atkDebuffMult?: number;
  /** Доля урона вторичных клеток зоны от damage (0.55 → 55%). */
  zoneSecondaryRatio?: number;
  invulnerableDuringCast?: boolean;
  /** Множитель интервала автоатаки героя (0.75 → быстрее). */
  hasteIntervalMult?: number;
  hasteDuration?: number;
  /** Урон смерча за тик (раз в секунду). */
  tornadoDps?: number;
  tornadoStaySec?: number;
  tornadoStays?: number;
  /** Время подготовки перед эффектом. Пока каст идет, автоатаки юнита стоят. */
  castTime?: number;
  /** Срывает подготовку цели (молчание, контрзаклинание). Обычный урон каст не срывает. */
  interruptsCast?: boolean;
  /** Удержание на клетке (блок перемещения, каст не блокирует). */
  rootDuration?: number;
  poisonPerSec?: number;
  poisonDuration?: number;
  regenPerSec?: number;
  regenDuration?: number;
}

export interface AbilityDef {
  id: AbilityId;
  name: string;
  aspect: Aspect;
  glyph: string;
  cooldown: number;
  damage: number;
  /** Стоимость маны. 0 - бесплатно. */
  manaCost?: number;
  targetMode: TargetMode;
  range: "melee" | "ranged" | "any";
  /** 0 — на себя. Иначе ряды от героя: 1 ближний … 4 дальний. */
  reach: number;
  effects?: AbilityEffects;
}
