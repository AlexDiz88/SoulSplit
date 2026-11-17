import type { AbilityEffects, Aspect, TargetMode } from "../../types";
import type { AttackRange, DamageChannel } from "../../stats/formulas";

export type AbilityStatus = "черновик" | "одобрено" | "отказ" | "под вопросом";

/** Папка гримуара: аспект героя или кластер врагов. */
export type AbilityAspectId = Aspect | "enemies";

export interface AbilityZoneDef {
  anchor: string;
  damage: string;
  rows: string[][];
  notes: string[];
}

/** Боевой блок: если задан, способность попадает в `ABILITIES`. */
export interface AbilityCombatBlock {
  /** Аспект урона/эффектов в бою (у врагов может отличаться от `aspectId`). */
  aspect: Aspect;
  glyph: string;
  targetMode: TargetMode;
  range: "melee" | "ranged" | "any";
  reach: number;
  effects?: AbilityEffects;
  /** Канал прямого урона. По умолчанию magical. */
  damageChannel?: DamageChannel;
  /** Дальность удара для avoidance. По умолчанию из `range` (any → ranged). */
  attackRange?: AttackRange;
}

/**
 * Единый источник правды по способности: бой + гримуар + тултипы.
 * Файл: `src/abilities/abilityDefs/{aspectId}/{id}.ts`, id = snake_case.
 */
export interface AbilityCatalogDef {
  id: string;
  name: string;
  aspectId: AbilityAspectId;
  status: AbilityStatus;
  /** Файл в `assets/art/skills/` (`ice_arrow.png`). */
  icon: string;
  /** Крючок для INDEX (навигация генератора). */
  hook: string;
  description: string;
  /** Секунды. `null` = нет (пассив). */
  cooldown: number | null;
  /** `null` = нет (пассив / враги без маны). */
  manaCost: number | null;
  /**
   * Время каста героя, сек. `null` / нет поля = мгновенно.
   * На время каста автоатака останавливается. В бою дублируется в `combat.effects.castTime`.
   */
  castTime?: number | null;
  /**
   * Длительность канала, сек (импульсы внутри). Полоса в бою сливается, не каст.
   * Стадии и интервал - в `combat.effects.channelStages` / `channelStageInterval`.
   */
  channelTime?: number | null;
  damage: number;
  /** Тип применения для игрока: цель, зона, пассив, герой… */
  application: string;
  zoneLabel: string;
  /** Тип эффекта: урон, дебафф… */
  effect: string;
  numbers: string[];
  extra?: string;
  zone?: AbilityZoneDef | null;
  combat?: AbilityCombatBlock;
}
