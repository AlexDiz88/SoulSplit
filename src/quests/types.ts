import type { ItemDef, ItemRarity } from "../items/types";
import type { ZoneId } from "../meta/gameState";

export type QuestId = "cull_bandits";

/** Статус для UI ратуши. Available = нет записи в логе. */
export type QuestUiStatus = "available" | "active" | "ready" | "completed";

export type QuestProgressStatus = "active" | "ready" | "completed";

export interface QuestObjectiveKillGroup {
  type: "kill_group";
  groupId: string;
  count: number;
  /** Короткий текст цели для игрока. */
  label: string;
}

export type QuestObjective = QuestObjectiveKillGroup;

export interface QuestItemReward {
  rarity: ItemRarity;
  itemLevel: number;
}

export interface QuestRewards {
  xp: number;
  gold: number;
  item?: QuestItemReward;
}

export interface QuestDef {
  id: QuestId;
  name: string;
  description: string;
  giver: "town_hall";
  /** Дизайн-уровень задания (бэнд контента для XP и оверлевел-штрафа). */
  questLevel: number;
  /** После сдачи снова доступен (без вечного completed). */
  repeatable?: boolean;
  objectives: QuestObjective[];
  rewards: QuestRewards;
  /** Регион, где квест виден в блоке карты. */
  zoneHint?: ZoneId;
}

export interface QuestProgress {
  questId: QuestId;
  status: QuestProgressStatus;
  /** Ключ цели → текущий счётчик. */
  counters: Record<string, number>;
  /** Предмет-награда (тот же, что был в pending при просмотре / взятии). */
  rewardItem?: ItemDef | null;
}

export interface QuestLogState {
  entries: QuestProgress[];
  /** До MAX_TRACKED id для оверлея трекера. */
  tracked: QuestId[];
  /**
   * Ролл награды до взятия (ратуша). Один раз на questId;
   * при accept переносится в entry.rewardItem.
   */
  pendingRewards: Partial<Record<QuestId, ItemDef>>;
}

export const MAX_TRACKED_QUESTS = 3;

export function objectiveCounterKey(obj: QuestObjective, index: number): string {
  if (obj.type === "kill_group") return `kill:${obj.groupId}`;
  return `obj:${index}`;
}
