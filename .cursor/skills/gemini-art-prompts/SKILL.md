---
name: gemini-art-prompts
description: >-
  Writes ready-to-paste Gemini image prompts for Soul Split using the locked
  Style Bible. Use when the user asks for art prompts, Gemini prompts, unit
  portraits, ability icons, character cards, enemy portraits, or visual asset
  generation text. Portrait/unit backdrops follow the given region + location
  (e.g. Ruins-Courtyard) for lore and atmosphere.
---

# Gemini Art Prompts — Soul Split

## When to use

User wants prompts for Gemini (or similar) to generate game art. Always follow the project Style Bible; do not invent a new style.

## Before writing prompts

1. Read [`assets/art/STYLE_BIBLE.md`](../../../assets/art/STYLE_BIBLE.md).
2. Confirm asset type: `unit_card` | `portrait` | `ability_icon` | `environment`.
3. For **enemies / units / bestiary / any `unit_card`**: style is **LOCKED** to [`assets/art/approved/enemy_portrait_example.jpg`](../../../assets/art/approved/enemy_portrait_example.jpg) - waist-up portraits, NOT full-body.
4. Do **not** invent a competing stylization slant that drifts from the locked enemy portrait look.
5. For **portraits / unit_card / enemies / bestiary** (and for `environment` when the place matters): resolve **region + location** before writing the prompt (see Place lock below).

## Hard rules

- English prompts only.
- **ONE single prompt** - style, setting, layout, framing, subject, creative freedom, diversity, negatives in one block.
- **Reply with ONLY the prompt** - nothing else outside one code fence.
- Always include Style Lock + **Text Lock** + negatives inside that prompt.
- **ZERO TEXT IN ART (LOCKED, all asset types):** the image must contain **no readable writing of any kind**. No letters, numbers, words, runes-as-alphabet, signage, labels, captions, watermarks, logos, UI strings, panel indices, or fake scribbles that look like text. Decorative abstract marks are fine only if they clearly cannot be read as language. Always weave the Text Lock block into every prompt.
- **Reusable + creative (DEFAULT for character sheets):** do **NOT** hardcode per-panel character types, poses, outfits, weapons, or backdrops. Give Gemini the theme/faction and let it invent unique designs. One prompt must stay useful across repeated Gemini generations without the user re-requesting a new prompt each time.
- **Default contact-sheet**:
  - `portrait` → square **1:1**, **3×3 = 9** unique characters (bust/chest-up)
  - `unit_card` / enemies / bestiary → square **1:1**, **3×3 = 9** unique **waist-up** portraits
  - `ability_icon` → square **1:1**, **3×3 = 9** variations of the **same** ability
  - `environment` / backgrounds / hub / menu / town → **16:9**, **2×2 = 4** variations (each panel 16:9; full sheet also 16:9) unless user asks otherwise
- Even gutters; no labels, numbers, captions inside the image.
- Do not describe UI chrome, HP bars, or game grid cells in character prompts.
- **Never default to full-body** for enemies, units, or bestiary - full-body only if the user explicitly asks.
- **Exception:** only write a fixed per-panel cast list if the user **explicitly** asks for specific named roles / roster slots.

## Text Lock (LOCKED - always include for every asset type)

Bake this block into **every** prompt (portrait, unit_card, ability_icon, environment, item icons if prompted here):

```
Text lock (CRITICAL): ZERO text anywhere in the image - no letters, no numbers, no words, no readable runes, no signage, no shop signs, no posters, no banners with writing, no book pages with script, no stone inscriptions, no engraved lettering, no logos, no watermarks, no UI strings, no panel labels, no captions, no title cards, no fake scribbles that look like language. Blank sign boards / unmarked banners / abstract non-linguistic glyphs only if needed for silhouette. If a prop would normally have writing, leave it blank or use pure abstract ornament.
```

## Place lock - region + location (lore / atmosphere)

World hierarchy (canon): **Province → Region → Location**. See `design/meta/WORLD_HIERARCHY.md` and `.cursor/rules/world-hierarchy.mdc`.

- **Region** - large map area (e.g. "Руины", "Северная дорога").
- **Location** - sortie spot inside that region (e.g. "Двор", "У стены", "Катакомбы").
- User shorthand like **"Руины-Двор"** means region **Руины** + location **Двор**.

### When it applies

- **Required** for `portrait` / `unit_card` / enemies / bestiary: place drives the **simplified thematic backdrop** behind the character (lore + atmosphere), not just a generic cave/dungeon/forest.
- **Required** for `environment` / battle backdrops tied to a sortie: subject must match that region + location.
- **Not required** for `ability_icon` (flat dark magic backdrop stays as-is) unless the user explicitly asks for place flavor.

