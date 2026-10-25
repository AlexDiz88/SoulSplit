# Оружие, оффхенды и руки

Канон слотов рук и dual wield. Код: `src/items/weaponTypes.ts`, `src/items/offhandTypes.ts`, `src/items/equipment.ts`.

## Пометки слота (UI)

Технические слоты: `mainhand` / `offhand`. Подпись предмета задаётся полем `grip`.

| Пометка | grip | Куда надевается |
|---|---|---|
| Основная рука | `mainhand` | только mainhand |
| Обе руки | `twoHand` | в mainhand, блокирует offhand |
| Левая рука | `offhand` | только offhand |
| Любая рука | `either` | mainhand или offhand |

## Оружие

| id | Имя | grip | kind | range |
|---|---|---|---|---|
| dagger | Кинжал | either | melee | melee |
| sword | Меч | either | melee | melee |
| mace | Булава | either | melee | melee |
| axe | Топор | either | melee | melee |
| wand | Жезл | either | staff | ranged |
| 2H_sword | Двуручный меч | twoHand | melee | melee |
| 2H_mace | Двуручная булава | twoHand | melee | melee |
| 2H_axe | Двуручный топор | twoHand | melee | melee |
| spear | Копьё | twoHand | spear | melee |
| staff | Посох | twoHand | staff | ranged |
| bow | Лук | mainhand | bow | ranged |
| crossbow | Арбалет | mainhand | bow | ranged |

Лук и арбалет - **Основная рука** (не "Обе руки"), чтобы в offhand можно было надеть колчан.

## Оффхенды

| id | Имя | grip | Роль |
|---|---|---|---|
| shield | Щит | offhand | защита (block / phys DR) |
| tome | Том | offhand | магия (каст / abilityDamage / aspect) |
| orb | Сфера | offhand | магия (мана / aspect / лёгкий offense) |
| relic | Реликвия | offhand | магия (широкий пул бонусов) |
| quiver | Колчан | offhand | лучник (attackSpeed / crit / weaponAttackBonus) |

Колчан не требует лук/арбалет жёстко - смысловой парный слот.

## Dual wield

- Любое `either` + любое `either` разрешено.
- У каждой руки свой `baseCd` и свой таймер автоатаки.
- Урон левой руки: **−25%** после ролла min-max и `weaponAttackBonus` (множитель `0.75`).
- В тултипе при экипе в offhand: `"Левая рука: -25% урона автоатак"`.
- Разный reach у рук - выбор игрока; каждая рука бьёт только если цель в её reach.
- `twoHand` в mainhand очищает и блокирует offhand.

## На будущее (лор, не код)

Цеп, кнут, кастет, когти, пистолет, ружьё.