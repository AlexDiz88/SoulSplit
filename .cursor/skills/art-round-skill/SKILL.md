---
name: art-round-skill
description: >-
  Writes ready-to-paste Gemini prompts for Soul Split medallion ability icons
  (circular frame by default; diamond/rhombus frame for passives; thick black
  ink, jagged aspect-colored aura, painterly fill). Before drafting, fully reads
  the ability catalog card (INDEX + full design/abilities markdown) so the
  subject matches description, application type, zone, and effect. Passive
  abilities (user said "пассивное", or card/combat marks пассив / targetMode
  passive) must be drawn for a diamond medallion, not a circle. Aspect comes
  from the catalog card when the ability already exists - the user only needs
  the ability name (optional aspect override; optional parentheses = required
  visual motif that must not appear in Negatives). Enemy / враги abilities
  default to neutral accents from no_image.png, unless the ability name clearly
  shows an element (shadow, fire, cold, poison, etc.) - then use that element's
  palette. Use when the user invokes /art-round-skill or art-round-skill
  (e.g. /art-round-skill Приказ (тычок пальцем), /art-round-skill За спинами
  пассивное), or asks for round/circular/medallion/diamond skill icons - not
  the thin white sticker ability-icon canon from gemini-art-prompts.
disable-model-invocation: true
---

# Art Round Skill — Soul Split

## When to use

User wants Gemini prompts for **medallion** ability icons (circle for actives,
**diamond / rhombus** for passives). This skill is a **separate canon** from
`gemini-art-prompts` ability icons (thin white sticker + flat dark backdrop).
Do **not** mix the two styles.

## Invocation (user input)

User writes the skill name, then **ability name**. Aspect after a comma is
**optional** when the ability is already in the catalog. Optional
**parentheses** after the name are a required visual motif. Optional word
**пассивное** / **passive** marks a passive (diamond frame):

```
/art-round-skill {название способности}
/art-round-skill {название способности}, {аспект}
/art-round-skill {название способности} ({что увидеть на иконке})
/art-round-skill {название} пассивное
/art-round-skill {название} пассивное ({мотив})
```

Examples:

```
/art-round-skill дыхание дракона
/art-round-skill скорость ветра
/art-round-skill ледяной щит, лёд
/art-round-skill удар тени, тьма
/art-round-skill Приказ (тычок пальцем)
/art-round-skill За спинами пассивное
```

Parse rules:

1. Strip leading `/art-round-skill` or `art-round-skill` (with or without slash).
2. **Passive flag from invocation (optional):** if the remainder contains the
   standalone word `пассивное` / `пассивная` / `пассивный` / `passive` /
   `пассив` (case-insensitive, as its own token), set `passive = true` and
   **strip that word** from the remainder before further parsing. Do not treat
   it as part of the ability name / catalog lookup key.
3. **Parenthetical motif (optional):** if the remainder contains `(...)`, extract
   the text inside the **first** pair of parentheses as `motif`. Strip that
   `(...)` from the remainder before further parsing. The motif is a **required
   visual** the Subject must depict (translate to clear English silhouette).
   Motif overrides default bans when they conflict (e.g. finger / hand / face
   fragment) - see Motif override below.
4. If the remainder (after stripping parentheses / passive word) contains a
   comma, split on the **first comma**: param 1 = ability name, param 2 =
   optional aspect. If no comma - the whole remainder is the ability name;
   aspect is unset.
5. **Param 1** = ability name / lookup key (may be Russian). Resolve against the
   catalog **before** accents or Subject English. Do **not** treat the motif or
   the passive word as part of the catalog lookup key.
6. **Aspect resolution (catalog first):**
   - If the ability is found in INDEX / card: take aspect from the card
     (`aspect` / `aspect_id` / INDEX `аспект`). Do **not** ask the user for
     aspect.
   - Optional param 2 may be present; if it **conflicts** with the card, prefer
     the card's `aspect` / `aspect_id` for accents.
   - If the ability is **not** in the catalog and param 2 is missing or unknown -
     ask once for aspect; do not invent an aspect.
7. **Passive resolution (after catalog lookup)** - see Passive / diamond frame
   below. Invocation flag OR card/combat data can set `passive = true`.

### Motif override (parentheses)

When `motif` is set:

