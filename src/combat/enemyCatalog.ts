import { ABILITIES } from "../abilities/definitions";
import type { AbilityId } from "../types";
import { getEnemyKind, rowsLabel } from "./enemies";

export interface EnemyCard {
  id: string;
  name: string;
  short: string;
  group: string;
  groupId: string;
  region: string;
  regionId: string;
  status: string;
  portrait: string;
  baseLevel: number;
  description: string;
  hp: number;
  atk: number;
  cd: string;
  reach: number;
  spawnRowsLabel: string;
  weapon: string;
  aspect: string;
  abilities: string;
  extra: string;
  portraitUrl: string;
}

const rawCards = import.meta.glob("../../design/enemies/**/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const portraitModules = import.meta.glob("../../assets/art/enemies/*.{png,jpg,jpeg,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const PORTRAITS: Record<string, string> = {};
for (const [path, url] of Object.entries(portraitModules)) {
  const file = path.replaceAll("\\", "/").split("/").pop() ?? "";
  PORTRAITS[file] = url;
  PORTRAITS[file.replace(/\.(png|jpe?g|webp)$/i, "")] = url;
}

const FALLBACK_PORTRAIT = PORTRAITS["no_image.png"] ?? PORTRAITS["no_image"] ?? "";

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

function parseNumber(value: string, fallback: number): number {
  const n = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function parseCard(path: string, raw: string): EnemyCard {
  const matched = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const front = parseFrontmatter(matched?.[1] ?? "");
  const body = matched?.[2] ?? raw;
  const parts = path.replaceAll("\\", "/").split("/");
  const folder = parts.at(-2) ?? "common";
  const fileId = (parts.at(-1) ?? "enemy").replace(/\.md$/, "");

  const fields = new Map<string, string[]>();
  let current = "";
  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      current = "";
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
  const id = front.id || fileId;
  const combatId = id.replace(/-/g, "_");
  const kind = getEnemyKind(combatId);

  const portraitFile =
    front.portrait || `${combatId}.png`;
  const portraitUrl =
    PORTRAITS[portraitFile] ??
    PORTRAITS[portraitFile.replace(/\.(png|jpe?g|webp)$/i, "")] ??
    kind?.portraitUrl ??
    FALLBACK_PORTRAIT;

  const spawnFromCard = text("Появление");
  const spawnRowsLabel =
    spawnFromCard ||
    (kind ? rowsLabel(kind.spawnRows) : "-");

  return {
    id,
    name: front.name || kind?.name || fileId,
    short: front.short || kind?.short || text("Код") || "???",
    group: front.group || text("Группа") || folder,
    groupId: front.group_id || folder,
    region: front.region || text("Регион") || "",
    regionId: front.region_id || "",
    status: front.status || "черновик",
    portrait: portraitFile,
    baseLevel: parseNumber(front.base_level || text("Базовый уровень"), kind?.baseLevel ?? 1),
    description: text("Описание"),
    hp: parseNumber(text("Здоровье"), kind?.hp ?? 0),
    atk: parseNumber(text("Урон"), kind?.atk ?? 0),
    cd: text("Кулдаун") || (kind ? `${kind.cd.toFixed(1)} с` : "-"),
    reach: parseNumber(text("Дистанция"), kind?.reach ?? 1),
    spawnRowsLabel,
    weapon: text("Оружие") || kind?.weapon || "-",
    aspect: text("Аспект") || kind?.aspect || "-",
    abilities: text("Способности") || "-",
    extra: text("Доп"),
    portraitUrl,
  };
}

/** Если враг уже в боевом коде - подставить канон-статы с baseLevel. */
export function presentEnemyCard(card: EnemyCard): EnemyCard {
  const kind = getEnemyKind(card.id.replace(/-/g, "_"));
  if (!kind) return card;
  const abilityNames = (kind.abilities ?? [])
    .map((id) => ABILITIES[id as AbilityId]?.name ?? id.replace(/_/g, "-"))
    .join(", ");
  return {
    ...card,
    name: kind.name,
    short: kind.short,
    baseLevel: kind.baseLevel,
    hp: kind.hp,
    atk: kind.atk,
    cd: `${kind.cd.toFixed(1)} с`,
    reach: kind.reach,
    spawnRowsLabel: rowsLabel(kind.spawnRows),
    weapon: kind.weapon,
    aspect: kind.aspect,
    abilities: abilityNames || card.abilities || "-",
    portraitUrl: kind.portraitUrl || card.portraitUrl,
  };
}

let cached: EnemyCard[] | null = null;

export function loadEnemyCards(): EnemyCard[] {
  if (cached) return cached;
  const cards: EnemyCard[] = [];
  for (const [path, raw] of Object.entries(rawCards)) {
    if (path.replaceAll("\\", "/").endsWith("/INDEX.md") || typeof raw !== "string") continue;
    cards.push(presentEnemyCard(parseCard(path, raw)));
  }
  cached = cards.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return cached;
}

export function enemyPortraitUrl(card: EnemyCard): string {
  return (
    PORTRAITS[card.portrait] ??
    PORTRAITS[card.portrait.replace(/\.(png|jpe?g|webp)$/i, "")] ??
    card.portraitUrl ??
    FALLBACK_PORTRAIT
  );
}
