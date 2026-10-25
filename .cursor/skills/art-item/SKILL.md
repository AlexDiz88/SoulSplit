---
name: art-item
description: >-
  Writes ready-to-paste Gemini image prompts for Soul Split inventory item icons
  (equipment loot) using stylized cartoon / game-toon illustration (clearly
  drawn cartoon soft volume, clean silhouette, crisp graphic detail - NOT
  photoreal, NOT semi-realistic, no noise/blur) and a LOCKED richly textured
  dark gunmetal forge-steel backdrop with soft central radial (#262A30 core ->
  #1A1E24 edges, no heavy corner crush). Requires slot and rarity. Rarity
  ladder is strict: magic = only minor gems / mild design quirk, not epic FX.
  Fantasy-first. Use when the user invokes art-item (e.g. art-item голова,
  редкая), or asks for item / loot / equipment / inventory icon prompts.
disable-model-invocation: true
---

# Art Item - Soul Split

## When to use

User wants Gemini prompts for **inventory item icons** (weapons, armor, jewelry,
trinkets). Visual language: **stylized cartoon / game-toon illustration** (see
Style Lock) - lean cartoon, not "almost real". **LOCKED textured dark gunmetal
backdrop** (see Backdrop Lock).

Canon references (attach when useful; always describe in the prompt):

- Style: [`assets/art/approved/item_icon_style_example.png`](../../../assets/art/approved/item_icon_style_example.png)
- Backdrop: [`assets/art/approved/item_icon_backdrop_example.png`](../../../assets/art/approved/item_icon_backdrop_example.png)

Legacy flat fill (`item_icon_backdrop_example_flat_legacy.png`) is history only -
do **not** use.

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
art-item штаны, магический
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
5. Remember the **exact user word** for the slot (e.g. `штаны` vs `поножи`) - it
   drives the Subject silhouette lock (see Slot silhouette hints).

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
| `legs` | ноги, поножи, штаны, legs, greaves, pants, trousers |
| `feet` | обувь, сапоги, ботинки, feet, boots, sabatons |
| `trinket` | аксессуар, тринкет, реликвия, trinket, accessory |
| `mainhand` | основная рука, оружие, меч, mainhand, weapon, sword |
| `offhand` | левая рука, щит, offhand, shield |

If the user says a weapon type that implies a hand (`меч`, `лук`, `кинжал`) without
an explicit hand slot, default slot to `mainhand` and put the weapon type into the
optional theme. If they say `щит` alone, default to `offhand`.

**CRITICAL - `legs` vs `feet`:** never mix. Boots / sabatons / footwear belong
**only** to `feet`. Pants / trousers / greaves (shin/thigh armor without boot
soles) belong to `legs`. If the user said `штаны` / `pants` / `trousers`, every
panel must be **pants/trousers** - never boots, never sabatons, never footwear.

### Rarity aliases -> canonical id

| Canonical | RU | UI frame color | Accepts |
|-----------|----|----------------|---------|
| `common` | обычная | white | обычная, обычный, common, white, белая, белый |
| `uncommon` | необычная | green | необычная, необычный, uncommon, green, зеленая, зелёная, зеленый, зелёный |
| `magic` | магическая | blue | магическая, магический, magic, magical, blue, синяя, синий |
| `rare` | редкая | yellow | редкая, редкий, rare, yellow, желтая, жёлтая, желтый, жёлтый |
| `epic` | эпическая | purple | эпическая, эпический, epic, purple, фиолетовая, фиолетовый |
| `legendary` | легендарная | orange | легендарная, легендарный, legendary, orange, оранжевая, оранжевый |
| `set` | сет / комплект | turquoise | сет, комплект, set, turquoise, бирюзовая, бирюзовый |

**UI frame colors** belong to inventory chrome. Do **not** draw colored rarity
frames, borders, or rarity badges inside the generated icon. Rarity only drives
**item complexity** (see ladder below).

## Before writing prompts

1. Parse -> resolve `slot` + `rarity` (+ optional theme) + exact slot word for
   silhouette.
2. Read [`assets/art/STYLE_BIBLE.md`](../../../assets/art/STYLE_BIBLE.md) item
   icons section. Prefer attaching
   `approved/item_icon_style_example.png` +
   `approved/item_icon_backdrop_example.png` as visual refs when the tool allows.
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
- Style is **LOCKED stylized cartoon / game-toon illustration** - clearly drawn
  cartoon soft volume, bold readable shapes, clean silhouette, crisp graphic
  detail - **not** photoreal, **not** semi-realistic, **not** product photo /
  PBR metal. Soft volume OK; look must read as cartoon game art at a glance.
  **No** noise grain mush, **no** soft blurry "soap" rendering.
- Backdrop is **LOCKED** richly textured dark gunmetal forge-steel surface with
  a **very soft** central radial (see Backdrop Lock) - identical recipe on every
  panel. **No** flat solid `#1E1F21` void. **No** heavy crushed corner vignette.
  **No** scenic environments. Gutters: solid `#0A0B0C` only.
- Slot silhouette must match the user's word exactly (pants stay pants; boots
  stay boots). Wrong prop type = failed sheet.
