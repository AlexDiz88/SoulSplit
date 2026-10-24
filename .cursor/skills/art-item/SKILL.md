---
name: art-item
description: >-
  Writes ready-to-paste Gemini image prompts for Soul Split inventory item icons
  (equipment loot) using thin-white-sticker toon canon shared with portraits and
  ability icons. Requires slot and rarity. Higher rarity means more complex,
  unusual, detailed icons. Fantasy-first (not historical medieval catalog, not steampunk).
  Use when the user invokes art-item (e.g. art-item голова, редкая), or asks for
  item / loot / equipment / inventory icon prompts.
disable-model-invocation: true
---

# Art Item - Soul Split

## When to use

User wants Gemini prompts for **inventory item icons** (weapons, armor, jewelry,
trinkets). Visual language: hard toon, fine dark lines, **hairline** white sticker
outline, flat solid backdrop **exactly `#151617`** (locked - never random).

This is a **loot ARPG** - many items. Prefer **batch sheets** that invent many
distinct pieces for one slot + rarity, not one-off one-item prompts, unless the
user names a specific item.

## Invocation (user input)

User writes the skill name, then **slot** and **rarity** (both required). Theme /
item name after that is optional:

```
art-item {ячейка}, {редкость}
art-item {ячейка}, {редкость}, {тема / название / материал}
```

Examples:

```
art-item голова, обычная
art-item mainhand, легендарная, огненный клинок
art-item кольцо, эпическая
art-item туловище, сет, костяной комплект ворона
art-item offhand, магическая, рунный щит
```

Leading `/` is optional (`/art-item` = `art-item`).

### Parse rules

1. Strip leading `/art-item` or `art-item`.
2. Split the remainder on commas into up to 3 parts (trim each):
   - **Param 1** = slot (required)
   - **Param 2** = rarity (required)
   - **Param 3+** = optional theme / item name / material / set motif (join if more commas)
3. If slot or rarity is missing or unknown - **ask once**; do not invent either.
4. Do **not** draft the prompt until both required params resolve.

### Slot aliases -> canonical id

Map Russian / English / paperdoll labels to one id (from `src/ui/characterSheet.ts`):

| Canonical | Accepts (aliases) |
|-----------|-------------------|
| `head` | голова, шлем, головной убор, head, helmet |
| `chest` | туловище, грудь, доспех, кираса, chest, body, armor |
| `neck` | шея, амулет, ожерелье, neck, amulet, necklace |
| `shoulders` | плечи, наплечники, shoulders, pauldrons |
| `hands` | перчатки, руки, hands, gloves, gauntlets |
| `ring` | палец, кольцо, ring, ring1, ring2 |
| `waist` | пояс, belt, waist |
| `legs` | ноги, поножи, штаны, legs, greaves, pants |
| `feet` | обувь, сапоги, feet, boots |
| `trinket` | аксессуар, тринкет, реликвия, trinket, accessory |
| `mainhand` | основная рука, оружие, меч, mainhand, weapon, sword |
| `offhand` | левая рука, щит, offhand, shield |

If the user says a weapon type that implies a hand (`меч`, `лук`, `кинжал`) without
an explicit hand slot, default slot to `mainhand` and put the weapon type into the
optional theme. If they say `щит` alone, default to `offhand`.

### Rarity aliases -> canonical id

| Canonical | RU | UI frame color | Accepts |
|-----------|----|----------------|---------|
| `common` | обычная | white | обычная, common, white, белая |
| `uncommon` | необычная | green | необычная, uncommon, green, зеленая, зелёная |
| `magic` | магическая | blue | магическая, magic, magical, blue, синяя |
| `rare` | редкая | yellow | редкая, rare, yellow, желтая, жёлтая |
| `epic` | эпическая | purple | эпическая, epic, purple, фиолетовая |
| `legendary` | легендарная | orange | легендарная, legendary, orange, оранжевая |
| `set` | сет / комплект | turquoise | сет, комплект, set, turquoise, бирюзовая |

