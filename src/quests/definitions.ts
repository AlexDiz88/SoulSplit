import type { QuestDef, QuestId } from "./types";

export const QUEST_DEFS: Record<QuestId, QuestDef> = {
  cull_bandits: {
    id: "cull_bandits",
    name: "Зачистка бандитов",
    description:
      "Северная дорога перестала быть дорогой. Обозы не доходят, а те, кто всё же выезжает из ворот, возвращаются без товара - или не возвращаются вовсе.\n\nРатуша вывешивает простое поручение: проредить шайки на тракте, пока страх не добрался до самой стены. Городу нужна снова дорога, а не тропа добычи.",
    giver: "town_hall",
    questLevel: 1,
    objectives: [
      {
        type: "kill_group",
        groupId: "bandits",
        count: 15,
        label: "Убить бандитов",
      },
    ],
    rewards: {
      /** ≤10% полосы questLevel 1 (800) → 80. */
      xp: 80,
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
