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
| abilityDamage% + schoolDamage%[school] (сумма к одному пакету) | 100% |
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
amp = min(abilityDamage% + schoolDamage%[ability.school], 100)
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
- schoolDamage%[school]
- critChance%, critDamage%
- physDamageReduction%, magicResist%, evasion%
- blockChance%, parryChance% (аффиксы есть, бой позже)

## Оружие (свойства предмета, не лист)

- weaponBaseDamage (min-max)
- weaponBaseCd
- reach / range / weaponKind

## Генератор предметов

### Редкость → число роллов

| rare | аффиксов |
|---|---|
| common (white) | 0 |
| uncommon (green) | 1 |
| rare (blue) | 2 |
| epic-yellow (yellow) | 3-4 |
| epic (purple) | 4-5 |

Legendary / set - вне генератора v1.

### Слот → семьи аффиксов

Каждый слот допускает только свой набор семей (offense / defense / resource / tempo / school). Пример:

- hands: tempo (attackSpeed), defense light, resource light; не offense damage
- chest/legs: defense heavy; не weaponAttackBonus / abilityDamage
- weapon slots: offense + tempo + school; не evasion
- trinket: resource + school + light offense

Точные таблицы - в `src/items/slotRules.ts`.

### Аспектные предметы

Только: `mainhand`, `offhand` (оружие), `trinket` (аксессуар).
Дроп оружия с `schoolTag` из изученных аспектов героя имеет повышенный вес.

### Prefix / suffix

Каждый ролл имеет `affixSlot: "prefix" | "suffix"`.
v1: любой `AffixDef` может быть и prefix, и suffix (случайный выбор при ролле).
Позже: разделение пулов и лимит "не все роллы prefix".

### Ролл значения

```
value = round(lerp(tierMin, tierMax, quality) )  // по itemLevel
```

Диапазоны в `AffixDef.tiers` по itemLevel-скобкам.
