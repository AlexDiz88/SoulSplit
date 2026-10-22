---
name: art-round-skill
description: >-
  Writes ready-to-paste Gemini prompts for Soul Split round medallion ability
  icons (circular frame, thick black ink, jagged school-colored aura, painterly
  fill). Use when the user invokes /art-round-skill or art-round-skill with
  ability name and school (e.g. /art-round-skill дыхание дракона, огонь), or
  asks for round/circular/medallion skill icons — not the thin white sticker
  ability-icon canon from gemini-art-prompts.
disable-model-invocation: true
---

# Art Round Skill — Soul Split

## When to use

User wants Gemini prompts for **round medallion** ability icons. This skill is a
**separate canon** from `gemini-art-prompts` ability icons (thin white sticker +
flat dark backdrop). Do **not** mix the two styles.

## Invocation (user input)

User writes the skill name, then **ability name**, then after a comma the **school**:

```
/art-round-skill {название способности}, {школа}
```

Examples:

```
/art-round-skill дыхание дракона, огонь
/art-round-skill ледяной щит, лёд
/art-round-skill удар тени, тьма
```

Parse rules:

1. Strip leading `/art-round-skill` or `art-round-skill` (with or without slash).
2. Split the remainder on the **first comma**.
3. **Param 1** = ability name / concept (may be Russian; translate into English for the Gemini prompt subject).
4. **Param 2** = school (element / magic school). Trim whitespace. Map to school accent colors below.
5. If school is missing or unknown — ask once for school; do not invent a school.

## School → accent colors

Use these for jagged outer aura, effect core, and medallion accents (rich, not neon):

| School (RU / aliases) | Accent in prompt |
|-----------------------|------------------|
| огонь, fire, flame | orange / gold / yellow-core fire |
| лёд, ice, frost, вода, water | cyan / teal / ice-blue |
| тьма, shadow, dark, некро | violet / deep purple / shadow |
| природа, nature, earth, земля | olive / moss green / earth amber |
| свет, holy, light | sand-gold / warm white / pale gold |
| молния, lightning, storm | electric cyan / pale yellow arcs |
| кровь, blood | crimson / dark red |
| аркан, arcane, magic | magenta / arcane violet |

If the user names a school not in the table, derive a close non-neon accent pair and state it in the Subject line.

## Before writing prompts

1. Prefer attaching [`assets/art/approved/ability_icon_round_example.png`](../../../assets/art/approved/ability_icon_round_example.png) as style reference in Gemini.
2. Parse invocation → ability name + school → accent colors.
3. Output path after approval: `assets/art/skills/{ability_id}.png` (crop one panel from the sheet).

## Hard rules

- English prompts only.
- **ONE single prompt** — style, setting, layout, framing, subject, diversity, negatives in one block.
- **Reply with ONLY the prompt** — nothing else outside one code fence.
- Always include Round Style Lock + negatives inside that prompt.
- Always **3×3 contact sheet** of the **same** ability (composition / angle / intensity only).
- Even gutters; no labels, numbers, captions inside the image.
- **Magic-only visual.** No steampunk, brass, gears, cogs, lenses, valves, or machinery unless the user **explicitly** asks for a tech ability.
- Do **not** use the thin white sticker outline from unit/portrait canon.
- Do **not** invent a competing slant that drifts from `ability_icon_round_example.png`.

## Locked look (match round example)

Locked look = `ability_icon_round_example.png`:

- **Circular medallion** per panel — thick dark inner ring + thin **jagged / sketchy school-colored outer aura**
- Central magical effect large and readable, **heavy variable-width black ink outlines**
- **Painterly / textured** fill inside the circle (subtle brush grain, radial vignette) — not flat solid void
- High-contrast school accent colors; bright core / highlights on the effect
- Hand-drawn inked fantasy game skill icon (Hades / Darkest Dungeon adjacent punch) — not photoreal, not soft airbrush anime
- No character, no face, no hands, no text, no UI, no white sticker outer outline