1. Put it in **Subject** as a concrete English visual (e.g. `тычок пальцем` →
   pointing finger jab / finger poke silhouette). Keep it readable at ~64px.
2. **Do not** put the motif or its English synonyms into **Negatives**.
3. If the motif needs a hand, finger, face fragment, or similar prop that the
   default locks ban: remove those bans from Style Lock, Framing Lock, and
   Negatives for **this prompt only**. Still forbid full characters, enemies,
   heroes, UI, text, and steampunk unless the motif explicitly asks for them.
4. Motif shapes the silhouette; the catalog card still wins for *which ability*
   (buff vs damage, ally vs foe, etc.). Do not replace the spell with a
   different effect.

## Passive / diamond frame

UI clips passives to a **rhombus** (diamond). The generated art must be drawn
**for that diamond**, not as a circle that later gets cut badly.

Set `passive = true` if **any** of these hold:

1. User added `пассивное` / `пассивная` / `пассивный` / `passive` / `пассив` in
   the invocation (already stripped from the lookup name).
2. Catalog card **Тип применения** contains `пассив` (e.g. `пассив`,
   `пассивная`).
3. INDEX column `тип` is `пассив` / `passive`.
4. Combat def (optional check) has `targetMode: "passive"` in
   `src/abilities/definitions.ts` / `src/types.ts`.

If none of the above: `passive = false` → **circular** medallion (default).

When `passive = true`:

- Use **Diamond Style Lock**, **Diamond Framing Lock**, and diamond wording in
  Layout / Subject / Panel brief / Negatives (below).
- Still the same ink / jagged aura / painterly fill language as the round
  example - only the **outer shape** changes to a diamond (point up).
- Compose the central effect so it stays readable **inside the diamond** (keep
  important silhouette away from the four sharp corners; leave margin for the
  jagged aura outside the diamond ring).
- Prefer attaching the same `ability_icon_round_example.png` for ink/aura
  language; the prompt must still demand a **diamond** frame, not a circle.
- Do **not** draw a circular medallion "to be cropped later".

## Aspect → accent colors

Use these for jagged outer aura, effect core, and medallion accents (rich, not neon):

| Aspect (RU / aliases) | Accent in prompt |
|-----------------------|------------------|
| огонь, fire, flame | orange / gold / yellow-core fire |
| лёд, ice, frost, вода, water | cyan / teal / ice-blue |
| тьма, shadow, dark, некро | violet / deep purple / shadow |
| природа, nature, earth, земля | olive / moss green / earth amber |
| свет, holy, light | sand-gold / warm white / pale gold |
| молния, lightning, storm | electric cyan / pale yellow arcs |
| кровь, blood | crimson / dark red |
| аркан, arcane, magic | magenta / arcane violet |
| яд, poison, toxic | toxic green / bilious yellow-green / venom |
| враги, enemies, enemy | **default neutral** - see Enemy accent resolution below |

### Enemy accent resolution (`враги` / `enemies`)

Catalog aspect `враги` does **not** mean "always purple" and does **not** always
mean neutral. Resolve accents in this order:

1. **Element cue in the ability name** (param 1, card `name`, English aliases,
   and technical `id` / icon stem). If a clear element word is present, use that
   row from the accent table above - even though aspect_id is `enemies`.
2. Else **element cue in Описание** only when unmistakable as the spell's
   identity (e.g. "выпускает стрелу тьмы") - same mapping.
3. Else **neutral** matching `assets/art/skills/no_image.png`: off-white / pale
   ivory / light beige effect core; faint wispy light-gray / pale ash jagged
   outer aura; dark olive-gray weathered medallion fill. No purple, no
   elemental chroma, no neon.

Element cue → palette (same accents as the table; RU / EN / id stems):

| Cue examples | Use accents of |
|--------------|----------------|
| fire, flame, огонь, пламя, burn, жар | огонь |
| ice, frost, cold, лёд, лед, холод, freeze | лёд |
| shadow, dark, тьма, тёмн, темн, void, некро, shadowbolt | тьма |
| poison, venom, toxic, яд, отрава | яд |
| lightning, storm, thunder, молния, гроза | молния |
| nature, root, earth, природа, корень, земля | природа |
| holy, light, свет, sacred | свет |
| blood, кровь | кровь |
| arcane, magic, аркан | аркан |