**UI frame colors** belong to inventory chrome. Do **not** draw colored rarity
frames, borders, or rarity badges inside the generated icon. Rarity only drives
**item complexity** (see ladder below).

## Before writing prompts

1. Parse -> resolve `slot` + `rarity` (+ optional theme).
2. Read [`assets/art/STYLE_BIBLE.md`](../../../assets/art/STYLE_BIBLE.md) for the
   shared toon / hairline-white-outline canon (item icons section).
3. Pick mode:
   - **Batch (DEFAULT):** no specific named item, or theme is a broad motif
     ("bone", "frost", "raven cult") -> invent **9 different items**, all same
     slot + same rarity.
   - **Named item:** user gave a clear unique item name -> **9 variations** of
     that one item (angle / wear / ornament intensity only).
4. For `set` rarity without a set motif, invent a coherent set motif in the
   Subject and keep it consistent across the sheet.
5. Output path after approval: `assets/art/items/{slot}/{id}.png` (crop one panel).

## Hard rules

- English prompts only.
- **ONE single prompt** - style, setting, layout, framing, subject, rarity lock,
  creative/diversity, negatives in one block.
- **Reply with ONLY the prompt** - nothing else outside one code fence.
- Always include Item Style Lock + Backdrop Lock + Rarity Lock + negatives
  inside that prompt.
- Default **3x3 contact sheet**; even gutters; no labels, numbers, captions.
- Item fully inside each panel with a small safe margin.
- White sticker outline must be **hairline** (see Style Lock) - never chunky.
- Flat solid backdrop **exactly `#151617`** on every panel and the sheet
  (inventory icon - no scene). Never invent another gray/brown/blue/green tint.
  Gutters: same `#151617` or solid `#0A0B0C` only - no random gutter colors.
- No characters, faces, hands holding the item as a figure, no mannequins, no UI.
- **Fantasy-first:** classic / dark fantasy game loot. Not historical museum
  medieval, not steampunk / Victorian industrial. Alchemy vials, engineer tools,
  or bomb charges only if the user's theme explicitly asks for them - still
  fantasy craft, never brass-gear steampunk fashion.
- **Never name the game, project, or internal style docs** in the prompt
  (no "Soul Split", no "Style Bible", no "our portraits"). Models do not know
  the project - describe the look in plain English only.
- Do not invent a competing stylization slant.

## Style Lock (always include)

```
Style lock - FANTASY INVENTORY ITEM ICONS: stylized 2D dark-fantasy game inventory item icons, hard toon/cel shading with clear flat light-shadow planes, CLEAN FINE dark internal outlines (crisp comic ink, thin not fat) PLUS a HAIRLINE even WHITE sticker outer outline around the item silhouette - ultra-thin fine weight roughly 1px relative to each panel (or thinner), tight to the edge, like a fine die-cut sticker edge - NEVER a thick heavy white border, NEVER a chunky marker stroke, NEVER a 3-6px fat outline - single centered readable item LARGE in frame, RICH clear local fantasy materials and strong contrast for ~64px inventory readability, flat solid backdrop exactly hex #151617 (no scene, no environment, no gradient, no noise) - entire item silhouette and hairline white outline FULLY INSIDE each panel with a small safe margin - no photoreal, no 3D render, no soft anime shading without outlines, no neon candy glow, no text, no watermark, no UI, no rarity-colored frames or borders. Only the item designs change.
```

## Backdrop Lock (always include - CRITICAL)

Same hex every generation. Do not paraphrase into "dark gray" / "charcoal" without the hex.

```
Backdrop lock (CRITICAL - identical every generation): every panel background AND the sheet field behind gutters is a FLAT SOLID fill of exactly hex #151617 (RGB 21, 22, 23). No other shade. No warm brown, olive, blue, purple, or green cast. No gradient, vignette, texture, noise, fog, or per-panel color variation. Gutters may be the same #151617 or solid #0A0B0C only.
```

