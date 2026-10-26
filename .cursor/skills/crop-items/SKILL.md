---
name: crop-items
description: >-
  Crops Soul Split item-icon style sheets (usually 3x3 Gemini grids) into square
  PNGs under assets/art/items/{weapons|offhand|slot}/ with full names
  ({type}_{rarity}_NN.png). Use when the user invokes crop-items /crop-items,
  asks to cut/crop/вырезать item icons from a sheet, passes a name prefix like
  boots_uncommon or dagger_common, or continues a style-test batch ("теперь эти 9").
disable-model-invocation: true
---

# Crop Items - Soul Split

Вырезает квадратные иконки из листа (обычно 3x3) в нужную папку под `assets/art/items/`.
Координаты берутся из **профилей** (разная ширина серых рамок = другой профиль).

## Дерево папок

```
assets/art/items/
  weapons/{dagger,sword,mace,axe,wand,bow,crossbow,2h_sword,2h_mace,2h_axe,staff,spear}/
  offhand/{shield,tome,orb,relic,quiver}/
  head/ chest/ neck/ shoulders/ hands/ ring/ waist/ legs/ feet/ trinket/
  _inbox/      <- сырые кропы без типа (image-NN) и листы до разбора
  _starters/   <- starter_*.png вне пула дропа
```

Имена файлов **полные** (тип в имени, даже если уже в пути папки):

- без префикса: `_inbox/image-NN.png`
- с префиксом: `weapons/dagger/dagger_common_01.png`, `feet/boots_uncommon_02.png`
- стартеры: `_starters/starter_dagger.png`

Нумерация **своя для каждого префикса** по всему `assets/art/items/`: следующий свободный индекс после max уже существующих файлов с этим префиксом.

Папку скрипт выбирает сам из `--prefix` (см. ниже). Ручной `--out` только если нужно обойти авто-маршрут.

## Когда вызывать

- Пользователь пишет `crop-items` / `/crop-items`
- Просит вырезать 9 иконок из приложенного листа предметов
- В серии тестов стилей: "теперь эти", "эти 9", "по тем же координатам"
- Вместе с листом даёт префикс имени: `boots_uncommon`, `dagger_common` и т.п.

Предметы в код/лут **не** создавать - только PNG-заглушки для просмотрщика (**B**).

## Быстрый путь (всегда так)

1. Найди путь к исходному листу (вложение в чате или файл в проекте).
2. Если в сообщении есть префикс (см. ниже) - передай `--prefix`.
3. Запусти скрипт из корня репо (Pillow обязателен).
4. Ответь коротко: какие файлы записаны, какая папка, какой префикс и какой профиль.

```bash
python .cursor/skills/crop-items/scripts/crop_items.py "PATH/TO/SHEET.jpg"
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" --prefix dagger_common
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" --prefix boots_uncommon
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" --prefix 2H_axe_magic
```

По умолчанию:

- профиль: `framed-3x3-v1` (см. [profiles.json](profiles.json))
- префикс: `image` → `_inbox/image-NN.png`
- с префиксом типа: папка по типу/слоту + `{prefix}_NN.png`
- нумерация: следующий свободный NN для этого префикса во всём `items/`

### С профилем / стартом / префиксом

```bash
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" --profile gemini-3x3-v1
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" -p gemini-3x3-v1 --start 46
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" --prefix boots_uncommon
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" --prefix dagger_common --start 6
python .cursor/skills/crop-items/scripts/crop_items.py --list-profiles
```

Пример: уже есть `weapons/dagger/dagger_common_01.png` … `03` → новый лист даст `dagger_common_04` … `12` в ту же папку.

### Куда кладёт `--prefix`

| Префикс | Папка |
|---|---|
| `image` (default) | `_inbox/` |
| `starter_*` | `_starters/` |
| `dagger_common`, `sword_rare`, `2H_axe_magic`, … | `weapons/{type}/` (`2h_*` lowercase в пути) |
| `shield_common`, `tome_rare`, … | `offhand/{type}/` |
| `boots_uncommon`, `helmet_common`, `ring_magic`, … | слот (`feet/`, `head/`, `ring/`, …) |