Examples:

- `Стрела тьмы` / `dark-arrow` / Shadowbolt → **тьма** (violet / deep purple)
- `Приказ` (no element in name) → **neutral** `no_image.png`
- enemy fire breath named with огонь/fire → **огонь**

Do **not** invent an element from combat numbers alone. If the cue is ambiguous,
prefer neutral.

If the user names an aspect not in the table, derive a close non-neon accent pair and state it in the Subject line.

## Before writing prompts (CRITICAL - research first)

Do **not** draft the Gemini prompt until ability data is fully read. Guessing from the name alone causes mismatches (wrong shape, wrong effect, invented props).

1. Parse invocation → ability name (+ optional aspect override + optional
   parenthetical `motif` + optional passive word).
2. Open [`design/abilities/INDEX.md`](../../../design/abilities/INDEX.md). Find
   the row by **название** (param 1, without motif / without `пассивное`). Note
   `id`, `aspect_id`, `аспект`, `тип`, and `крючок`. Do not require the user to
   pass aspect for a catalog hit.
3. If no INDEX match: search `design/abilities/**/*.md` by frontmatter `name` /
   heading / Russian aliases. If still missing - ask once for ability (and for
   aspect if unset); do **not** invent a card or visual from the name alone.
4. Read the matched card **in full** (`design/abilities/{aspect_id}/{id}.md`):
   - frontmatter: `id`, `icon`, `name`, `aspect`, `aspect_id` ← **source of
     aspect for accents**
   - body: **Описание**, **Тип применения**, **Зона применения**, **Тип эффекта**, **Числа**, **Доп** (if any)
   - for `зона`: the whole `## Зона` block (anchor, pattern, damage tiers) - use only as **visual metaphor** (direction, spread, focus), never draw a grid / UI / numbers
5. Resolve **Passive / diamond frame**: invocation flag, INDEX `тип`, card
   **Тип применения**, and optional combat `targetMode: "passive"`. Choose
   circle vs diamond locks before drafting.
6. Map accents: for normal aspects use the table; for `враги` / `enemies` run
   **Enemy accent resolution** (element cue in name → elemental palette;
   otherwise neutral `no_image.png`).
7. If motif is set, plan Subject + Negatives per Motif override (never ban the
   requested motif).
8. If the card `icon:` already points at a real file under `assets/art/skills/` (not `no_image.png`), glance at it so the new prompt stays consistent with an approved look when regenerating. For enemy skills on the **neutral** path, keep
   [`assets/art/skills/no_image.png`](../../../assets/art/skills/no_image.png) in
   mind as the color reference (attach in Gemini when useful).
9. Optionally cross-check combat wiring in `src/abilities/definitions.ts` / `src/abilities/catalog.ts` only if the card is ambiguous; **design card wins** for what the icon should depict.
10. Prefer attaching [`assets/art/approved/ability_icon_round_example.png`](../../../assets/art/approved/ability_icon_round_example.png) as style reference in Gemini (framing / ink / medallion). For enemy abilities on the **neutral** path, also attach `no_image.png` for palette. Passive prompts still attach the round example for ink language, but demand a **diamond** frame in the text.
11. Output path after approval: `assets/art/skills/{icon from card, or id with underscores}.png` (crop one panel from the sheet).

### Ground the Subject from the card (do not invent)

Build the English Subject from researched facts only:

| Card field | Use in Subject |
|------------|----------------|
| name / Описание | primary magical silhouette and action verb |
| Тип эффекта | damage → strike / blast / projectile; shield / buff → protective form; DoT / debuff → lingering mark / curse motif; stun / control → binding / impact freeze |
| Тип применения | `цель` → focused single-target symbol; `зона` → cone / area / directional burst matching the zone metaphor; `на себя` → self-aura / personal ward; `все враги` → wide / omnidirectional pulse; `пассив` → always-on aura / ward / stance mark (and forces **diamond** medallion) |
| Зона (if any) | direction and shape only (e.g. forward cone upward from source, ring around anchor) - no grid cells, no letters X/A/B |
| Аспект + accents | jagged aura + effect colors from the aspect table |
| Числа / Доп | intensity and secondary motifs only if they are **visible magic** (burn embers, ice shards, blood drops). Ignore cooldown, mana, and raw numbers. "Пассивная" in Доп reinforces diamond frame |