### Workflow

1. If the user names a place (Russian name, English id, or `Region-Location`), use it.
2. If they only name a region, pick or ask for the **location** when backdrops matter; do not invent a wrong spot that contradicts known zone content.
3. If neither is given for enemy/unit portraits, **ask** before generating, or state a temporary place in the prompt only when the user already implied biome/faction strongly enough.
4. Weave place into **Setting** and **Subject / theme** in English visual terms (broken courtyard masonry, frost-bitten road verge, catacomb arches…). Do **not** put Russian labels or readable place names in the image (Text Lock).
5. Backdrops stay **secondary and graphic** (Style Lock). Place lock constrains *what kind of place*, not a photoreal landscape.
6. Panel diversity: still invent unique angles / props / weather-of-mood per panel, but **all panels stay inside the same region + location visual grammar** (e.g. Ruins courtyard variants: cracked flagstones, collapsed arcade, dry fountain - not a swamp then a forest then a volcano).

### Prompt bake-in (character sheets when place is known)

Add a short Place line after Setting, for example:

```
Place lock: region "Ruins" / location "Courtyard" - every panel backdrop is a simplified stylized variant of that ruined courtyard (broken stone court, collapsed walls, dry fountain, arcade rubble); secondary to the character; no unrelated biomes.
```

Use the user's real names translated into clear English scene language. Keep Creative Freedom for characters/gear; **do not** freely invent unrelated backdrop biomes when Place lock is set.

## Setting (always weave into the prompt)

### Character sheets / environments

Pure medieval / dark fantasy. No steampunk lore or aesthetic. Fantasy craft is allowed when the subject needs it (alchemy, siege engineering, powder bombs, forge tools) - still read as classic fantasy, never Victorian steampunk / brass-gear fashion.

When region + location are known, append Place lock (above) so portrait backgrounds match lore.

```
Setting: medieval dark-fantasy game world; pure fantasy - no steampunk, no Victorian industrial, no clockwork-as-fashion.
```

### Ability icons (LOCKED)

**Magic-only visual by default.** Do **not** weave steampunk, brass gears, cogs, lenses, valves, or industrial machinery into ability-icon prompts. If the ability is explicitly alchemy / engineer / bomb craft, use fantasy craft props (vials, rune charges, siege tools) - still not steampunk. Use:

```
Setting: medieval fantasy dark-magic game world; pure magical effect only - no steampunk, no gears, no brass machinery.
```

## Stylization direction (LOCKED — match enemy portrait canon)

Locked look = `enemy_portrait_example.jpg` (thin white sticker stroke + fine clean dark linework):

- Hard cel-shade / toon with clear light-shadow planes
- **Clean fine dark internal outlines** (crisp comic ink, NOT chunky fat black strokes)
- **THIN white sticker outer outline** — hairline / fine (~2–3px relative to panel), even width, tight to the silhouette; MUST stay thin even when no reference image is attached
- **Waist-up / torso mid-portrait** — head and upper body LARGE in frame (weapons readable at chest/shoulder)
- Expressive stylized faces (NOT photoreal, NOT extreme chibi)
- Rich readable local color and strong contrast
- **Simplified thematic background per panel** matching the unit **and** the given **region + location** when provided (e.g. Ruins courtyard, not a random cave/swamp) - stylized graphic environment, secondary to the character
- NOT tiny full-body stickers on empty panels
- NOT grey-green unstructured smoke wash
- NOT thick / heavy / chunky white borders

## Style Lock (always include for portrait / unit_card / enemies / bestiary)

```
Style lock — ENEMY/UNIT PORTRAIT CANON (must match the look of attached master reference enemy_portrait_example.jpg): stylized 2D dark-fantasy game character PORTRAITS, hard toon/cel shading with clear flat light-shadow planes, CLEAN FINE dark internal outlines (crisp comic ink, not fat chunky strokes) PLUS a THIN even WHITE sticker outer outline around the silhouette — hairline/fine weight roughly 2–3px relative to each panel, tight to the edge, NEVER a thick heavy white border or fat marker stroke — waist-up / torso mid-shot framing with LARGE readable head and upper body (NOT full-body, NOT tiny distant figures), exaggerated graphic features (NOT photoreal, NOT extreme chibi), above-average graphic costume/creature detail, RICH clear local colors with strong contrast, each panel has its own simplified stylized thematic environment backdrop matching the character (cave, dungeon, forest, fire, swamp, crypt, etc.) kept secondary and graphic — entire character silhouette, thin white outline, weapons, horns, wings and props FULLY INSIDE each panel with a small safe margin (no overflow past borders, no crossing gutters) — no muddy grey-green smoke wash, no photoreal landscape, no neon glow, no candy oversaturation, no 3D render, no soft anime shading without outlines, no text, no watermark, no UI. Match THIN white outline weight, fine dark line language, cel shading, waist-up framing scale, and portrait punch of enemy_portrait_example.jpg; only the character designs change.
```

