# Каталог способностей

**Источник правды:** `src/abilities/abilityDefs/{aspectId}/{id}.ts` (один файл на способность).

Сюда пишет скилл `create-ability` (строка-навигация). Карточки кластера `враги` также может добавлять `create-enemy`. Гримуар, тултипы и бой читают одни и те же `.ts` файлы. Боевой реестр `ABILITIES` собирается из дефов с блоком `combat`.

Новая способность - статус `"черновик"` (в бой не попадает, пока нет `combat` и реализации в `Battle.ts`). `"одобрено"` для героя + `combat` = доступна при создании персонажа. Генератор сам статусы одобренных способностей не меняет.

Канон эффектов и DoT: [../meta/EFFECTS_AND_DOTS.md](../meta/EFFECTS_AND_DOTS.md). Столбы аспектов: [../meta/ASPECTS.md](../meta/ASPECTS.md).

Лимита на число способностей при разработке нет. В бою у героя до **10** активных слотов (7+3 из двух аспектов).

Крючок - тип применения, есть ли урон, и решение. Для аспектов героя по крючку видно копию. У кластера `враги` похожие крючки допустимы.

| id | aspect_id | название | аспект | тип | крючок | статус | файл |
|---|---|---|---|---|---|---|---|
| ice_arrow | ice | Ледяная стрела | Лёд | цель | 38 урона + скорость атаки цели -35% на 3 с | одобрено | `src/abilities/abilityDefs/ice/ice_arrow.ts` |
| ice_shield | ice | Ледяной щит | Лёд | на себя | щит 55 на 6 с, без урона | одобрено | `src/abilities/abilityDefs/ice/ice_shield.ts` |
| crystal_rift | ice | Кристальный разлом | Лёд | зона | клик пустой, 36 льда на кресте + хрупкость: следующий удар по цели +35%, 4 с | отказ | `src/abilities/abilityDefs/ice/crystal_rift.ts` |
| avalanche | ice | Лавина | Лёд | все враги | каст 2.5 с, кд 14 с: 14 урона льда всем + хрупкость: следующий удар +35%, 4 с | одобрено | `src/abilities/abilityDefs/ice/avalanche.ts` |
| ice_shackles | ice | Ледяные оковы | Лёд | цель | без урона, цель заморожена на месте на 2.2 с | отказ | `src/abilities/abilityDefs/ice/ice_shackles.ts` |
| rime_cage | ice | Инеевая клеть | Лёд | зона | без урона, клик и крест: заморозка на месте на 1.8 с | отказ | `src/abilities/abilityDefs/ice/rime_cage.ts` |
| frost_armor | ice | Морозная броня | Лёд | на себя | на себя 6 с: каждый мили-удар по герою - скорость атаки бьющего -60% на 3 с | одобрено | `src/abilities/abilityDefs/ice/frost_armor.ts` |
| crystal_cage | ice | Кристальная клетка | Лёд | цель | цель: заморозка 3 с (блок атак/кастов/хода) + 8 льда/с; после - Охлаждение 5 с, скорость атаки и каста -75%; кд 12 с | одобрено | `src/abilities/abilityDefs/ice/crystal_cage.ts` |
| frost_breath | ice | Морозное дыхание | Лёд | зона | зона Т только с 1 ряда: 3 клетки вперёд + бока на 3-м; 12 льда + заморозка 1.5 с (блок всех действий); кд 6 с | одобрено | `src/abilities/abilityDefs/ice/frost_breath.ts` |
| fireball | fire | Огненный шар | Огонь | цель | 42 урона + горение 8/с на 4 с | одобрено | `src/abilities/abilityDefs/fire/fireball.ts` |
| flame_cone | fire | Дыхание дракона | Огонь | зона | клик ряд 1: 40 в клик, 22 в до 3 клеток выше | одобрено | `src/abilities/abilityDefs/fire/flame_cone.ts` |
| hammer_throw | light | Бросок молота | Свет | цель | 45 урона + стан 2.2 с, только ближний ряд | одобрено | `src/abilities/abilityDefs/light/hammer_throw.ts` |
| dawn_barrier | light | Барьер рассвета | Свет | на себя | щит 62 на 6 с + снимает один дебафф с героя, без урона по врагам | черновик | `src/abilities/abilityDefs/light/dawn_barrier.ts` |
| sanctifying_ray | light | Освящающий луч | Свет | цель | 38 урона света по цели; +20, если на цели любой дебафф (any_debuff) | черновик | `src/abilities/abilityDefs/light/sanctifying_ray.ts` |
| halo_ring | light | Кольцо сияния | Свет | зона | клик пустой, асимметричное кольцо: 24-30 урона света + ослепление -30% точности автоатак на 3 с | черновик | `src/abilities/abilityDefs/light/halo_ring.ts` |
| solar_requiem | light | Солнечный реквием | Свет | все враги | каст 2.5 с, кд 14 с: 15 урона света всем + ослепление -35% точности автоатак на 3 с | черновик | `src/abilities/abilityDefs/light/solar_requiem.ts` |
| judgment_seal | light | Печать суда | Свет | цель | без урона, печать на цели 6 с: следующая способность Света по ней +30% урона | черновик | `src/abilities/abilityDefs/light/judgment_seal.ts` |
| titan_might | might | Мощь титана | Сила | на себя | урон атаки +35% на 5 с, без урона по врагам | одобрено | `src/abilities/abilityDefs/might/titan_might.ts` |
| demoralizing_shout | might | Деморализующий крик | Сила | все враги | без урона, урон атаки всех врагов -30% на 5 с | одобрено | `src/abilities/abilityDefs/might/demoralizing_shout.ts` |
| sever_artery | stealth | Вскрыть артерию | Скрытность | цель | 18 урона + кровотечение 12/с на 5 с | одобрено | `src/abilities/abilityDefs/stealth/sever_artery.ts` |
| shadow_strike | stealth | Теневой удар | Скрытность | цель | 55 урона + неуязвимость на время удара | одобрено | `src/abilities/abilityDefs/stealth/shadow_strike.ts` |
| wind_gust | air | Порыв ветра | Воздух | цель | 44 урона воздуха + отброс на 1 клетку дальше от героя | одобрено | `src/abilities/abilityDefs/air/wind_gust.ts` |
| wind_speed | air | Скорость ветра | Воздух | на себя | без урона, скорость атаки +25% на 5 с | одобрено | `src/abilities/abilityDefs/air/wind_speed.ts` |
| squall | air | Шквал | Воздух | зона | клик пустой, 34 урона воздуха на 4 клетках крестом | одобрено | `src/abilities/abilityDefs/air/squall.ts` |
| dust_veil | air | Пыльная пелена | Воздух | все враги | без урона, скорость атаки всех врагов -30% на 4 с | отказ | `src/abilities/abilityDefs/air/dust_veil.ts` |
| air_pocket | air | Воздушный карман | Воздух | зона | без урона, скорость атаки -35% на 5 с на клике и 3 соседних | под вопросом | `src/abilities/abilityDefs/air/air_pocket.ts` |
| tornado | air | Смерч | Воздух | зона | 10/с воздуха на клетке, 3 стоянки по 3 с, сам прыгает на случайного соседа | одобрено | `src/abilities/abilityDefs/air/tornado.ts` |
| dark_arrow | enemies | Стрела тьмы | враги | герой | 44 урона по герою после подготовки 2 с; пока готовит, автоатаки нет и шкала стоит; после каста кулдаун автоатаки с нуля; каст срывают только молчание/контрзаклинание или сдвиг с клетки | одобрено | `src/abilities/abilityDefs/enemies/dark_arrow.ts` |
| order | enemies | Приказ | враги | союзник | без урона, урон атаки союзника +20% на 5 с | одобрено | `src/abilities/abilityDefs/enemies/order.ts` |
| behind_backs | enemies | За спинами | враги | пассив | без урона, вне 1 ряда входящий урон -50% | одобрено | `src/abilities/abilityDefs/enemies/behind_backs.ts` |
| living_bones | enemies | Живые кости | враги | на себя | призыв защитника (ряд 1) и лучника (2-3), кд 30 с, старт на полном кд | одобрено | `src/abilities/abilityDefs/enemies/living_bones.ts` |
| rejuvenation | nature | Омоложение | Природа | на себя | без урона, регенерация 10/с на 5 с | одобрено | `src/abilities/abilityDefs/nature/rejuvenation.ts` |
| root_grasp | nature | Хватка корней | Природа | цель | без мгновенного урона, удержание 5 с (блок перемещения, каст ок), 8/с природы на 5 с, скорость атаки -50% на 5 с | одобрено | `src/abilities/abilityDefs/nature/root_grasp.ts` |
| poison_bush | nature | Ядовитый куст | Природа | зона | клик пустой, яд 8/с на 4 с на 4 диагоналях | одобрено | `src/abilities/abilityDefs/nature/poison_bush.ts` |
| thunder_strike | lightning | Громовой удар | Молния | цель | 40 урона молнии + 1 стак шока (любая Молния +15%/стак, до 3), 5 с | черновик | `src/abilities/abilityDefs/lightning/thunder_strike.ts` |
| overload | lightning | Перегрузка | Молния | на себя | без урона, следующая молния с уроном +50%, 6 с, один каст | черновик | `src/abilities/abilityDefs/lightning/overload.ts` |
| arc_fork | lightning | Дуговая вилка | Молния | зона | 40/28/28 + 1 стак шока на каждую цель; вилка вдаль, на 4-м ряду - к герою | черновик | `src/abilities/abilityDefs/lightning/arc_fork.ts` |
| storm_front | lightning | Грозовой фронт | Молния | все враги | 24 урона всем + 1 стак шока на каждого (любая Молния +15%/стак, до 3) | отказ | `src/abilities/abilityDefs/lightning/storm_front.ts` |
| chain_lightning | lightning | Цепная молния | Молния | цель | база 36, до 4 целей, прыжок манхэттен 1, урон 100/75/50/25% | черновик | `src/abilities/abilityDefs/lightning/chain_lightning.ts` |
| phantom_shot | illusion | Призрачный выстрел | Иллюзии | цель | 38 эфир + следующая автоатака врага промах | черновик | `src/abilities/abilityDefs/illusion/phantom_shot.ts` |
| image_reflect | illusion | Отражение образа | Иллюзии | на себя | 5 с, первый удар по герою без урона и без эффектов, 1 раз | черновик | `src/abilities/abilityDefs/illusion/image_reflect.ts` |
| ether_breach | illusion | Эфирный разлом | Иллюзии | зона | клик пустой, 34 эфир на кресте вокруг | черновик | `src/abilities/abilityDefs/illusion/ether_breach.ts` |
| mirage_ripple | illusion | Зыбь миражей | Иллюзии | все враги | 22 эфир всем + скорость атаки -25% на 4 с | черновик | `src/abilities/abilityDefs/illusion/mirage_ripple.ts` |
| blind_spot_strike | illusion | Удар слепого пятна | Иллюзии | цель | 36 эфир по цели + 22 эфир одному соседу манхэттен 1 | черновик | `src/abilities/abilityDefs/illusion/blind_spot_strike.ts` |
| beast_bite | beast | Звериный укус | Дух Зверя | цель | 42 физ + метка добычи: Дух Зверя +25% по цели, 6 с | черновик | `src/abilities/abilityDefs/beast/beast_bite.ts` |
| beast_hide | beast | Шкура зверя | Дух Зверя | на себя | щит 52 на 5 с, без урона по врагам | черновик | `src/abilities/abilityDefs/beast/beast_hide.ts` |
| claw_sweep | beast | Когтистый взмах | Дух Зверя | зона | клик: 40 в клике, 26 на двух соседях по горизонтали | черновик | `src/abilities/abilityDefs/beast/claw_sweep.ts` |
| pack_roar | beast | Рев стаи | Дух Зверя | все враги | 20 физ всем + урон атаки врагов -25% на 4 с | черновик | `src/abilities/abilityDefs/beast/pack_roar.ts` |
| pounce | beast | Прыжок на добычу | Дух Зверя | цель | 34 физ по цели, 52 если метка добычи зверя | черновик | `src/abilities/abilityDefs/beast/pounce.ts` |
| arcane_missiles | arcane | Чародейские стрелы | Аркан | цель | канал 3 с: 3 снаряда аркана по 26 урона, раз в 1 с по цели | одобрено | `src/abilities/abilityDefs/arcane/arcane_missiles.ts` |
| acid_flask | alchemy | Кислотная склянка | Алхимия | цель | 38 кислота + 8/с кислота 4 с | черновик | `src/abilities/abilityDefs/alchemy/acid_flask.ts` |
| vitality_elixir | alchemy | Эликсир оживления | Алхимия | на себя | регенерация 10/с на 5 с | черновик | `src/abilities/abilityDefs/alchemy/vitality_elixir.ts` |
| caustic_pool | alchemy | Едкая лужа | Алхимия | зона | лужа на клике: 30 при появлении + 8/с 4 с на клетке | черновик | `src/abilities/abilityDefs/alchemy/caustic_pool.ts` |
| corrosive_mist | alchemy | Коррозионный туман | Алхимия | все враги | 22 кислота всем + урон атаки врагов -20% на 4 с | черновик | `src/abilities/abilityDefs/alchemy/corrosive_mist.ts` |
| catalyst | alchemy | Катализ | Алхимия | цель | 24 кислота; при любом DoT (any_dot) +22 и переплавка в кислоту 8/с | черновик | `src/abilities/abilityDefs/alchemy/catalyst.ts` |
| bone_servant | necromancy | Костяной слуга | Некромантия | на себя | призыв одного костяного прислужника (ряды 1-2), кд 14 с, не больше одного живого | черновик | `src/abilities/abilityDefs/necromancy/bone_servant.ts` |
| life_siphon | necromancy | Вытягивание жизни | Некромантия | цель | каст 1.5 с: 40 урона смерти + лечение героя на 50% нанесённого | черновик | `src/abilities/abilityDefs/necromancy/life_siphon.ts` |
| grave_dust | necromancy | Погребальная пыль | Некромантия | зона | клик пустой, шахматный узор: разложение 8/с на 4 с на четырёх клетках вокруг | черновик | `src/abilities/abilityDefs/necromancy/grave_dust.ts` |
| grave_whisper | necromancy | Шёпот могилы | Некромантия | все враги | каст 2.5 с, кд 14 с: 14 урона смерти всем + урон атаки всех врагов -30% на 4 с | черновик | `src/abilities/abilityDefs/necromancy/grave_whisper.ts` |
| devour_minion | necromancy | Пожирание слуги | Некромантия | на себя | поглощает вашего прислужника: лечение 45 + щит 40 на 5 с, без урона врагам | черновик | `src/abilities/abilityDefs/necromancy/devour_minion.ts` |