**Forbidden inventions (default):** full characters, full faces, hands, enemies,
heroes, UI, damage digits, aspect logos as text, steampunk / brass-gear props,
or a different spell than the card (e.g. do not draw a fireball for a breath
cone, or a weapon swing for a pure self-buff).

**Exception:** a parenthetical `motif` may require a hand, finger, face fragment,
or similar prop - then that prop is allowed and must appear. Still no full
character cast, no UI, no steampunk unless requested.

If the user name disagrees with the catalog card, **trust the catalog** and still
depict that ability. Aspect accents always come from the card's `aspect` /
`aspect_id` when the ability exists in the catalog (optional param 2 is ignored
on conflict).

## Hard rules

- English prompts only.
- **ONE single prompt** — style, setting, layout, framing, subject, diversity, negatives in one block.
- **Reply with ONLY the prompt** — nothing else outside one code fence.
- Always include Style Lock (Round **or** Diamond by passive) + matching negatives.
- Passives → diamond medallion; actives → circular medallion. Never draw a circle for a known passive.
- Always **3×3 contact sheet** of the **same** ability (composition / angle / intensity only).
- Even gutters; no labels, numbers, captions inside the image.
- **Magic-only visual.** No steampunk, brass gears, cogs, lenses, valves, or industrial machinery. If the ability is explicitly alchemy / engineer / bomb craft, use fantasy craft props only - still not steampunk.
- Do **not** use the thin white sticker outline from unit/portrait canon.
- Do **not** invent a competing slant that drifts from `ability_icon_round_example.png` ink language (shape may be diamond for passives).
- Do **not** write the prompt before completing the research steps above.

## Locked look (match round example ink; shape = circle or diamond)

Locked look ink/aura = `ability_icon_round_example.png` (circle reference). Shape
depends on `passive`:

- **Active (`passive = false`):** **Circular medallion** — thick dark circular
  ring + thin **jagged / sketchy aspect-colored outer aura**
- **Passive (`passive = true`):** **Diamond / rhombus medallion** (point up) —
  thick dark diamond frame ring + the same jagged aspect-colored outer aura
  outside the diamond edges. Same ink weight and painterly fill as the round
  canon; **not** a circle.
- Central magical effect large and readable, **heavy variable-width black ink outlines**
- **Painterly / textured** fill inside the medallion (subtle brush grain, radial vignette) — not flat solid void
- High-contrast aspect accent colors; bright core / highlights on the effect
- Hand-drawn inked fantasy game skill icon (Hades / Darkest Dungeon adjacent punch) — not photoreal, not soft airbrush anime
- No full character, no full face, no text, no UI, no white sticker outer outline
- No hands by **default**; allow hand / finger / motif prop when user set a
  parenthetical motif that requires them
- Enemy (`враги`) accents: default neutral per `no_image.png`; if the ability
  name clearly shows an element (shadow / fire / cold / poison / …), use that
  element's palette from the accent table instead

## Setting (always weave in)

```
Setting: medieval fantasy dark-magic game world; pure magical effect only - no steampunk, no gears, no brass machinery.
```

## Round Style Lock (actives — `passive = false`)

Default (no hand/finger motif):

```
Style lock — ROUND MEDALLION ABILITY ICON CANON (must match the look of attached master reference ability_icon_round_example.png): stylized 2D dark-fantasy game SKILL ICONS as CIRCULAR medallions — thick dark circular frame ring, thin jagged sketchy aspect-colored energy/aura strokes outside the ring matching the element, central magical effect LARGE and readable with HEAVY variable-width BLACK ink outlines (chunky comic ink OK here), painterly textured dark fill inside the circle with subtle brush grain and soft radial vignette (NOT flat empty solid, NOT busy scene), RICH aspect-accent color with bright luminous core/highlights on the effect, high contrast for ~64px readability — no thin white sticker outline, no full character, no full face, no hands, no text, no watermark, no UI, no neon candy glow, no steampunk gears or brass machinery, no 3D render. Match circular framing, ink weight, jagged outer aura language, painterly medallion fill, and punch of ability_icon_round_example.png; only the ability subject changes.
```

## Diamond Style Lock (passives — `passive = true`)

Default (no hand/finger motif):