## Setting (always weave in)

```
Setting: medieval fantasy dark-magic game world; pure magical effect only — no steampunk, no gears, no brass machinery.
```

## Round Style Lock (always include)

```
Style lock — ROUND MEDALLION ABILITY ICON CANON (must match the look of attached master reference ability_icon_round_example.png): stylized 2D dark-fantasy game SKILL ICONS as CIRCULAR medallions — thick dark circular frame ring, thin jagged sketchy school-colored energy/aura strokes outside the ring matching the element, central magical effect LARGE and readable with HEAVY variable-width BLACK ink outlines (chunky comic ink OK here), painterly textured dark fill inside the circle with subtle brush grain and soft radial vignette (NOT flat empty solid, NOT busy scene), RICH school-accent color with bright luminous core/highlights on the effect, high contrast for ~64px readability — no thin white sticker outline, no character, no face, no hands, no text, no watermark, no UI, no neon candy glow, no steampunk gears or brass machinery, no 3D render. Match circular framing, ink weight, jagged outer aura language, painterly medallion fill, and punch of ability_icon_round_example.png; only the ability subject changes.
```

## Layout Lock

```
Layout: single square image, clean 3x3 contact sheet of NINE equal panels with thin even dark gutters, no labels, no numbers, no captions. Each panel is one complete circular medallion skill icon that reads clearly at ~64px; leave a small safe margin so the jagged outer aura stays fully inside each panel (no clipping, no crossing gutters).
```

## Framing Lock

```
Framing per panel: one circular medallion — thick dark ring, jagged school-colored outer aura, one clear magical effect centered and large inside the circle on a painterly textured dark fill; no character, no text, no gears, no brass gadgets, no steampunk props, no white sticker outline.
```

## Diversity Lock

```
Diversity: same ability concept in every panel; only composition, angle, and effect intensity vary.
```

## Output format (CRITICAL)

Reply with **only** one prompt:

```
{Round Style Lock}

Setting: medieval fantasy dark-magic game world; pure magical effect only — no steampunk, no gears, no brass machinery.

{Layout Lock}

{Framing Lock}

Subject / theme: {ability name from param 1, in English} — same spell/effect in every panel; school {school from param 2} with accents {mapped colors} for jagged ring aura and effect; pure magic silhouette inside the medallion.

{Diversity Lock}

Panel brief: nine variations of the SAME round medallion ability icon — composition, angle, and effect intensity only.

Negatives: photorealistic, semi-realistic, 3d, cgi, soft airbrush anime, missing circular frame, square icon without medallion ring, thin white sticker outline, thick white outline, heavy white border, chunky white sticker stroke, flat solid empty void background, busy photo landscape, ornate baroque frames, character, face, hands, different ability concepts across panels, weak muddy silhouette, neon candy glow, washed-out colors, muddy grey-brown palette, steampunk, gears, cogs, brass machinery, valves, lenses, mechanical props, clockwork, text, watermark, UI, blurry, uneven panel sizes, labels, numbers, captions, collage with white borders, aura clipped by panel edge, medallion crossing gutters
```

## Subject writing tips

- Param 1 → English magical effect name in Subject; param 2 → school accents from the table.
- Keep **one** ability across all nine panels.
- Put school accent colors on both the jagged outer aura and the central effect.
- After the user picks a panel: crop to square PNG → `assets/art/skills/{ability_id}.png` and wire via `src/art/abilityIcons.ts` if needed.
- Workflow note (NOT in the reply): attach `ability_icon_round_example.png` in Gemini as style reference; bake “must match ability_icon_round_example.png” into the prompt itself.

## After user approves / corrects style

1. Save crops under `assets/art/skills/{ability_id}.png`.
2. If replacing the round-icon canon, update `approved/ability_icon_round_example.png` + this skill together.
3. Do not change `gemini-art-prompts` or the enemy portrait Style Bible unless the user explicitly asks.
4. Do not mass-regenerate old assets unless asked.
