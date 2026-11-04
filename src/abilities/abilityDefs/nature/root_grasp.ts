import type { AbilityCatalogDef } from "../types";
import { attackSpeedReduceToSlowPotency } from "../../attackSpeed";

const def: AbilityCatalogDef = {
  id: "root_grasp",
  name: "Хватка корней",
  aspectId: "nature",
  status: "одобрено",
  icon: "root_grasp.png",
  hook: "без мгновенного урона, удержание 5 с (блок перемещения, каст ок), 8/с природы на 5 с, скорость атаки -50% на 5 с",
  description: "Корни смыкаются вокруг врага и удерживают его на клетке на 5 сек. Цель получает 8 ед. урона природы в секунду; скорость атаки снижена на 50% на 5 сек. Мгновенного урона нет.",
  cooldown: 12,
  manaCost: 30,
  damage: 0,
  application: "цель",
  zoneLabel: "нет",
  effect: "урон, контроль, дебафф",
  numbers: [
    "удержание на клетке 5 с",
    "8 урона природы в секунду, 5 с (итого 40)",
    "скорость атаки снижена на 50% на 5 с",
    "каст не блокирует, перемещение блокирует"
  ],
  extra: "мгновенного урона при применении нет. Каст не блокирует. Перемещение блокирует. Один скилл = один дебафф (не три отдельные иконки).",
  zone: null,
  combat: {
    aspect: "nature",
    glyph: "🌱",
    targetMode: "enemy",
    range: "ranged",
    reach: 4,
    effects: { rootDuration: 5, poisonPerSec: 8, poisonDuration: 5, slowDuration: 5, slowPotency: attackSpeedReduceToSlowPotency(0.5) },
  },
};

export default def;