For hero `portrait` use the same rendering language, but framing may be bust/chest-up (even tighter on the face).

### Ability icon Style Lock (KEEP — same visual language as unit portraits: hard toon + thin white sticker outline)

```
Style: STRONGLY stylized 2D game skill icon - hard toon/cel shading with clear flat light-shadow planes, CLEAN FINE dark internal outlines PLUS a THIN even WHITE sticker outer outline around the silhouette (hairline/fine ~2–3px relative to panel, NEVER thick chunky white border), single centered magical symbol/effect, RICH aspect-accent color on flat solid dark backdrop, high contrast for ~64px - no character, no text, no watermark, no UI, no neon candy glow, no steampunk gears or brass machinery.
```

**Ability icon defaults (LOCKED):** always **3×3 contact sheet**; always the Style Lock above; same ability concept × 9 composition variants; **no steampunk / brass-gear props**.

## Creative Freedom Lock (DEFAULT for `portrait` / `unit_card` / enemies / bestiary)

Always include for character sheets unless the user explicitly requested a fixed roster:

```
Creative freedom (CRITICAL): do NOT follow a fixed cast list. YOU invent every design freely - face, body type, pose (within the required framing), costume, armor, cloth colors, markings, accessories, weapons/props, and a matching thematic backdrop. On EVERY generation of this prompt, invent a brand-new set of subjects from scratch - new faces, new silhouettes, new gear, new weapons, new color stories, new backdrop angles within the Place lock. Treat each run as a unique unrepeatable pack. Maximize novelty and variety across panels and across regenerations. Never recycle the same archetype, outfit formula, or weapon type across a sheet. If a Place lock is set, keep every backdrop inside that region+location; vary composition and local props, do NOT jump to unrelated biomes.
```

### Ability icons — no cast inventing

Keep ability_icon sheets locked to **one** ability concept; only composition/angle/intensity vary (see Diversity Lock below).

## Diversity Lock

### Character sheets (`portrait` / `unit_card` / enemies / bestiary)

```
Diversity: EVERY panel must show a DIFFERENT unique character/creature - unique face, unique costume/body details, unique clothing or markings, unique weapon or props, unique accessories, and a unique matching thematic backdrop. Do not repeat the same subject with only pose changes. No twins, no near-duplicates, no same armor set recolored. When Place lock is set, backdrop variety stays inside that region+location only.
```

### Ability icons

```
Diversity: same ability concept in every panel; only composition, angle, and effect intensity vary.
```

## Grid Lock

### portrait / unit_card — 3×3

```
Layout: single square image, clean 3x3 contact sheet of NINE equal panels with thin even dark gutters, ZERO text / labels / numbers / captions. Each subject is fully contained inside its own panel with a small inner margin - nothing crosses gutters or panel borders.
```

### ability_icon — 3×3

```
Layout: single square image, clean 3x3 contact sheet of NINE equal panels with thin even dark gutters, ZERO text / labels / numbers / captions. Each panel reads as a clear ~64px game skill icon.
```

### environment / backgrounds — 2×2 @ 16:9 (LOCKED)

```
Layout: single widescreen 16:9 image, clean 2x2 contact sheet of FOUR equal 16:9 panels with thin even dark gutters, ZERO text / labels / numbers / captions. Aspect ratio CRITICAL: the full sheet AND every panel must be 16:9 landscape (NOT square 1:1, NOT 4:3, NOT portrait).
```

## Framing by asset type

### portrait (heroes)

```
Framing per panel: bust/chest-up hero portrait, shoulders visible, head large in frame, simplified stylized thematic or dark graphic backdrop (secondary), aspect-colored rim light (bright but not neon).
```

### unit_card / enemies / bestiary (LOCKED framing)

```
Framing per panel: WAIST-UP / torso mid-portrait like enemy_portrait_example.jpg — head and chest large in frame, weapon or key prop visible near shoulders/torso, THIN white sticker outline (fine, not thick), simplified stylized thematic environment backdrop matching that enemy (NOT full-body, NOT empty flat panel, NOT smoke wash). CRITICAL containment: the ENTIRE character silhouette, thin white outline, weapons, horns, wings, and props must stay FULLY INSIDE the panel rectangle — no overflow past edges, no clipping through gutters, no elements crossing into neighboring cells; leave a small safe margin inside each panel border.
```

