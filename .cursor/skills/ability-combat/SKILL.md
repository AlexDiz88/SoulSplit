---
name: ability-combat
description: >-
  Soul Split: тайминг способностей в бою (мгновенные vs каст, доставка урона
  через VFX, полоса каста, автоатака). Обязательный аудит при одобрении способности,
  переносе в Battle.ts, смене castTime, переделке VFX или переработке урона/эффектов.
---

# Ability Combat - тайминг и доставка эффекта

Используй этот скилл **после** одобрения карточки (или при любом изменении боевой логики способности). Дизайн карточки делает `create-ability`; перенос статуса и VFX - `ability-approve.mdc`. Этот скилл - **строгий контракт боя**.

Канон: [ABILITY_COMBAT_TIMING.md](../../../design/meta/ABILITY_COMBAT_TIMING.md).

## Когда запускать

1. Пользователь одобрил способность героя - **последний шаг** перед «готово»: пройти чеклист ниже.
2. Меняется `castTime`, урон, зона, VFX, `case` в `Battle.ts` или premium-VFX способности.
3. Чинится баг: «урон раньше анимации», «промах не работает», «автоатака встала на мгновенной кнопке».

## Шаг 0. Прочитай карточку и код

- Деф: `src/abilities/abilityDefs/{aspect}/{id}.ts` - `application`, `castTime`, `combat`, `extra`.
- Бой: `src/combat/Battle.ts` - `performCast`, `resolveAbility`, `case "{id}"`.
- VFX: `src/vfx/VfxManager.ts` + `src/vfx/premium/*Vfx.ts`.
- Эталоны:
  - снаряд + промах: `ice_arrow` + `occupantAtImpact`
  - мгновенный удар: `sever_artery`
  - щит без задержки механики: `ice_shield`
  - враг с кастом: `dark_arrow` + `Unit.beginCast`

## Шаг 1. Класс активации

| Условие | Класс | Автоатака героя |
|---------|--------|------------------|
| Нет `castTime` / `null` / `0` | **Мгновенная** | Не останавливается (цель; см. техдолг) |
| `castTime` > 0 в дефе и `combat.effects.castTime` | **Каст** | Стоит на время подготовки |

Проверки:

- [ ] Значения `castTime` в корне дефа и в `combat.effects` **совпадают**.
- [ ] Для каста длительность в бою учитывает `castSpeed` через `castDuration(base, getStat(sheet, "castSpeed"))` (когда подключено к герою).
- [ ] На подготовке каста герой: `beginCast(id, duration)`, прогресс на **отдельной** полосе под портретом (как у врага, не путать с полосами автоатаки).
- [ ] Тяжёлые AoE / `все враги` с сильным дебаффом в карточке обычно имеют каст 1-3 с (баланс в `create-ability/format.md`).

## Шаг 2. Канал доставки

Выбери и зафиксируй в голове (при необходимости одной строкой в `extra` карточки):

- **`instant_frame`** - урон/статусы в кадр старта применения.
- **`projectile_impact`** - только в колбэке прилёта VFX.
- **`zone_after_vfx`** - после `await` зонального VFX, по `unitAtCell` на клетках узора.
- **`self_buff_sync`** - бафф герою до/в начале VFX.

Чеклист:

- [ ] Нет `dealAbilityDamage` / `addStatus` **до** `await` снаряда, если канал - `projectile_impact`.
- [ ] Для снаряда прицел `aimCell` берётся при старте фазы применения; на прилёте - `occupantAtImpact` или `sameEnemyOnCell`, иначе «ПРОМАХ».
- [ ] Для зоны с волной урон совпадает с обещанием карточки (часто - кто на клетке в конце волны).
- [ ] Самобаффы не ждут конца длинного VFX для механики щита/баффа.

## Шаг 3. Фазы `performCast` (целевой пайплайн)

Реализация должна стремиться к такому порядку:

```
подтверждение цели
  → оплата маны, КД, GCD
  → если castTime > 0: подготовка (beginCast, стоп автоатаки, полоса каста)
  → resolveAbility (старт VFX и доставка по каналу)
  → колбэки VFX применяют урон
```

Сейчас в коде:

- Весь `resolveAbility` обёрнут в `this.casting = true` - автоатака стоит и на мгновенных. **Новые** мгновенные способности проектируй по канону; при касании старых - не усугубляй (не добавляй лишний `await` до урона без нужды).

