# Каталог врагов (бестиарий)

**Источник правды:** `src/combat/enemyDefs/{groupId}/{id}.ts` (один файл на юнита).

Сюда пишет скилл `create-enemy` (строка-навигация). По запросу он же может завести способность в `design/abilities/enemies/` и прописать её id в поле `abilities` дефа. Бестиарий и бой читают одни и те же `.ts` файлы. `ENEMY_KINDS` собирается автоматически из дефов со `status: "одобрено"`.

Новый юнит - статус `"черновик"` (в бой не попадает). `"одобрено"` = в боевом пуле. `"отказ"` / `"под вопросом"` в бой не входят. Генератор сам статусы одобренных юнитов не меняет.

Крючок - reach / ряд и роль/решение для навигации. Похожие юниты в разных группах (и даже рядом) допустимы.

Базовый уровень - то, что видно в бестиарии. В бою уровень = base ±2 (кап 1-20), статы масштабируются от оффсета.

| id | group_id | название | группа | регион | ур. | крючок | статус | файл |
|---|---|---|---|---|---|---|---|---|
| goblin_spear | goblins | Гоблин-копейщик | Гоблины | Северная дорога | 1 | reach 2, ряды 1-2, лёгкий ближник с копьём | одобрено | `src/combat/enemyDefs/goblins/goblin_spear.ts` |
| skeleton_guard | undead | Скелет-защитник | Нежить | Руины | 2 | reach 1, ряд 1, толстый мили-танк | одобрено | `src/combat/enemyDefs/undead/skeleton_guard.ts` |
| huntress | hunters | Охотница | Охотники | Северная дорога | 2 | reach 3, ряды 2-3, хрупкий лучник | одобрено | `src/combat/enemyDefs/hunters/huntress.ts` |
| skeleton_mage | undead | Скелет-маг | Нежить | Руины | 3 | reach 4, ряды 3-4, дальний маг со "Стрелой тьмы" | одобрено | `src/combat/enemyDefs/undead/skeleton_mage.ts` |
| bandit_vagabond | bandits | Бродяга | Бандиты | Северная дорога | 1 | reach 1, ряды 1-2, быстрый ближник с кинжалом | одобрено | `src/combat/enemyDefs/bandits/bandit_vagabond.ts` |
| bandit_slinger | bandits | Швыряла | Бандиты | Северная дорога | 1 | reach 3, ряды 2-3, метатель булыжников | одобрено | `src/combat/enemyDefs/bandits/bandit_slinger.ts` |
| bandit_brigadier | bandits | Бригадир | Бандиты | Северная дорога | 2 | reach 1, ряд 1, толстый танк со щитом и булавой | одобрено | `src/combat/enemyDefs/bandits/bandit_brigadier.ts` |
| bandit_magpie | bandits | Сорока | Бандиты | Северная дорога | 2 | reach 3, ряды 2-3, лучница с частым луком | одобрено | `src/combat/enemyDefs/bandits/bandit_magpie.ts` |
| bandit_ravager | bandits | Разорительница | Бандиты | Северная дорога | 2 | reach 1, ряд 1, агрессивный мили с булавой без щита | одобрено | `src/combat/enemyDefs/bandits/bandit_ravager.ts` |
| bandit_leader | bandits | Главарь бандитов | Бандиты | Северная дорога | 3 | reach 1, ряд 4, мини-босс с двуручной булавой и приёмом за спинами | одобрено | `src/combat/enemyDefs/bandits/bandit_leader.ts` |
| wandering | undead | Бродячий | Нежить | Руины | 1 | reach 1, ряд 1, медленный толстый ближник | одобрено | `src/combat/enemyDefs/undead/wandering.ts` |
| skeleton_archer | undead | Скелет-лучник | Нежить | Руины | 2 | reach 3, ряды 2-3, хрупкий лучник с галереи | одобрено | `src/combat/enemyDefs/undead/skeleton_archer.ts` |
| skeleton_spearman | undead | Скелет-копейщик | Нежить | Руины | 3 | reach 2, ряды 1-2, копейщик среднего ряда | одобрено | `src/combat/enemyDefs/undead/skeleton_spearman.ts` |
| scavenger | undead | Падальщик | Нежить | Руины | 1 | reach 1, ряд 1, быстрый хрупкий ближник | одобрено | `src/combat/enemyDefs/undead/scavenger.ts` |
| skeleton_king | undead | Король скелетов | Нежить | Руины | 4 | reach 4, ряд 4, босс со жезлом и "Живыми костями" | одобрено | `src/combat/enemyDefs/undead/skeleton_king.ts` |