### ability_icon

```
Framing per panel: one clear magical effect centered and large, THIN white sticker outline (fine ~2–3px, not chunky), hard toon-shaded form, flat solid dark backdrop, no character, no text, no steampunk props, no brass-gear gadgets.
```

### environment / backgrounds (LOCKED — always 16:9)

Default for hubs / towns / menu / key art (unless user asks for a battle arena):

```
Framing per panel: widescreen 16:9 stylized game BACKGROUND for a static interactive hub screen. Eye-level or slight elevated 3/4 town/plaza view. Buildings must read as CLEAR SEPARATE clickable zones (shop/market stall, blacksmith forge, town hall / quest board, inn, gate, etc.) with readable silhouettes and gaps between them. Small stylized townspeople for life, but buildings stay the interaction targets — no single giant character dominating. Leave calm areas for UI overlays. NOT top-down tactical grid, NOT character portrait, NOT empty wasteland with one figure.
```

Only if the user explicitly asks for a battle arena / combat backdrop:

```
Framing per panel: widescreen 16:9 stylized medieval dark-fantasy arena backdrop for a top-down tactical grid, not cluttered, leaves space for UI and units.
```

## Output format (CRITICAL)

Reply with **only** one prompt.

### Character sheets (`portrait` / `unit_card` / enemies / bestiary)

```
{Style lock}

{Text lock}

Setting: medieval dark-fantasy game world; pure fantasy - no steampunk, no Victorian industrial, no clockwork-as-fashion.

{Place lock - region + location in English scene language; required when known}

{Layout}

{Framing - waist-up for enemies/units}

Subject / theme: {user theme / faction / mood + place - high-level only; do NOT list nine fixed designs}

{Creative freedom lock}

{Diversity lock}

Panel brief: freely invent NINE unique subjects within the theme - any mix of roles is fine as long as all nine feel distinct and game-ready; do not prescribe fixed face/gear/backdrop lists.

Negatives: photorealistic, semi-realistic, 3d, cgi, full-body figures, tiny distant characters, naturalistic wildlife illustration, soft painterly fur, timid mild cartoon realism, missing white sticker outline, thick white outline, heavy white border, chunky sticker stroke, fat marker outer outline, oversized white stroke, extreme chibi, neon glow, candy oversaturation, washed-out colors, muddy grey-brown palette, overly desaturated, soft anime shading without outlines, unstructured smoke background, grey-green fog wash, airbrushed smoky backdrop without structure, busy photo landscape, ornate frames, ANY text, letters, numbers, words, readable runes, signage, inscriptions, engraved lettering, logos, watermark, UI, blurry, uneven panel sizes, labels, numbers, captions, collage with white borders, same face repeated across panels, identical characters across panels, near-duplicate characters, recycled outfit templates, same weapon in every panel, same backdrop formula repeated, character overflowing panel edges, limbs or weapons crossing gutters, clipped silhouette cut by border, elements spilling into neighboring cells, steampunk, Victorian industrial, brass gears as fashion, clockwork costume, {extras}
```

### Ability icons (`ability_icon`)

Keep **3×3** grid + Style Lock + Text Lock. No Creative Freedom Lock for inventing different abilities. No steampunk / brass-gear clutter.

```
{Ability icon Style Lock}

{Text lock}

Setting: medieval fantasy dark-magic game world; pure magical effect only - no steampunk, no gears, no brass machinery.

{ability_icon Layout - 3x3}

{ability_icon Framing}

Subject / theme: {one ability name/concept} - same spell/effect in every panel; aspect-accent colors; pure magic silhouette.

{Ability Diversity lock}

Panel brief: nine variations of the SAME ability icon - composition, angle, and effect intensity only.

Negatives: {shared negatives} + character, face, hands, different ability concepts across panels, weak muddy silhouette, ANY text, letters, numbers, words, readable runes, logos, watermark, steampunk, gears, cogs, brass machinery, valves, lenses, mechanical props, clockwork
```

### Environments (`environment`)

Always include Text Lock. Never ask Gemini to put names on signs, road markers, or banners.

