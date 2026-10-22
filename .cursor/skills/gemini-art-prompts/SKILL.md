---
name: gemini-art-prompts
description: >-
  Writes ready-to-paste Gemini image prompts for Soul Split using the locked
  Style Bible. Use when the user asks for art prompts, Gemini prompts, unit
  portraits, ability icons, character cards, enemy portraits, or visual asset
  generation text.
---

# Gemini Art Prompts — Soul Split

## When to use

User wants prompts for Gemini (or similar) to generate game art. Always follow the project Style Bible; do not invent a new style.

## Before writing prompts

1. Read [`assets/art/STYLE_BIBLE.md`](../../../assets/art/STYLE_BIBLE.md).
2. Confirm asset type: `unit_card` | `portrait` | `ability_icon` | `environment`.
3. For **enemies / units / bestiary / any `unit_card`**: style is **LOCKED** to [`assets/art/approved/enemy_portrait_example.jpg`](../../../assets/art/approved/enemy_portrait_example.jpg) — waist-up portraits, NOT full-body.
4. Do **not** invent a competing stylization slant that drifts from the locked enemy portrait look.

## Hard rules

- English prompts only.
- **ONE single prompt** — style, setting, layout, framing, subject, creative freedom, diversity, negatives in one block.
- **Reply with ONLY the prompt** — nothing else outside one code fence.
- Always include Style Lock + negatives inside that prompt.
- **Reusable + creative (DEFAULT for character sheets):** do **NOT** hardcode per-panel character types, poses, outfits, weapons, or backdrops. Give Gemini the theme/faction and let it invent unique designs. One prompt must stay useful across repeated Gemini generations without the user re-requesting a new prompt each time.
- **Default contact-sheet** (one square 1:1 image):
  - `portrait` → **3×3 = 9** unique characters (bust/chest-up)
  - `unit_card` / enemies / bestiary → **3×3 = 9** unique **waist-up** portraits
  - `ability_icon` → **3×3 = 9** variations of the **same** ability
  - `environment` → **2×2 = 4** unless user asks otherwise
- Even gutters; no labels, numbers, captions inside the image.
- Do not describe UI chrome, HP bars, or game grid cells in character prompts.
- **Never default to full-body** for enemies, units, or bestiary — full-body only if the user explicitly asks.
- **Exception:** only write a fixed per-panel cast list if the user **explicitly** asks for specific named roles / roster slots.

## Setting (always weave into the prompt)

### Character sheets / environments

Medieval fantasy mixed with steampunk: magic and technology coexist, **magic predominates**. Light brass/gear/lens accents allowed; magic stays primary.

### Ability icons (LOCKED)

**Magic-only visual.** Do **not** weave steampunk, brass, gears, cogs, lenses, valves, or machinery into ability-icon prompts unless the user **explicitly** asks for a tech/steampunk ability. Use:

```
Setting: medieval fantasy dark-magic game world; pure magical effect only — no steampunk, no gears, no brass machinery.
```

## Stylization direction (LOCKED — match enemy portrait canon)

Locked look = `enemy_portrait_example.jpg` (thin white sticker stroke + fine clean dark linework):