```
Style lock — DIAMOND MEDALLION PASSIVE ABILITY ICON CANON (same ink / aura / fill language as attached master reference ability_icon_round_example.png, but OUTER SHAPE IS A DIAMOND / RHOMBUS, NOT A CIRCLE): stylized 2D dark-fantasy game SKILL ICONS as DIAMOND medallions (rhombus, point UP) — thick dark diamond frame ring, thin jagged sketchy aspect-colored energy/aura strokes outside the diamond edges matching the element, central magical effect LARGE and readable INSIDE the diamond with HEAVY variable-width BLACK ink outlines (chunky comic ink OK here), keep silhouette clear of the four sharp corners, painterly textured dark fill inside the diamond with subtle brush grain and soft radial vignette (NOT flat empty solid, NOT busy scene), RICH aspect-accent color with bright luminous core/highlights on the effect, high contrast for ~64px readability — no circular medallion, no round frame, no thin white sticker outline, no full character, no full face, no hands, no text, no watermark, no UI, no neon candy glow, no steampunk gears or brass machinery, no 3D render. Match ink weight, jagged outer aura language, painterly medallion fill, and punch of ability_icon_round_example.png; change only the frame to diamond and the ability subject.
```

When motif requires a hand / finger / similar prop, use the same lock (round or
diamond) but **drop** `no hands` (and any other ban that would block the motif).
Keep bans on full character cast, UI, text, steampunk, neon, 3D.

