---
name: crop-items
description: >-
  Crops Soul Split item-icon style sheets (usually 3x3 Gemini grids) into square
  PNGs under assets/art/items/ (image-NN.png or {prefix}_NN.png). Use when the
  user invokes crop-items /crop-items, asks to cut/crop/вырезать item icons from
  a sheet, passes a name prefix like boots_uncommon, or continues a style-test
  batch ("теперь эти 9").
disable-model-invocation: true
---

# Crop Items - Soul Split

Вырезает квадратные иконки из листа (обычно 3x3) в `assets/art/items/`.
Координаты берутся из **профилей** (разная ширина серых рамок = другой профиль).

Имена файлов:

- без текста: `image-NN.png` (как раньше)
- с префиксом (например `boots_uncommon`): `boots_uncommon_NN.png`

Нумерация **своя для каждого префикса**: следующий свободный индекс после max уже существующих файлов с этим префиксом.

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
4. Ответь коротко: какие файлы записаны, какой префикс и какой профиль.

```bash
python .cursor/skills/crop-items/scripts/crop_items.py "PATH/TO/SHEET.jpg"
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" --prefix boots_uncommon
```

По умолчанию:

- профиль: `framed-3x3-v1` (см. [profiles.json](profiles.json))
- выход: `assets/art/items/`
- префикс: `image` → `image-NN.png`
- нумерация: следующий свободный NN для этого префикса

### С профилем / стартом / префиксом

```bash
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" --profile gemini-3x3-v1
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" -p gemini-3x3-v1 --start 46
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" --prefix boots_uncommon
python .cursor/skills/crop-items/scripts/crop_items.py "SHEET.jpg" --prefix dagger_common --start 6
python .cursor/skills/crop-items/scripts/crop_items.py --list-profiles
```

Пример: уже есть `boots_uncommon_01.png` … `boots_uncommon_03.png` → новый лист даст `boots_uncommon_04` … `boots_uncommon_12`.

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
- Дефолтный префикс `image` сохраняет старый формат `image-NN.png` (дефис)

## Разбор вызова

```
crop-items
crop-items boots_uncommon
/crop-items boots_uncommon
crop-items SHEET.jpg
crop-items SHEET.jpg, boots_uncommon
crop-items SHEET.jpg, profile gemini-3x3-v1
/crop-items --profile gemini-3x3-thick
/crop-items boots_uncommon --profile gemini-3x3-v1
```

1. Убери ведущий `/crop-items` или `crop-items`.
2. Путь к листу: аргумент-файл, вложение чата, или единственный свежий `image-*.jpg/png` в assets чата.
3. **Префикс имени:** токен вида `snake_case` / `item_rarity` (буквы, цифры, `_`), не являющийся путём к файлу и не флагом профиля. Примеры: `boots_uncommon`, `dagger_common`, `2H_axe_magic`. Передай как `--prefix TOKEN`. Если префикса нет - оставь default `image`.
4. `profile X` / `--profile X` - явный профиль; иначе default.
5. "по тем же координатам" - тот же профиль, что в этой серии (обычно default).
6. Префикс из прошлой серии **не** наследуй автоматически: только если пользователь снова его написал (или явно сказал "с тем же именем / префиксом").

## Скрипт

[scripts/crop_items.py](scripts/crop_items.py) - единственный способ кропа в этом скилле. Не пиши одноразовый Python в чат, если скрипт уже покрывает задачу.