- Rarity complexity must match the ladder - magic must **not** look epic.
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

Lean **cartoon**, not "soft semi-real". Models drift realistic if the lock sounds
halfway - push illustrated game-toon hard every time.

```
Style lock - FANTASY INVENTORY ITEM ICONS (CARTOON FIRST): stylized cartoon / game-toon 2D dark-fantasy inventory item icons - CLEARLY DRAWN cartoon illustration, not a photo and not almost-real. Soft readable cartoon volume with smooth gentle cel-shaded / painterly toon gradients (NOT hard flat poster comic, NOT photoreal, NOT semi-realistic, NOT PBR). Bold simplified readable shapes, CLEAN dark silhouette contour and confident graphic linework, crisp stylized material cues (toon metal sheen, painted leather, graphic cloth) with NO photographic micro-detail, NO digital noise, NO blurry soap softening. Single centered readable item LARGE in frame, RICH clear local fantasy materials and strong contrast for ~64px inventory readability - entire item silhouette FULLY INSIDE each panel with a small safe margin. CRITICAL: at a glance each panel must look like a cartoon game inventory icon, not a product photo or 3D render. No photoreal, no semi-realistic, no hyperrealistic metal/leather, no studio product photography, no 3D CGI product render, no hard realism, no muddy grain, no soft focus haze on the item, no neon candy glow, no text, no watermark, no UI, no rarity-colored frames or borders. Only the item designs change; backdrop stays the same locked textured gunmetal recipe.
```

## Backdrop Lock (always include - CRITICAL)

Use this description **verbatim** (or extremely close) in every prompt. Soft radial
only - **not** strong corner blackout. Match
`assets/art/approved/item_icon_backdrop_example.png`.

```
Backdrop lock (CRITICAL - identical every panel): A standalone, richly textured background surface of exceptionally dark, desaturated gunmetal gray. It is not a solid color but features a subtle, hammered and brushed industrial dark metal texture with minor scuffs and patina variations, reminiscent of a weathered weapon forge steel surface. It has a very soft, centrally focused radial illumination gradient, where the core samples around a dark, neutral cool gray (#262A30), deepening to an even darker value near the extreme edges (#1A1E24), providing a clean, premium-grade item inventory asset look. The surface is uniform and viewed top-down. CRITICAL: keep the radial VERY SOFT - gentle falloff only, NO heavy crushed black corners, NO strong vignette blackout, NO spotlight hole, NO flat solid #1E1F21 void fill, NO scenic environment, NO props behind the item. Same locked backdrop recipe on every panel. Gutters between panels: solid #0A0B0C only.
```

## Setting (always weave in)

```
Setting: classic dark fantasy game world - enchanted adventurer loot, magic materials, fantasy silhouettes; physical loot prop only - no full character. NOT historical medieval reenactment, NOT steampunk, NOT Victorian industrial / brass-gear fashion.
```

## Layout Lock

```
Layout: single square image, clean 3x3 contact sheet of NINE equal panels with thin even gutters (#0A0B0C only), no labels, no numbers, no captions. Each panel reads as a clear ~64px game inventory item icon on the SAME locked textured dark gunmetal forge-steel backdrop.
```

## Framing Lock

```
Framing per panel: one clear equipment item centered and large, orthographic or slight 3/4 view, stylized cartoon / game-toon materials (clearly drawn, not photoreal) with clean dark silhouette contour and bold readable shapes, crisp graphic detail (no noise, no blur, no photo micro-texture), SAME locked textured gunmetal backdrop with very soft central radial (#262A30 -> #1A1E24, no heavy corner crush, no scenic fill), no character, no hands, no mannequin, no text, no rarity frame.
```

## Rarity -> complexity ladder (REQUIRED - bake into every prompt)

Translate the resolved rarity into a **Rarity lock** paragraph. Stay inside the
band - overshooting (magic looking epic) is a failed sheet.