For enemy abilities on the **neutral** path, also bake in: accents match
attached `no_image.png` (off-white / pale ivory core, light-gray jagged aura,
dark olive-gray fill) - no purple, no violet, no elemental chroma. If Enemy
accent resolution picked an element from the name, bake that element's accents
instead (and do not force the neutral ban on that element's colors).

## Layout Lock

Active (`passive = false`):

```
Layout: single square image, clean 3x3 contact sheet of NINE equal panels with thin even dark gutters, no labels, no numbers, no captions. Each panel is one complete circular medallion skill icon that reads clearly at ~64px; leave a small safe margin so the jagged outer aura stays fully inside each panel (no clipping, no crossing gutters).
```

Passive (`passive = true`):

```
Layout: single square image, clean 3x3 contact sheet of NINE equal panels with thin even dark gutters, no labels, no numbers, no captions. Each panel is one complete DIAMOND / RHOMBUS medallion skill icon (point up) that reads clearly at ~64px; leave a small safe margin so the jagged outer aura stays fully inside each panel (no clipping, no crossing gutters).
```

## Framing Lock

Active default (`passive = false`):

```
Framing per panel: one circular medallion — thick dark ring, jagged aspect-colored outer aura, one clear magical effect centered and large inside the circle on a painterly textured dark fill; no full character, no text, no gears, no brass gadgets, no steampunk props, no white sticker outline.
```

Passive default (`passive = true`):

```
Framing per panel: one DIAMOND / RHOMBUS medallion (point up) — thick dark diamond ring, jagged aspect-colored outer aura outside the diamond edges, one clear magical effect centered and large inside the diamond on a painterly textured dark fill, silhouette kept away from the four sharp corners; no circular frame, no full character, no text, no gears, no brass gadgets, no steampunk props, no white sticker outline.
```

With hand/finger motif: same framing (circle or diamond), but explicitly allow
the motif prop (e.g. "a single pointing finger / finger-poke silhouette is
allowed and required").

## Diversity Lock

```
Diversity: same ability concept in every panel; only composition, angle, and effect intensity vary.
```

## Output format (CRITICAL)

Reply with **only** one prompt:

```
{Round Style Lock OR Diamond Style Lock — pick by passive; motif-adjusted if needed}

Setting: medieval fantasy dark-magic game world; pure magical effect only - no steampunk, no gears, no brass machinery.

{Layout Lock — circle or diamond by passive}

{Framing Lock — circle or diamond by passive; motif-adjusted if needed}

Subject / theme: {English name from card} - {1 short clause from Описание + Тип эффекта + visual metaphor from Тип применения / Зона}{; REQUIRED motif: … if parentheses were set}; same spell/effect in every panel; aspect {card aspect} with accents {mapped colors} for jagged ring aura and effect; silhouette inside the {circular|diamond} medallion{; PASSIVE diamond frame if passive}.

{Diversity Lock}

Panel brief: nine variations of the SAME {circular|diamond} medallion ability icon — composition, angle, and effect intensity only.

Negatives: {active OR passive negatives block below}
```

**Active negatives** (`passive = false`):

```
Negatives: photorealistic, semi-realistic, 3d, cgi, soft airbrush anime, missing circular frame, square icon without medallion ring, diamond frame, rhombus icon, thin white sticker outline, thick white outline, heavy white border, chunky white sticker stroke, flat solid empty void background, busy photo landscape, ornate baroque frames, full character, full body, different ability concepts across panels, wrong spell concept, mismatched ability effect, weak muddy silhouette, neon candy glow, washed-out colors, muddy grey-brown palette, steampunk, gears, cogs, brass machinery, valves, lenses, mechanical props, clockwork, text, watermark, UI, grid, damage numbers, blurry, uneven panel sizes, labels, numbers, captions, collage with white borders, aura clipped by panel edge, medallion crossing gutters
```

**Passive negatives** (`passive = true`):

```
Negatives: photorealistic, semi-realistic, 3d, cgi, soft airbrush anime, circular medallion, round frame, circular ring, missing diamond frame, square icon without diamond medallion ring, thin white sticker outline, thick white outline, heavy white border, chunky white sticker stroke, flat solid empty void background, busy photo landscape, ornate baroque frames, full character, full body, different ability concepts across panels, wrong spell concept, mismatched ability effect, weak muddy silhouette, neon candy glow, washed-out colors, muddy grey-brown palette, steampunk, gears, cogs, brass machinery, valves, lenses, mechanical props, clockwork, text, watermark, UI, grid, damage numbers, blurry, uneven panel sizes, labels, numbers, captions, collage with white borders, aura clipped by panel edge, medallion crossing gutters, silhouette crushed into diamond corners
```

**Negatives rules:**

- Default may still list `hands` / `face` when motif does **not** need them.
- If motif needs hand / finger / face fragment: **omit** `hands`, `finger`,
  `pointing hand`, `face`, and any synonym that would ban the motif.
- Never put the motif (or its English synonyms) in Negatives.
- For enemy / `враги` on the **neutral** path only: add to Negatives:
  `purple, violet, magenta, neon purple, elemental chroma, saturated fantasy element glow`.
- For enemy abilities with an **element cue**: do **not** ban that element's
  colors; still ban unrelated neon / wrong-element chroma if helpful.
- Never mix circle and diamond bans wrong-way: actives ban diamond; passives ban
  circle / round frame.

## Subject writing tips

- Research the catalog card first (INDEX + full `.md`). Param 1 is only a lookup key; aspect is taken from the card when present. The Subject must match the card, not a free reinterpretation of the name.
- Resolve passive early: user `пассивное` OR card/INDEX/combat пассив → **diamond** locks; else circle.
- Translate the card’s magical action into a clear English silhouette (projectile, cone breath, shield dome, hammer of light, shadow slash mark, etc.).
- If parentheses set a motif, weave it into Subject as required visual; do not abstract it away into a vague sigil.
- Keep **one** ability across all nine panels.
- Put accent colors on both the jagged outer aura and the central effect. For
  enemy skills: element-from-name if clear, else neutral `no_image.png`.
- Prefer verbs and nouns from **Описание** / **Тип эффекта**; skip mana, cooldown, and numeric values in the prompt.
- For passives, say diamond / rhombus medallion in Subject and Panel brief; keep
  the effect readable inside the diamond (not a round icon awaiting crop).
- After the user picks a panel: crop to square PNG → `assets/art/skills/{icon from card}.png` and wire via `src/art/abilityIcons.ts` if needed.
- Workflow note (NOT in the reply): attach `ability_icon_round_example.png` in Gemini as style reference; for enemy skills on the neutral path also attach `no_image.png`; bake references into the prompt text when relevant.

## After user approves / corrects style

1. Save crops under `assets/art/skills/{ability_id}.png`.
2. If replacing the round-icon canon, update `approved/ability_icon_round_example.png` + this skill together.
3. Do not change `gemini-art-prompts` or the enemy portrait Style Bible unless the user explicitly asks.
4. Do not mass-regenerate old assets unless asked.