## Setting (always weave in)

```
Setting: classic dark fantasy game world - enchanted adventurer loot, magic materials, fantasy silhouettes; physical loot prop only - no full character. NOT historical medieval reenactment, NOT steampunk, NOT Victorian industrial / brass-gear fashion.
```

## Layout Lock

```
Layout: single square image, clean 3x3 contact sheet of NINE equal panels with thin even gutters (#151617 or #0A0B0C only), no labels, no numbers, no captions. Each panel reads as a clear ~64px game inventory item icon on solid #151617.
```

## Framing Lock

```
Framing per panel: one clear equipment item centered and large, orthographic or slight 3/4 product view, HAIRLINE white sticker outline (ultra-thin ~1px, never chunky), hard toon-shaded fantasy materials, flat solid backdrop exactly #151617, no character, no hands, no mannequin, no text, no rarity frame.
```

## Rarity -> complexity ladder (REQUIRED - bake into every prompt)

Translate the resolved rarity into a **Rarity lock** paragraph. Higher rarity =
more complex, unusual, and detailed - still readable at ~64px (silhouette first).

| Rarity | Complexity in the icon |
|--------|------------------------|
| `common` | Plain functional **fantasy** starter gear. Simple silhouette. Minimal ornament. Ordinary materials (iron, leather, cloth) with a light fantasy adventurer feel - not museum replicas. Almost no magic glow. |
| `uncommon` | Slightly better craft. One modest accent (stitching, small gem, etched mark). Still mostly mundane. |
| `magic` | Clear magical identity: runes, mild glow veins, enchanted gem, subtle aura wisps on the prop. Distinct from plain iron. |
| `rare` | Richer materials and a memorable silhouette twist. Multiple readable details (inlays, crystals, carved relief). Strong magical motif, still clean. |
| `epic` | Elaborate craftsmanship. Layered materials, unusual shape language, bold fantasy identity. Dense but organized detail; striking magical effects. |
| `legendary` | Peak uniqueness. Iconic one-of-a-kind silhouette, extreme but readable detail, dramatic magical presence (flames, void cracks, living metal, relic light) - never muddy clutter. |
| `set` | Same complexity band as epic-leaning rare/epic, plus a **shared set motif** (repeating inlay pattern, signature gem cut, turquoise-family accent accents on the prop itself - not a UI frame). Pieces should feel like they belong to a named set family. |

Always include a Rarity lock like:

```
Rarity lock ({canonical} / {RU label}): {ladder sentence for that tier}. Every panel must match this complexity band - do not make common look legendary or legendary look plain. Silhouette must stay readable at small size.
```

## Creative Freedom / Diversity

### Batch mode (DEFAULT - loot packing)

```
Creative freedom (CRITICAL): YOU invent every item freely within the required equipment slot and rarity band - fantasy materials, silhouette twists, ornaments, damage/wear, magical motifs (if rarity allows), and color stories. Prefer classic fantasy game loot over historical armor catalogs. On EVERY generation of this prompt, invent a brand-new set of items from scratch. Maximize novelty across panels and regenerations. Never recycle the same silhouette formula with only a recolor.
```

```
Diversity: EVERY panel must show a DIFFERENT unique item of the SAME slot and SAME rarity - unique silhouette, unique materials/ornament, unique magical accents (when rarity allows). No twins, no near-duplicates, no same shape recolored.
```

### Named-item mode

Skip Creative Freedom inventing different items. Use:

```
Diversity: same named item concept in every panel; only angle, wear, and ornament/effect intensity vary within the rarity band.
```

## Slot silhouette hints (Subject)

Keep the prop type obvious for inventory scanning:

