# Параметры героя и предметы (v1)

Утверждённая модель: прозрачный глобальный лист + семьи аффиксов по слотам + аспектное оружие/аксессуар + prefix/suffix.

## Запреты

- Нет primary attributes (сила / ловкость / интеллект).
- Нет local % на параметрах самого предмета.
- Нет "брони" и "уклонения" в голых rating-цифрах.
- Нет легендарок в генераторе v1.
- Энергощит вне scope.

## Hard-cap

| Стат | Кап |
|---|---|
| physDamageReduction%, magicResist%, evasion%, blockChance%, parryChance%, critChance% | 75% |
| attackSpeed%, castSpeed%, cooldownReduction%, manaCostReduction% | 75% |
| abilityDamage% + aspectDamage%[aspect] (сумма к одному пакету) | 100% |
| critDamage% (итог, база 150%) | 250% |

Все одинаковые % складываются плоско, затем режутся капом.

## Формулы

### Автоатака

```
base = random(weaponBaseDamage.min, weaponBaseDamage.max) + weaponAttackBonus
hit = base * atkBuffMultiplier
если crit: hit *= critDamage% / 100
```

Интервал:

```
finalCd = weaponBaseCd * (1 - min(attackSpeed%, 75) / 100) * statusAutoCdMult
```

`weaponBaseDamage` и `weaponBaseCd` - свойства оружия на слоте, не глобальный лист.
`weaponAttackBonus` - глобальный стат; не меняет цифру base на тултипе оружия.

### Способность (каждый пакет урона, включая DoT)

```
amp = min(abilityDamage% + aspectDamage%[ability.aspect], 100)
packet = basePacket * (1 + amp / 100) * atkBuffMultiplier
если crit: packet *= critDamage% / 100
```

### Входящий урон

```
если evasion прокнул (шанс evasion%) - урон 0
иначе:
  physical -> dmg *= (1 - min(physDr%, 75) / 100)
  magical  -> dmg *= (1 - min(magicResist%, 75) / 100)
```

v1: автоатаки = physical; способности аспектов = magical.

### Каст / CD / мана

```
finalCast = baseCast * (1 - min(castSpeed%, 75) / 100)
finalCd   = baseCd   * (1 - min(cooldownReduction%, 75) / 100)
cost      = baseCost * (1 - min(manaCostReduction%, 75) / 100)
```

Реген HP/маны - плоские X/сек.

## Core-лист (глобальные статы)

- maxHp, hpRegen
- maxMana, manaRegen, manaCostReduction%
- weaponAttackBonus
- attackSpeed%, castSpeed%, cooldownReduction%
- abilityDamage%
- aspectDamage%[aspect]
- critChance%, critDamage%
- physDamageReduction%, magicResist%, evasion%
- blockChance%, parryChance% (аффиксы есть, бой позже)

## Оружие (свойства предмета, не лист)

- weaponBaseDamage (min-max)
- weaponBaseCd
- reach / range / weaponKind
- grip: mainhand | offhand | either | twoHand

Канон типов и dual wield: `design/items/WEAPONS_AND_OFFHANDS.md`.

Dual wield: у каждой руки свой таймер; урон левой руки ×0.75 после полного расчёта удара.
Лук / арбалет - grip mainhand (не twoHand), чтобы в offhand можно было надеть колчан.

## Генератор предметов

### Редкость → число роллов

| rarity | аффиксов |
|---|---|
| common (white) | 0 |
| uncommon (green) | 1 |
| magic (blue) | 2 |
| rare (yellow) | 3-4 |
| epic (purple) | 4-5 |

Legendary / set - вне генератора v1.

### Слот → семьи аффиксов

Каждый слот допускает только свой набор семей (offense / defense / resource / tempo / aspect). Пример:

- hands: tempo (attackSpeed), defense light, resource light; не offense damage
- chest/legs: defense heavy; не weaponAttackBonus / abilityDamage
- weapon slots: offense + tempo + aspect; не evasion
- trinket: resource + aspect + light offense

Точные таблицы - в `src/items/slotRules.ts`.

### Аспектные предметы

Только: `mainhand`, `offhand` (оружие или оффхенд с aspect-семьёй), `trinket` (аксессуар).
`aspectTag` и бонус аспекта появляются не раньше rare (на common / uncommon / magic их нет).
Дроп оружия с `aspectTag` из изученных аспектов героя имеет повышенный вес.

### Prefix / suffix

Каждый ролл имеет `affixSlot: "prefix" | "suffix"`.
v1: любой `AffixDef` может быть и prefix, и suffix (случайный выбор при ролле).
Позже: разделение пулов и лимит "не все роллы prefix".

### Тиры аффиксов (кап ilvl 20)

10 рангов: **F → E → D → C → B → A1 → A2 → A3 → A4 → A5**.
База: `baseTier = ceil(ilvl / 2)` (ilvl 5-6 → D, 19-20 → A5).
Будущее расширение: S1…S5.

Оффсет тира (±3 запрещены), асимметрия внутри пары уровней:

| ilvl в паре | доступные оффсеты |
|---|---|
| нечётный (5) | -2, -1, 0, +1 |
| чётный (6) | -1, 0, +1, +2 |

Веса: 0 чаще всего, ±1 реже, разрешённый ±2 редко.
Соседи в таблицах значений: перекрытие ≤ ~10% ширины; `avg` растёт; через ступеньку без доминирования низкого тира.

Код: `src/items/tiers.ts`, диапазоны в `src/items/affixCatalog.ts`.

### Ролл значения

```
tierIndex = clamp(baseTierIndex(ilvl) + offset)
value = round(lerp(tierMin, tierMax, q))  // q = среднее двух uniform
```

Тултип всегда: `+N label [min-max] TierId` (позже - опция в настройках).