Алиасы слотов: `boots`→`feet`, `gloves`→`hands`, `belt`→`waist`, `amulet`→`neck`, и т.д. (как в `itemIcons.ts`).

## Профили

Файл: [profiles.json](profiles.json).

Каждый профиль:

- `source_size` - ожидаемый размер листа `[w, h]` (обычно `[1024, 1024]`)
- `grid` - `[cols, rows]`
- `cells` - массив `{ "left", "top", "side" }` (строго квадрат `side x side`)

**Текущий default:** `framed-3x3-v1` - карточки с каменным тайлом и тёмной bevel-рамкой на тёмном листе (новый стиль иконок). Полная карточка без гуттеров листа.

Старый профиль `gemini-3x3-v1` - тонкая серая сетка Gemini (ранние style tests); указывай явно, если лист снова в том формате.

Если пользователь говорит "по тем же координатам" - бери **текущий default** (или явный профиль из прошлого шага серии).

### Когда нужен новый профиль

Рамки/гуттеры другие, кроп режет рамку или обрезает арт:

1. Откалибруй и сохрани новый профиль:

```bash
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" --calibrate --save-profile NAME --set-default
```

2. Или только посмотреть JSON калибровки:

```bash
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" --calibrate
```

3. Если авто-калибровка промахнулась - скопируй ближайший профиль в `profiles.json`, подправь `left`/`top`/`side`, укажи `--profile`.

Имена профилей: короткий kebab, например `gemini-3x3-thick`, `gemini-3x3-thin`.

После удачной калибровки на новом типе рамок **сохрани профиль в `profiles.json`**, чтобы следующий раз не гадать.

## Правила кропа

- Только квадраты, без серых рамок сетки
- Не перезаписывай старые файлы, если пользователь не просит (скрипт сам берёт next index для префикса)
- Исходник 1024x1024 + текущий default-профиль - не пересчитывай координаты заново без нужды
- После кропа пользователь смотрит результат в просмотрщике на **B** (нужен refresh страницы / HMR)
- Кастомный префикс: только `[A-Za-z0-9_]`, формат файла `{prefix}_{NN}.png` (два знака: `01`, `02` …)
- Дефолтный префикс `image` сохраняет старый формат `image-NN.png` (дефис) в `_inbox/`
- Имена всегда полные: в `weapons/sword/` лежит `sword_common_01.png`, не `common_01.png`

## Разбор вызова

```
crop-items
crop-items boots_uncommon
/crop-items dagger_common
crop-items SHEET.jpg
crop-items SHEET.jpg, boots_uncommon
crop-items SHEET.jpg, profile gemini-3x3-v1
/crop-items --profile gemini-3x3-thick
/crop-items boots_uncommon --profile gemini-3x3-v1
```

1. Убери ведущий `/crop-items` или `crop-items`.
2. Путь к листу: аргумент-файл, вложение чата, или единственный свежий `image-*.jpg/png` в assets чата.
3. **Префикс имени:** токен вида `snake_case` / `item_rarity` (буквы, цифры, `_`), не являющийся путём к файлу и не флагом профиля. Примеры: `boots_uncommon`, `dagger_common`, `2H_axe_magic`. Передай как `--prefix TOKEN`. Если префикса нет - оставь default `image` → `_inbox/`.
4. `profile X` / `--profile X` - явный профиль; иначе default.
5. "по тем же координатам" - тот же профиль, что в этой серии (обычно default).
6. Префикс из прошлой серии **не** наследуй автоматически: только если пользователь снова его написал (или явно сказал "с тем же именем / префиксом").

## Скрипт

[scripts/crop_items.py](scripts/crop_items.py) - единственный способ кропа в этом скилле. Не пиши одноразовый Python в чат, если скрипт уже покрывает задачу.