- **Антипаттерн:** весь `castTime` только внутри premium-VFX (`AvalancheVfx` windup) без `hero.beginCast` и без полосы каста. Для новых кастов - подготовка в бое, VFX - фаза **выпуска**.

## Шаг 4. VFX

- [ ] Premium-VFX принимает колбэк удара (`onImpact`, `onArrive`, аналог).
- [ ] Screen shake / вспышки на фазе удара, не на кадре клика (для снарядов).
- [ ] `VfxManager` пробрасывает колбэки; тяжёлая анимация в `premium/`, не голый `ring` как единственный эффект (см. `ability-approve.mdc`).
- [ ] Визуальный заряд у кастера **после** подготовки или как часть выпуска, не как единственный таймер каста.

## Шаг 5. Цели и телеграф

- [ ] `targetMode`, `reach`, телеграф в `performCast` / hover согласованы с `combat`.
- [ ] Для `enemy` - живая цель на клетке при ударе, где требуется.
- [ ] Зонные хелперы (`*Cells`) совпадают с карточкой и hover.

## Шаг 6. Статусы и прерывание

- [ ] DoT potency через `scaleDotPotency` где принято в соседних способностях аспекта.
- [ ] `sourceAbilityId: def.id` на статусах с кнопки.
- [ ] Если карточка бьёт по кастующему врагу: `interruptUnitCast` где уместно (`crystal_cage`, отброс).

## Шаг 7. Регрессия каталога

- [ ] `AbilityId` в `types.ts`, иконка, `ABILITY_BY_GRIMOIRE_ID`, статистика кастов.
- [ ] INDEX и `status: одобрено` согласованы.

## Таблица быстрой классификации (герой, одобрено)

| id | Класс | Канал | Заметка |
|----|--------|--------|---------|
| ice_arrow | мгновенная | projectile_impact | эталон промаха |
| fireball | мгновенная | projectile_impact | |
| hammer_throw | мгновенная | projectile_impact | |
| sever_artery | мгновенная | instant_frame | |
| ice_shield | мгновенная | self_buff_sync | |
| shadow_strike | мгновенная | projectile_impact / рывок | sameEnemyOnCell |
| flame_cone | мгновенная | zone_after_vfx | |
| frost_breath | мгновенная | zone_after_vfx | ближний ряд |
| avalanche | каст 2.5 | multi_callback после волны | подтянуть к hero.beginCast |
| titan_might, wind_speed, demoralizing_shout | мгновенная | instant_frame / self_buff_sync | |

При добавлении строки - обнови таблицу в этом файле.

## Шаблон нового `case` (снаряд)

```typescript
case "my_bolt": {
  const aim = this.aimCell(cell, clicked);
  if (!aim) return;
  const to = this.cellCenter(aim);
  const slowDur = def.effects?.slowDuration ?? 3;
  const slowPot = def.effects?.slowPotency ?? 0.35;
  await this.vfx.myBolt(from, to, () => {
    const hit = this.occupantAtImpact(aim, to);
    if (!hit) return;
    this.dealAbilityDamage(caster, hit, def.damage, def);
    hit.addStatus({ id: "slow", kind: "slow", remaining: slowDur, potency: slowPot, sourceAbilityId: def.id });
  });
  break;
}
```

## Шаблон каста (целевой, герой)

Псевдокод - внедрять при рефакторе `performCast`:

```typescript
const baseCast = def.effects?.castTime ?? def.castTime ?? 0;
if (baseCast > 0) {
  const dur = castDuration(baseCast, getStat(caster.sheet!, "castSpeed"));
  caster.beginCast(def.id, dur);
  await this.waitHeroCast(caster); // тикает в update, автоатака на паузе
  caster.interruptCast(); // или завершение без срыва
}
// далее тот же resolve, что у мгновенной
```

До появления `waitHeroCast` в коде - для **новых** кастов минимум: не дублировать полный `castTime` только в VFX; синхронизировать урон с колбэком удара.

## Отчёт пользователю после аудита

Кратко, по-русски:

1. Класс: мгновенная / каст (N с).
2. Канал доставки.
3. Поведение автоатаки (ожидаемое; если техдолг - пометь).
4. Промах / задержка урона - как в игре.
5. Что сделано в коде или что осталось (полоса каста, рефактор `casting`).

## Не делать

- Урон в том же кадре, что клик, для снаряда «как ледяная стрела».
- `castTime` только в VFX без записи в `combat.effects` и деф.
- Блокировать автоатаку на всю длительность VFX **по задумке** для новой мгновенной кнопки.
- Пропускать аудит при одобрении («только статус в INDEX»).