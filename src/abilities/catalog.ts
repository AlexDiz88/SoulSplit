import {
  abilityDefForGrimoireId,
  abilityNumberLines,
  describeAbility,
} from "./definitions";

export interface AbilityZone {
  anchor: string;
  damage: string;
  rows: string[][];
  notes: string[];
}

export interface AbilityCard {
  id: string;
  name: string;
  aspect: string;
  aspectId: string;
  status: string;
  icon: string;
  description: string;
  cooldown: string;
  mana: string;
  application: string;
  zoneLabel: string;
  effect: string;
  numbers: string[];
  extra: string;
  zone: AbilityZone | null;
}

/** Подставляет имя, описание и числа из боевых параметров, если карточка привязана к прототипу. */
export function presentAbilityCard(card: AbilityCard): AbilityCard {
  const def = abilityDefForGrimoireId(card.id);
  if (!def) return card;
  return {
    ...card,
    name: def.name,
    description: describeAbility(def),
    numbers: abilityNumberLines(def),
  };
}

export interface GrimoireAspect {
  id: string;
  name: string;
  color: string;
}

/** Канон генератора. Цвета только для гримуара. */
export const GRIMOIRE_ASPECTS: GrimoireAspect[] = [
  { id: "alchemy", name: "Алхимия", color: "#8aaa55" },
  { id: "arcane", name: "Аркан", color: "#c45ad4" },
  { id: "air", name: "Воздух", color: "#d5dde6" },
  { id: "beast", name: "Дух Зверя", color: "#d08a45" },
  { id: "earth", name: "Земля", color: "#c4a06a" },
  { id: "illusion", name: "Иллюзии/Эфир", color: "#8eb8d4" },
  { id: "witchcraft", name: "Колдовство", color: "#a57ad4" },
  { id: "blood", name: "Кровь", color: "#d45454" },
  { id: "ice", name: "Лёд", color: "#7ec8e8" },
  { id: "mechanics", name: "Механика", color: "#d0a060" },
  { id: "lightning", name: "Молния", color: "#e6d36a" },
  { id: "death", name: "Некромантия/Смерть", color: "#8aaa78" },
  { id: "fire", name: "Огонь", color: "#ff7a3d" },
  { id: "nature", name: "Природа", color: "#6aaa62" },
  { id: "mind", name: "Разум", color: "#e0a0c4" },
  { id: "light", name: "Свет", color: "#f0e2b0" },
  { id: "might", name: "Сила", color: "#c9b896" },
  { id: "stealth", name: "Скрытность", color: "#9b7bb8" },
  { id: "hunt", name: "Стрельба/Охота", color: "#a3b56a" },
  { id: "dark", name: "Тьма", color: "#8a74b0" },
  { id: "enemies", name: "Враги", color: "#c45a4a" },
];

const rawCards = import.meta.glob("../../design/abilities/**/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const iconModules = import.meta.glob("../../assets/art/skills/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const ICONS: Record<string, string> = {};
for (const [path, url] of Object.entries(iconModules)) {
  const file = path.replaceAll("\\", "/").split("/").pop() ?? "";
  ICONS[file] = url;
  ICONS[file.replace(/\.png$/i, "")] = url;
}

const FALLBACK_ICON = ICONS["no_image.png"] ?? "";

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const sep = line.indexOf(":");
    if (sep <= 0) continue;
    out[line.slice(0, sep).trim()] = unquote(line.slice(sep + 1));
  }
  return out;
}

function parseGrid(block: string): string[][] {
  const rows: string[][] = [];
  for (const line of block.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 5 && /^[0-3]$/.test(parts[0] ?? "")) {
      rows.push(parts.slice(1, 5));
    }
  }
  return rows;
}

function parseCard(path: string, raw: string): AbilityCard {
  const matched = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const front = parseFrontmatter(matched?.[1] ?? "");
  const body = matched?.[2] ?? raw;
  const parts = path.replaceAll("\\", "/").split("/");
  const folder = parts.at(-2) ?? "enemies";
  const fileId = (parts.at(-1) ?? "ability").replace(/\.md$/, "");

  const fields = new Map<string, string[]>();
  let current = "";
  const zoneLines: string[] = [];
  let inZone = false;
  let inFence = false;
  let fence = "";

  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      inZone = line.replace(/^##\s+/, "").trim() === "Зона";
      current = "";
      continue;
    }
    if (inZone) {
      if (line.trim().startsWith("```")) {
        if (inFence) {
          inFence = false;
        } else {
          inFence = true;
          fence = "";
        }
        continue;
      }
      if (inFence) {
        fence += `${line}\n`;
        continue;
      }
      zoneLines.push(line);
      continue;
    }
    const field = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/);
    if (field) {
      current = field[1] ?? "";
      fields.set(current, field[2] ? [field[2]] : []);
      continue;
    }
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && current) {
      fields.get(current)?.push(item[1] ?? "");
      continue;
    }
    if (current && line.trim()) fields.get(current)?.push(line.trim());
  }

  const text = (key: string): string => (fields.get(key) ?? []).join(" ").trim();
  const numbers = fields.get("Числа") ?? [];
  const rows = parseGrid(fence);
  const notes = zoneLines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, ""));
  const anchor = zoneLines.find((line) => line.trim().startsWith("якорь:"))?.split(":").slice(1).join(":").trim() ?? "";
  const damage = zoneLines.find((line) => line.trim().startsWith("урон по клеткам:"))?.split(":").slice(1).join(":").trim() ?? "";

  return {
    id: front.id || fileId,
    name: front.name || fileId,
    aspect: front.aspect || folder,
    aspectId: front.aspect_id || folder,
    status: front.status || "черновик",
    icon: front.icon || `${(front.id || fileId).replace(/-/g, "_")}.png`,
    description: text("Описание"),
    cooldown: text("Кулдаун"),
    mana: text("Затраты по мане"),
    application: text("Тип применения"),
    zoneLabel: text("Зона применения"),
    effect: text("Тип эффекта"),
    numbers: numbers.map((line) => line.trim()).filter(Boolean),
    extra: text("Доп"),
    zone:
      rows.length > 0
        ? { anchor, damage, rows, notes }
        : null,
  };
}

let cached: AbilityCard[] | null = null;

export function loadAbilityCards(): AbilityCard[] {
  if (cached) return cached;
  const cards: AbilityCard[] = [];
  for (const [path, raw] of Object.entries(rawCards)) {
    if (path.replaceAll("\\", "/").endsWith("/INDEX.md") || typeof raw !== "string") continue;
    cards.push(presentAbilityCard(parseCard(path, raw)));
  }
  cached = cards;
  return cards;
}

export function cardsInAspect(aspectId: string): AbilityCard[] {
  return loadAbilityCards()
    .filter((card) => card.aspectId === aspectId)
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function abilityIconUrl(card: AbilityCard): string {
  return ICONS[card.icon] ?? ICONS[card.icon.replace(/\.png$/i, "")] ?? ICONS[card.id] ?? ICONS[card.id.replace(/-/g, "_")] ?? FALLBACK_ICON;
}