```
{environment Style - hard toon/cel, clear silhouettes}

{Text lock}

Setting: medieval dark-fantasy game world; pure fantasy - no steampunk, no Victorian industrial, no clockwork-as-fashion.

{environment Layout - 2x2 @ 16:9}

{Framing - hub or battle arena as appropriate}

Subject / theme: {location / mood - high-level}

{Creative / diversity notes for four variations}

Negatives: {environment extras} + ANY text, letters, numbers, words, readable runes, shop signs, posters, banners with writing, road signs, stone inscriptions, engraved lettering, logos, watermark, UI, labels, captions, floating nameplates
```

### Asset-specific negative extras

- **Shared text ban (all types):** `ANY text, letters, numbers, words, readable runes, signage, inscriptions, engraved lettering, logos, watermark, UI strings, labels, captions, title cards, panel indices`
- **portrait / unit_card / enemies:** `full-body standing pose, feet visible, character too small in frame, empty flat void background, smoky teal fog behind subject, overflow outside frame, cropped horns/weapons by panel edge, thick white outline, heavy white border, chunky sticker stroke, steampunk, Victorian industrial, brass gears as fashion, clockwork costume`
- **ability_icon:** `character, face, hands, different ability concepts across panels, weak muddy silhouette, thick white outline, heavy white border, chunky sticker stroke, steampunk, gears, cogs, brass machinery, valves, lenses, mechanical props, clockwork`
- **environment:** `square 1:1 crop, portrait orientation, busy unreadable clutter, neon haze, dominating foreground characters, photoreal landscape, empty wasteland with lone figure, sparse 3-building outpost, fewer than 8 buildings, merged unreadable shop facades, baked-in UI buttons or hotspot markers, any text, any labels, any captions, readable sign lettering, shop signs, posters, banners with writing, road signs, stone inscriptions, floating nameplates, planet in sky, eclipse disk, dark sun, giant celestial body, black hole sun, every panel forced night, steampunk skyline, Victorian industrial city, brass gear decoration`

## Subject writing tips

- For enemies/units/bestiary: always **waist-up portraits**, large heads/torsos - say this explicitly.
- Always state **full containment**: entire silhouette + outline + props inside the panel with a small safe margin; no overflow past the frame.
- **Region + location for lore:** when the user gives a place (e.g. "Руины-Двор"), bake Place lock into Setting/Subject so every portrait backdrop reads as that spot. Look up zone/location flavor from project content if needed; do not use a generic crypt if the sortie is a ruined courtyard.
- **Theme only, not cast list:** describe faction / region+location mood (e.g. "Ruins courtyard undead pack", "North Road roadside bandits") and optional color accents. Do **not** prescribe nine specific characters, weapons, or backdrops unless the user asked for a fixed roster.
- Require Gemini to invent pose, clothing, gear, weapons freely; backdrops stay **one unique variant per panel of the same place** when Place lock is set.
- Unique designs per panel; clear color identity; maximize novelty across regenerations of the same prompt.
- Pure fantasy on **characters/environments**; alchemy / engineer / bomb props only when the subject needs them, and never as steampunk genre.
- **Environments / backgrounds (LOCKED):** always **16:9** and **four** variations in a 2×2 contact sheet. Prefer clickable-hub town/plaza language (distinct buildings: shop, forge, town hall, etc.) when the user asks for hub / starting zone / town. Match world mood of menu key art when a reference is attached. Do **not** default to empty dual-soul wasteland key art unless the user asks for menu/title art.
- **Hub town hard rules (LOCKED):** Text Lock applies (no building labels, no sign lettering, no captions, blank boards only). NO planet / eclipse / dark sun / giant celestial disk dominating the sky. Dense city feel: about **8–10** readable buildings per panel (not a 3-building outpost). Time of day may vary across panels (dawn / day / golden hour / dusk / night) - night is optional, not default.
- **All environments / battle arenas:** same Text Lock - blank road markers, blank banners, no carved words on walls or milestones.
- **Ability icons:** keep **3×3** + toon/white-outline style; describe only the magical effect by default; **never** add steampunk / brass-gear clutter.
- Tell the user (only inside skill workflow notes, NOT in the reply): for LOCKED enemy portraits, attach `assets/art/approved/enemy_portrait_example.jpg` in Gemini as style reference — but the assistant reply must still be **prompt-only**, so bake “must match enemy_portrait_example.jpg” into the prompt itself.
- Cross-run uniqueness tip (workflow only, NOT in the reply): Gemini does not remember past generations; if the user wants to avoid repeating prior sheets, they should attach previous contact sheets as “avoid these designs”.

## After user approves / corrects style

1. Save crops under Style Bible paths.
2. If replacing the enemy portrait canon, update `approved/enemy_portrait_example.jpg` + Style Bible + this skill together.
3. Do not mass-regenerate old assets unless asked.