| Rarity | Complexity in the icon |
|--------|------------------------|
| `common` | Very simple, primitive fantasy starter gear. Plain silhouette. Minimal or no ornament. Ordinary materials (iron, leather, cloth). Often worn / scuffed / slightly ragged. Almost no polish. **No** gems, runes, glow. |
| `uncommon` | Same basic silhouette language as common, but tidy and reliable. Clean craft, neat stitching/rivets, intact edges. Still mostly mundane. At most one tiny non-magical accent (stitch line, small stud). **No** glow, **no** runes, **no** magical aura. |
| `magic` | Still mostly mundane gear with **MINOR** magical tells only: a small gem inset, a slight design quirk, faint unusual material hint. **Not** dramatic. **No** heavy rune fields, **no** strong glow, **no** aura clouds, **no** lava cracks, **no** multiple big gems. If it looks epic at a glance, it is wrong. |
| `rare` | High-quality advanced look - reliable and refined. Medium amount of small details. More magical presence than magic tier: occasional light glow OR light runes (not both stacked heavily). Clean silhouette, still readable at ~64px. |
| `epic` | Unique design language. Several visual effects (including glow and/or runes). Large amount of fine detail, still organized and readable - not muddy clutter. |
| `legendary` | Extraordinary one-of-a-kind design. Peak fantasy identity, dramatic but readable magical presence - never muddy clutter. |
| `set` | Same complexity band as legendary/epic peak, plus a **shared set motif** (repeating inlay pattern, signature gem cut, turquoise-family accents on the prop itself - not a UI frame). Pieces must feel like one named set family. |

Always include a Rarity lock like:

```
Rarity lock ({canonical} / {RU label}): {ladder sentence for that tier}. Every panel must match this complexity band STRICTLY - do not make magic look epic/rare, do not make common look magical. Silhouette must stay readable at small size.
```

## Creative Freedom / Diversity

### Batch mode (DEFAULT - loot packing)

```
Creative freedom (CRITICAL): YOU invent every ITEM freely within the required equipment slot and rarity band - fantasy materials, silhouette twists, ornaments, damage/wear, and magical motifs ONLY if the rarity ladder allows them. Prefer classic fantasy game loot over historical armor catalogs. Backdrop is LOCKED identical on every panel (same textured gunmetal forge-steel recipe with soft radial) - do NOT invent new backdrop hues, flat fills, scenic washes, or per-panel backdrop recipes. On EVERY generation of this prompt, invent a brand-new set of items from scratch. Maximize novelty across item panels and regenerations. Never recycle the same silhouette formula with only a recolor.
```

```
Diversity: EVERY panel must show a DIFFERENT unique item of the SAME slot and SAME rarity - unique silhouette, unique materials/ornament, unique magical accents ONLY when rarity allows. Backdrop stays the SAME locked textured gunmetal recipe on every panel. No twins, no near-duplicates, no same shape recolored, no wrong prop type for the slot.
```

### Named-item mode

Skip Creative Freedom inventing different items. Use:

```
Diversity: same named item concept in every panel; only angle, wear, and ornament/effect intensity vary within the rarity band. Backdrop stays the same locked textured gunmetal recipe on every panel.
```

## Slot silhouette hints (Subject)

Keep the prop type obvious for inventory scanning. Bake the correct row into
Subject / Panel brief. If the user's exact word is listed, prefer that row's
**Show** over the generic canonical row.

| Slot / user word | Show | NEVER show |
|------------------|------|------------|
| `head` | helmet / hood / crown / circlet - headwear only | - |
| `chest` | chest armor / robe torso piece - no full body | full body |
| `neck` | amulet / pendant / torc - jewelry scale, large in frame | - |
| `shoulders` | pauldron / shoulder armor pair or single clear pauldron | - |
| `hands` | gloves / gauntlets | - |
| `ring` | ring with readable gem/band | - |
| `waist` | belt / sash with buckle focus | - |
| `legs` + `штаны` / `pants` / `trousers` | **pants / trousers / hose only** - cloth or leather legwear, waist-to-ankle (or cropped), belt loops/pockets OK | boots, sabatons, footwear, shoe soles, greaves-as-boots |
| `legs` + `поножи` / `greaves` | shin/thigh greaves or leg plate - armor pieces, not footwear | boots with soles, shoes |
| `legs` (generic `ноги` / `legs`) | pants OR greaves (mix OK across panels) - still **no footwear** | boots, sabatons, shoes |
| `feet` | boots / sabatons only | pants, trousers |
| `trinket` | compact relic / charm / odd magical device | - |
| `mainhand` | weapon (sword, axe, mace, bow, staff, dagger...) - blade/haft readable | - |
| `offhand` | shield, focus, off-hand blade, tome - clearly off-hand prop | - |

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

Subject / theme: fantasy game inventory item icons - equipment slot {canonical slot} ({RU / user word}); rarity {canonical} ({RU}); optional motif: {theme or "open fantasy loot"}. Nine different items, all that slot, all that rarity band. Silhouette lock: {exact Show from slot table for the user word}.

{Creative freedom lock}

{Batch Diversity lock}

