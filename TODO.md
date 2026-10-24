# Soul Split - TODO вертикального среза

Числа v1 синхронизируй с `src/meta/*` и `design/meta/BALANCE_V1.md`.

## Решения v1

| Параметр | Значение |
|---|---|
| Кап уровня | 30 |
| XP до уровня N | `400 + 250 * (N - 1)` |
| Level-up | `+35 maxHp`, `+5 maxMana`; каждые 5 ур. `+0.5 manaRegen` |
| База ур.1 | `maxHp 300`, `maxMana 100`, `manaRegen 4`, crit 5/150 |
| Герой | Айра, `air`, loadout wind x4 |
| Стартовое оружие | 20-30, CD 1.5 |
| Save | `soulsplit.save.v1` |
| Зоны | `outskirts` → `ruins` (с ур. 3) |
| Золото | `(8 + kills * 2) * ilvl`; скупщик `ilvl * rarityMult` |

## Фаза A - фундамент героя

- [x] A1. `src/meta/progression.ts` - XP/уровни
- [x] A1. `src/meta/heroProfile.ts` - профиль, hydrate Unit
- [x] A2. `src/meta/gameState.ts` - GameState
- [x] A3. База листа `maxHp 300`, starter weapon 20-30/1.5
- [x] A3. `HordeBattle` спавнит героя из профиля
- [x] A3. Character sheet показывает `hero.level`

## Фаза B - игровой loop

- [x] B1. `src/app/GameApp.ts` + правка `main.ts`
- [x] B2. `BattleConfig` / `BattleResult` в `HordeBattle`
- [x] B3. `src/meta/zones.ts` + `rollEncounter(opts)`
- [x] B4. Hub screen
- [x] B5. Zone select
- [x] B6. Loot + reward screen
- [x] B7. Defeat screen
- [x] B8. `src/meta/save.ts` localStorage

## Фаза C - баланс 1-3

- [x] C1. `design/meta/BALANCE_V1.md`
- [x] C2. Тюнинг старта: пачка [3,6], защитник 140 HP, XP 140+40/kill
- [x] C3. Тюнинг лута: rare веса, early affix tiers, чаще 2 дропа
- [x] C4. UX поражения (повтор + экип) и быстрый "В поход"

## Фаза D - расширение

- [x] D1. Зона ruins + toast разблокировки на ур.3
- [x] D2. Элиты (8% на ruins, ×1.6 hp / ×1.25 atk, золотая рамка)
- [x] D3. Золото + скупщик
- [x] D4. `dust_veil`, `air_pocket`, `demoralizing_shout`; `stun_strike` → `hammer_throw`
- [x] D5. Обновить `ROADMAP.md`

## Сейчас

Вертикальный срез A-D готов к ручному прогону.
Следующее - шаги из `ROADMAP.md` (loadout в хабе, новые зоны/враги, крафт).
