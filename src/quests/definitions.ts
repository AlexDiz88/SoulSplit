import type { QuestDef, QuestId } from "./types";

export const QUEST_DEFS: Record<QuestId, QuestDef> = {
  cull_bandits: {
    id: "cull_bandits",
    name: "Зачистка бандитов",
    description:
      "Банды грабят Северную дорогу. Ратуша просит сократить их число - любой бандит засчитывается.",
    giver: "town_hall",
    objectives: [
      {
        type: "kill_group",
        groupId: "bandits",
        count: 15,
        label: "Убить бандитов",
      },
    ],
    rewards: {
      xp: 100,
      gold: 50,
      item: { rarity: "uncommon", itemLevel: 1 },
    },
    zoneHint: "north_road",
  },
};

export const ALL_QUEST_IDS = Object.keys(QUEST_DEFS) as QuestId[];

export function getQuestDef(id: QuestId): QuestDef {
  return QUEST_DEFS[id];
}

export function isQuestId(id: string): id is QuestId {
  return id in QUEST_DEFS;
}
