---
name: normalize-item-icons
description: >-
  Renames malformed Soul Split item icon files under assets/art/items to the
  canonical {type}_{rarity}_{NN}.ext form (fills number gaps). Use when the user
  invokes normalize-item-icons /normalize-item-icons, asks to fix/normalize item
  icon names after manual Explorer renames, or mentions Windows-style names like
  "legs_uncommon (2)".
disable-model-invocation: true
---

# Normalize Item Icons - Soul Split

Приводит имена иконок в `assets/art/items/` к канону кропа: `{prefix}_{NN}.ext`.

Нужен после ручных правок в Explorer (перенос между редкостями, копирование Windows-стилем `name (2)`).

## Канон

- `weapons/dagger/dagger_common_01.png`
- `feet/boots_uncommon_28.png`
- `weapons/2h_sword/2h_sword_rare_10.png`

Номер **двузначный** (`01`, `02`, …). Нумерация **своя для каждого префикса** по всему `items/` (как в `crop-items`).

## Что фиксит

Кандидаты на переименование:

- голый префикс без номера: `legs_uncommon.png`
- Windows-суффикс: `legs_uncommon (2).png`, `legs_uncommon(3).png`
- пробел только в суффиксе `(N)` - ок; пробелы внутри имени - skip + warn

Уже канон (`legs_uncommon_01.png`) **не трогает**.

## Что пропускает

- `_inbox/`, `_starters/`, любые папки с `_` в начале имени (`_crop_*` и т.п.)
- файлы без распознанной редкости в имени
- `starter_*.png` в сервисных папках (сервисные деревья целиком skip)

Папку файла **не меняет** - только имя.

## Нумерация (дыры)

Пример:

```
legs_uncommon_01
legs_uncommon_02
legs_uncommon_04
legs_uncommon_05
legs_uncommon
legs_uncommon (2)
legs_uncommon (3)
```

Станет:

```
legs_uncommon_03  <- был legs_uncommon
legs_uncommon_06  <- был legs_uncommon (2)
legs_uncommon_07  <- был legs_uncommon (3)
```

Порядок кандидатов: сначала голый префикс, потом по числу в скобках, иначе по имени.

## Когда вызывать

- `normalize-item-icons` / `/normalize-item-icons`
- "поправь имена иконок", "нормализуй items", "после ручного переименования"

## Быстрый путь

Из корня репо:

```bash
python .cursor/skills/normalize-item-icons/scripts/normalize_item_icons.py --dry-run
python .cursor/skills/normalize-item-icons/scripts/normalize_item_icons.py
```

1. Сначала `--dry-run` - показать `path -> new_name`.
2. Если список ок - тот же вызов без `--dry-run`.
3. Ответь коротко: сколько переименовано, были ли warn.

По умолчанию (без флага) - **применяет** переименования.

### Флаги

```bash
python .cursor/skills/normalize-item-icons/scripts/normalize_item_icons.py --dry-run
python .cursor/skills/normalize-item-icons/scripts/normalize_item_icons.py --root assets/art/items
```

## Разбор вызова

```
normalize-item-icons
/normalize-item-icons
normalize-item-icons --dry-run
/normalize-item-icons dry-run
```

1. Убери ведущий `/normalize-item-icons` или `normalize-item-icons`.
2. Если есть `dry-run` / `--dry-run` - только план.
3. Иначе apply.
4. Не трогай код/лут - только имена PNG/WebP/JPEG на диске.

## Скрипт

[scripts/normalize_item_icons.py](scripts/normalize_item_icons.py) - единственный способ нормализации в этом скилле.