Panel brief: freely invent NINE unique {exact prop type} at {rarity} complexity ONLY - stay inside the rarity ladder; distinct fantasy silhouettes and materials; stylized cartoon / game-toon illustration (clearly drawn cartoon, NOT photoreal, NOT semi-realistic); bold readable shapes; crisp graphic detail with no noise and no blur; every panel on the SAME locked textured gunmetal backdrop with very soft radial (#262A30 -> #1A1E24, no heavy corner crush); keep each readable as a ~64px inventory icon.

Negatives: photorealistic, semi-realistic, almost-realistic, hyperrealistic, hard realism, realistic product photo, studio product photography, photographic metal reflections, PBR materials, hyperdetailed micro-scratches, pore-level leather, 3d cgi product render, Unreal Engine render, octane render, character, face, hands holding as a person, mannequin, full-body figure, busy environment scene, landscape backdrop, scenic backdrop, forest, trees, cave, ruins, moon, sky, fire scene, architecture, props in background, treasure chest backdrop, coin pile backdrop, flat solid #1E1F21 void fill, flat solid charcoal void, painterly cloudy wash backdrop, grainy smoke backdrop, textured abstract colorful backdrop, heavy crushed black corner vignette, strong vignette blackout, spotlight hole, harsh radial, pale gray backdrop, light gray backdrop, whitish backdrop, white haze, colorful blue/green/purple fills, brown backdrop, different backdrop recipe per panel, digital noise on item, film grain mush, blurry soap softening, soft focus on item, washed-out muddy detail, historical medieval museum replica, steampunk, Victorian industrial, industrial gears as default, brass clockwork default look, rarity-colored UI frame, rarity border, rarity badge, text, watermark, UI, neon candy glow, candy oversaturation, washed-out colors, hard flat poster comic with zero volume, blurry, uneven panel sizes, labels, numbers, captions, collage with white borders, same item repeated, near-duplicate silhouettes, recolor-only twins, wrong equipment slot, boots when pants requested, sabatons when pants requested, footwear in legs slot, pants in feet slot, epic glow on magic rarity, heavy rune fields on magic rarity, lava cracks on magic rarity, multiple large gems on magic rarity, aura clouds on magic rarity, legendary clutter on common rarity, plain iron on legendary rarity, item overflowing panel edges, clipped silhouette, elements crossing gutters
```

### Named-item mode

Same scaffold, but Subject names the item; use Named Diversity lock; Panel brief =
nine variations of that one item within the rarity band (backdrop stays locked
textured gunmetal recipe on every panel).

## Subject writing tips

- Lead with **slot + rarity + exact prop type** so the model cannot drift into the
  wrong silhouette or complexity band.
- For `штаны` / pants: write explicitly "nine different pants/trousers - NEVER
  boots".
- For `magic`: write explicitly "MINOR magical tells only - small gems / mild
  design quirk - NOT epic FX".
- Say **stylized cartoon / game-toon** (clearly drawn, not photoreal / not
  semi-realistic) and **crisp graphic detail, no noise, no blur** so the model
  does not drift into realism, product photo, hard poster flats, or mushy soft-focus.
- **Never** write project names ("Soul Split", internal docs, "match our portraits").
  Describe look only via Style / Framing locks. Optionally note "match the attached
  style/backdrop references" when those files are attached.
- For loot volume: keep Batch mode; give only a light motif ("swamp witch",
  "frost cult", "blood raven") when useful.
- For a hero drop or unique: Named-item mode + short English identity clause.
- Prefer clear fantasy material words (lacquered leather, frost crystal, void
  glass, rune-etched steel, ember iron) over vague "cool epic item" or dry
  historical armor catalog names - but only at rarities that allow that density.
- Magical FX sit **on the prop** and must match the rarity ladder - never a full
  spell explosion that hides the silhouette.
- Set rarity: name the set motif once ("raven-bone inlay, turquoise cabochons")
  and require every panel to share that family language.
- Workflow note (NOT in the reply): models do not remember past sheets; to avoid
  repeats, attach prior contact sheets as "avoid these designs". Attach
  `item_icon_style_example.png` + `item_icon_backdrop_example.png` as positive
  refs when possible. Do **not** attach the flat legacy backdrop as canon.

## After user approves / corrects style

1. Save crops under `assets/art/items/{slot}/{id}.png`.
2. Style canon: stylized cartoon / game-toon illustration (cartoon-first, not
   semi-real) - `approved/item_icon_style_example.png`.
   Backdrop canon: textured gunmetal + soft radial -
   `approved/item_icon_backdrop_example.png` (core `#262A30`, edges `#1A1E24`,
   no heavy corner crush). Flat legacy file is not active.
3. Do not mass-regenerate old assets unless asked.