| Slot | Show |
|------|------|
| `head` | helmet / hood / crown / circlet - headwear only |
| `chest` | chest armor / robe torso piece - no full body |
| `neck` | amulet / pendant / torc - jewelry scale, large in frame |
| `shoulders` | pauldron / shoulder armor pair or single clear pauldron |
| `hands` | gloves / gauntlets |
| `ring` | ring with readable gem/band |
| `waist` | belt / sash with buckle focus |
| `legs` | greaves / leg armor / pants piece |
| `feet` | boots / sabatons |
| `trinket` | compact relic / charm / odd magical device |
| `mainhand` | weapon (sword, axe, mace, bow, staff, dagger...) - blade/haft readable |
| `offhand` | shield, focus, off-hand blade, tome - clearly off-hand prop |

## Output format (CRITICAL)

Reply with **only** one prompt.

### Batch mode (default)

```
{Item Style Lock}

{Backdrop Lock}

Setting: classic dark fantasy game world - enchanted adventurer loot, magic materials, fantasy silhouettes; physical loot prop only - no full character. NOT historical medieval reenactment, NOT steampunk, NOT Victorian industrial / brass-gear fashion.

{Layout Lock}

{Framing Lock}

{Rarity lock}

Subject / theme: fantasy game inventory item icons - equipment slot {canonical slot} ({RU label}); rarity {canonical} ({RU}); optional motif: {theme or "open fantasy loot"}. Nine different items, all that slot, all that rarity band.

{Creative freedom lock}

{Batch Diversity lock}

Panel brief: freely invent NINE unique {slot} items at {rarity} complexity - distinct fantasy silhouettes and materials; keep each readable as a ~64px inventory icon.

Negatives: photorealistic, semi-realistic, 3d, cgi, character, face, hands holding as a person, mannequin, full-body figure, busy environment scene, landscape backdrop, any backdrop color other than exact #151617, random dark gray, warm brown backdrop, olive backdrop, blue-tinted backdrop, purple-tinted backdrop, green-tinted backdrop, gradient backdrop, vignette backdrop, textured backdrop, different background color per panel, missing white sticker outline, thick white outline, heavy white border, chunky sticker stroke, fat 3-6px outline, wide white contour, historical medieval museum replica, steampunk, Victorian industrial, industrial gears as default, brass clockwork default look, rarity-colored UI frame, rarity border, rarity badge, text, watermark, UI, neon candy glow, candy oversaturation, washed-out colors, muddy grey-brown palette, soft anime shading without outlines, blurry, uneven panel sizes, labels, numbers, captions, collage with white borders, same item repeated, near-duplicate silhouettes, recolor-only twins, wrong equipment slot, legendary clutter on common rarity, plain iron on legendary rarity, item overflowing panel edges, clipped outline, elements crossing gutters
```

### Named-item mode

Same scaffold, but Subject names the item; use Named Diversity lock; Panel brief =
nine variations of that one item within the rarity band.

## Subject writing tips

- Lead with **slot + rarity** so the model cannot drift into the wrong prop type or
  complexity band.
- **Never** write project names ("Soul Split", internal docs, "match our portraits").
  Describe look only via Style / Framing locks.
- For loot volume: keep Batch mode; give only a light motif ("swamp witch",
  "frost cult", "blood raven") when useful.
- For a hero drop or unique: Named-item mode + short English identity clause.
- Prefer clear fantasy material words (lacquered leather, frost crystal, void
  glass, rune-etched steel, ember iron) over vague "cool epic item" or dry
  historical armor catalog names (avoid defaulting to kettle hat / nasal helm /
  museum sallet unless the theme asks).
- Magical FX sit **on the prop** (rune glow, ember cracks), not as a full spell
  explosion that hides the silhouette.
- Set rarity: name the set motif once ("raven-bone inlay, turquoise cabochons")
  and require every panel to share that family language.
- Workflow note (NOT in the reply): models do not remember past sheets; to avoid
  repeats, attach prior contact sheets as "avoid these designs".

## After user approves / corrects style

1. Save crops under `assets/art/items/{slot}/{id}.png`.
2. If an item-icon master reference is approved later, put it in `assets/art/approved/`
   and update STYLE_BIBLE + this skill together.
3. Do not mass-regenerate old assets unless asked.