- Hard cel-shade / toon with clear light-shadow planes
- **Clean fine dark internal outlines** (crisp comic ink, NOT chunky fat black strokes)
- **THIN white sticker outer outline** — hairline / fine (~2–3px relative to panel), even width, tight to the silhouette; MUST stay thin even when no reference image is attached
- **Waist-up / torso mid-portrait** — head and upper body LARGE in frame (weapons readable at chest/shoulder)
- Expressive stylized faces (NOT photoreal, NOT extreme chibi)
- Rich readable local color and strong contrast
- **Simplified thematic background per panel** matching the unit (cave, dungeon, forest, fire, swamp, castle, crypt…) — stylized graphic environment, secondary to the character
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
Style: STRONGLY stylized 2D game skill icon — hard toon/cel shading with clear flat light-shadow planes, CLEAN FINE dark internal outlines PLUS a THIN even WHITE sticker outer outline around the silhouette (hairline/fine ~2–3px relative to panel, NEVER thick chunky white border), single centered magical symbol/effect, RICH school-accent color on flat solid dark backdrop, high contrast for ~64px — no character, no text, no watermark, no UI, no neon candy glow, no steampunk gears or brass machinery.
```

**Ability icon defaults (LOCKED):** always **3×3 contact sheet**; always the Style Lock above; same ability concept × 9 composition variants; **no gears / brass / steampunk props**.

## Creative Freedom Lock (DEFAULT for `portrait` / `unit_card` / enemies / bestiary)

Always include for character sheets unless the user explicitly requested a fixed roster:

```
Creative freedom (CRITICAL): do NOT follow a fixed cast list. YOU invent every design freely — face, body type, pose (within the required framing), costume, armor, cloth colors, markings, accessories, weapons/props, and a matching thematic backdrop. On EVERY generation of this prompt, invent a brand-new set of subjects from scratch — new faces, new silhouettes, new gear, new weapons, new color stories, new backdrops. Treat each run as a unique unrepeatable pack. Maximize novelty and variety across panels and across regenerations. Never recycle the same archetype, outfit formula, weapon type, or backdrop formula across a sheet.
```

### Ability icons — no cast inventing

Keep ability_icon sheets locked to **one** ability concept; only composition/angle/intensity vary (see Diversity Lock below).

## Diversity Lock

### Character sheets (`portrait` / `unit_card` / enemies / bestiary)

```
Diversity: EVERY panel must show a DIFFERENT unique character/creature — unique face, unique costume/body details, unique clothing or markings, unique weapon or props, unique accessories, and a unique matching thematic backdrop. Do not repeat the same subject with only pose changes. No twins, no near-duplicates, no same armor set recolored.
```

### Ability icons

```
Diversity: same ability concept in every panel; only composition, angle, and effect intensity vary.
```

## Grid Lock

### portrait / unit_card — 3×3

```
Layout: single square image, clean 3x3 contact sheet of NINE equal panels with thin even dark gutters, no labels, no numbers, no captions. Each subject is fully contained inside its own panel with a small inner margin — nothing crosses gutters or panel borders.
```

### ability_icon — 3×3

```
Layout: single square image, clean 3x3 contact sheet of NINE equal panels with thin even dark gutters, no labels, no numbers, no captions. Each panel reads as a clear ~64px game skill icon.
```

### environment — 2×2

```
Layout: single square image, clean 2x2 contact sheet of FOUR equal panels with thin even dark gutters, no labels, no numbers, no captions.
```

## Framing by asset type

### portrait (heroes)

```
Framing per panel: bust/chest-up hero portrait, shoulders visible, head large in frame, simplified stylized thematic or dark graphic backdrop (secondary), school-colored rim light (bright but not neon).
```

### unit_card / enemies / bestiary (LOCKED framing)

```
Framing per panel: WAIST-UP / torso mid-portrait like enemy_portrait_example.jpg — head and chest large in frame, weapon or key prop visible near shoulders/torso, THIN white sticker outline (fine, not thick), simplified stylized thematic environment backdrop matching that enemy (NOT full-body, NOT empty flat panel, NOT smoke wash). CRITICAL containment: the ENTIRE character silhouette, thin white outline, weapons, horns, wings, and props must stay FULLY INSIDE the panel rectangle — no overflow past edges, no clipping through gutters, no elements crossing into neighboring cells; leave a small safe margin inside each panel border.
```

### ability_icon

```
Framing per panel: one clear magical effect centered and large, THIN white sticker outline (fine ~2–3px, not chunky), hard toon-shaded form, flat solid dark backdrop, no character, no text, no gears, no brass gadgets, no steampunk props.
```

### environment

```
Framing per panel: stylized medieval-fantasy + steampunk arena backdrop for a top-down tactical grid, not cluttered, leaves space for UI and units.
```

## Output format (CRITICAL)

Reply with **only** one prompt.

### Character sheets (`portrait` / `unit_card` / enemies / bestiary)

```
{Style lock}

Setting: medieval fantasy mixed with steampunk; magic and technology coexist, magic predominates.

{Layout}

{Framing — waist-up for enemies/units}

Subject / theme: {user theme / faction / mood — high-level only; do NOT list nine fixed designs}

{Creative freedom lock}

{Diversity lock}

