import type { AbilityId } from "../types";

/** Статистика одной способности за бой (со стороны героя). */
export interface AbilityBattleStats {
  abilityId: AbilityId;
  casts: number;
  hits: number;
  damage: number;
  healing: number;
  crits: number;
}

/** Статистика автоатак героя. */
export interface AutoAttackBattleStats {
  hits: number;
  damage: number;
  crits: number;
  /** Удары, от которых враг уклонился. */
  dodged: number;
}

/** Сколько врагов каждого вида повержено. */
export interface EnemyKillStat {
  kindId: string;
  count: number;
}

/** Итоговая телеметрия боя для экрана награды. */
export interface BattleStats {
  durationSec: number;
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  /** Реген от статов листа (не от способностей). */
  passiveHealing: number;
  /** Урон, поглощённый щитами героя. */
  shieldAbsorbed: number;
  critsLanded: number;
  /** Герой уклонился от удара. */
  dodges: number;
  /** Враг уклонился от удара героя. */
  enemyDodges: number;
  /**
   * Урон, заблокированный блоком.
   * Пока механика блока в бою не работает - всегда 0.
   */
  blockedDamage: number;
  autoAttack: AutoAttackBattleStats;
  abilities: AbilityBattleStats[];
  killsByKind: EnemyKillStat[];
}

export function createEmptyBattleStats(): BattleStats {
  return {
    durationSec: 0,
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
    passiveHealing: 0,
    shieldAbsorbed: 0,
    critsLanded: 0,
    dodges: 0,
    enemyDodges: 0,
    blockedDamage: 0,
    autoAttack: { hits: 0, damage: 0, crits: 0, dodged: 0 },
    abilities: [],
    killsByKind: [],
  };
}

/** Накопитель статистики во время боя. */
export class BattleStatsTracker {
  private readonly stats = createEmptyBattleStats();
  private readonly abilityMap = new Map<AbilityId, AbilityBattleStats>();
  private readonly killMap = new Map<string, number>();

  private abilityEntry(id: AbilityId): AbilityBattleStats {
    let row = this.abilityMap.get(id);
    if (!row) {
      row = { abilityId: id, casts: 0, hits: 0, damage: 0, healing: 0, crits: 0 };
      this.abilityMap.set(id, row);
    }
    return row;
  }

  noteAbilityCast(id: AbilityId): void {
    this.abilityEntry(id).casts += 1;
  }

  noteHeroAbilityHit(id: AbilityId, dealt: number, crit: boolean): void {
    const row = this.abilityEntry(id);
    row.hits += 1;
    row.damage += dealt;
    if (crit) row.crits += 1;
    this.stats.damageDealt += dealt;
    if (crit) this.stats.critsLanded += 1;
  }

  /** DoT / тиковый урон способности - без +1 к попаданиям. */
  noteHeroAbilityDot(id: AbilityId, dealt: number): void {
    if (dealt <= 0) return;
    this.abilityEntry(id).damage += dealt;
    this.stats.damageDealt += dealt;
  }

  /** Урон героя без привязки к способности (редкий fallback). */
  noteHeroDamage(dealt: number): void {
    if (dealt <= 0) return;
    this.stats.damageDealt += dealt;
  }

  noteHeroAbilityHeal(id: AbilityId, amount: number): void {
    if (amount <= 0) return;
    this.abilityEntry(id).healing += amount;
    this.stats.healingDone += amount;
  }

  noteHeroAutoHit(dealt: number, crit: boolean): void {
    this.stats.autoAttack.hits += 1;
    this.stats.autoAttack.damage += dealt;
    this.stats.damageDealt += dealt;
    if (crit) {
      this.stats.autoAttack.crits += 1;
      this.stats.critsLanded += 1;
    }
  }

  noteHeroAutoDodged(): void {
    this.stats.autoAttack.dodged += 1;
    this.stats.enemyDodges += 1;
  }

  noteHeroAbilityDodged(): void {
    this.stats.enemyDodges += 1;
  }

  noteHeroDodged(): void {
    this.stats.dodges += 1;
  }

  noteHeroDamageTaken(dealt: number, absorbed: number): void {
    this.stats.damageTaken += dealt;
    this.stats.shieldAbsorbed += absorbed;
  }

  notePassiveHeal(amount: number): void {
    if (amount <= 0) return;
    this.stats.passiveHealing += amount;
    this.stats.healingDone += amount;
  }

  noteKill(kindId: string): void {
    this.killMap.set(kindId, (this.killMap.get(kindId) ?? 0) + 1);
  }

  finalize(durationSec: number): BattleStats {
    this.stats.durationSec = durationSec;
    this.stats.abilities = [...this.abilityMap.values()].sort(
      (a, b) => b.damage + b.healing - (a.damage + a.healing) || b.casts - a.casts,
    );
    this.stats.killsByKind = [...this.killMap.entries()]
      .map(([kindId, count]) => ({ kindId, count }))
      .sort((a, b) => b.count - a.count || a.kindId.localeCompare(b.kindId));
    return {
      ...this.stats,
      autoAttack: { ...this.stats.autoAttack },
      abilities: this.stats.abilities.map((a) => ({ ...a })),
      killsByKind: this.stats.killsByKind.map((k) => ({ ...k })),
    };
  }
}
