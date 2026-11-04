import type { QuestDef, QuestId } from "./types";

export const QUEST_DEFS: Record<QuestId, QuestDef> = {
  cull_bandits: {
    id: "cull_bandits",
    name: "Зачистка бандитов",
    description:
      "Банды уже не ждут купцов вдали от глаз стражи - их видят у самой стены, там где патруль ещё должен держать порядок. Северная дорога начинается у ворот Грейстоуна, и именно здесь страх режет путь в город.\n\nОбъявление ратуши простое: проредить шайки у стены, пока грабёж не стал обычным делом под воротами. Грейстоуну снова нужна дорога, а не тропа добычи.",
    giver: "town_hall",
    questLevel: 1,
    objectives: [
      {
        type: "kill_group",
        groupId: "bandits",
        count: 15,
        regionId: "north_road",
        locationId: "wall",
        label: "Убить бандитов у стены",
      },
    ],
    rewards: {
      /** ≤10% полосы questLevel 1 (800) → 80. */
      xp: 80,
      gold: 50,
      item: { rarity: "uncommon", itemLevel: 1 },
    },
    regionHint: "north_road",
  },
};

export const ALL_QUEST_IDS = Object.keys(QUEST_DEFS) as QuestId[];

export function getQuestDef(id: QuestId): QuestDef {
  return QUEST_DEFS[id];
}

export function isQuestId(id: string): id is QuestId {
  return id in QUEST_DEFS;
}