Panel brief: freely invent NINE unique subjects within the theme — any mix of roles is fine as long as all nine feel distinct and game-ready; do not prescribe fixed face/gear/backdrop lists.

Negatives: photorealistic, semi-realistic, 3d, cgi, full-body figures, tiny distant characters, naturalistic wildlife illustration, soft painterly fur, timid mild cartoon realism, missing white sticker outline, thick white outline, heavy white border, chunky sticker stroke, fat marker outer outline, oversized white stroke, extreme chibi, neon glow, candy oversaturation, washed-out colors, muddy grey-brown palette, overly desaturated, soft anime shading without outlines, unstructured smoke background, grey-green fog wash, airbrushed smoky backdrop without structure, busy photo landscape, ornate frames, text, watermark, UI, blurry, uneven panel sizes, labels, numbers, captions, collage with white borders, same face repeated across panels, identical characters across panels, near-duplicate characters, recycled outfit templates, same weapon in every panel, same backdrop formula repeated, character overflowing panel edges, limbs or weapons crossing gutters, clipped silhouette cut by border, elements spilling into neighboring cells, {extras}
```

### Ability icons (`ability_icon`)

Keep **3×3** grid + Style Lock. No Creative Freedom Lock for inventing different abilities. No steampunk/gears.

```
{Ability icon Style Lock}

Setting: medieval fantasy dark-magic game world; pure magical effect only — no steampunk, no gears, no brass machinery.

{ability_icon Layout — 3x3}

{ability_icon Framing}

Subject / theme: {one ability name/concept} — same spell/effect in every panel; school-accent colors; pure magic silhouette.

{Ability Diversity lock}

Panel brief: nine variations of the SAME ability icon — composition, angle, and effect intensity only.

Negatives: {shared negatives} + character, face, hands, different ability concepts across panels, weak muddy silhouette, steampunk, gears, cogs, brass machinery, valves, lenses, mechanical props, clockwork
```

### Asset-specific negative extras

- **portrait / unit_card / enemies:** `full-body standing pose, feet visible, character too small in frame, empty flat void background, smoky teal fog behind subject, overflow outside frame, cropped horns/weapons by panel edge, thick white outline, heavy white border, chunky sticker stroke`
- **ability_icon:** `character, face, hands, different ability concepts across panels, weak muddy silhouette, thick white outline, heavy white border, chunky sticker stroke, steampunk, gears, cogs, brass machinery, valves, lenses, mechanical props, clockwork`
- **environment:** `busy unreadable clutter, neon haze, dominating foreground characters, photoreal landscape`

## Subject writing tips

- For enemies/units/bestiary: always **waist-up portraits**, large heads/torsos — say this explicitly.
- Always state **full containment**: entire silhouette + outline + props inside the panel with a small safe margin; no overflow past the frame.
- **Theme only, not cast list:** describe faction/biome/mood (e.g. “desert warrior unit roster”, “swamp cult bestiary”) and optional color accents. Do **not** prescribe nine specific characters, weapons, or backdrops unless the user asked for a fixed roster.
- Require Gemini to invent pose, clothing, gear, weapons, and matching simplified thematic backdrops freely — still **one unique backdrop per panel**, invented by the model.
- Unique designs per panel; clear color identity; maximize novelty across regenerations of the same prompt.
- Light steampunk accents OK on **characters/environments**; magic primary.
- **Ability icons:** keep **3×3** + toon/white-outline style; describe only the magical effect; **never** add gears, brass, or steampunk clutter unless the user explicitly requests a tech ability.
- Tell the user (only inside skill workflow notes, NOT in the reply): for LOCKED enemy portraits, attach `assets/art/approved/enemy_portrait_example.jpg` in Gemini as style reference — but the assistant reply must still be **prompt-only**, so bake “must match enemy_portrait_example.jpg” into the prompt itself.
- Cross-run uniqueness tip (workflow only, NOT in the reply): Gemini does not remember past generations; if the user wants to avoid repeating prior sheets, they should attach previous contact sheets as “avoid these designs”.

## After user approves / corrects style

1. Save crops under Style Bible paths.
2. If replacing the enemy portrait canon, update `approved/enemy_portrait_example.jpg` + Style Bible + this skill together.
3. Do not mass-regenerate old assets unless asked.
