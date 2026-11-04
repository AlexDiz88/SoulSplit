import type { Application } from "pixi.js";
import { Battle, type BattleResult } from "../combat/Battle";
import { rollEncounter } from "../combat/enemies";
import { Unit } from "../combat/Unit";
import { defeatGoldLoss, victoryGold } from "../meta/economy";
import { cloneGameState, createNewGameState, type GameState, type ZoneId } from "../meta/gameState";
import { pushBuyback } from "../meta/market";
import {
  beltRefillShortageText,
  refillBeltFromInventory,
} from "../items/potions";
import { tickGlobalEffectsOutsideCombat } from "../effects/tickGlobalEffects";
import {
  addXpToProfile,
  applyProfileVitals,
  clampUnitBeltToEquipment,
  ensureHeroGlobalEffects,
  ensureHeroStash,
  hydrateCombatUnit,
  sheetBaseFromProfile,
  syncProfileFromUnit,
  syncProfileVitals,
  type NewHeroOptions,
} from "../meta/heroProfile";
import { rollVictoryLoot, victoryXp } from "../meta/loot";
import {
  clearSlot,
  listSaveSlots,
  loadSlot,
  saveSlot,
} from "../meta/save";
import { getZone, getZonePoint, isZoneUnlocked, syncUnlockedZones } from "../meta/zones";
import { applyKillProgress } from "../quests/questLog";
import type { AbilityId } from "../types";
import type { BattleHudApi } from "../ui/BattleHud";
import { mountCharacterCreateScreen } from "../ui/characterCreateScreen";
import { mountDefeatScreen } from "../ui/defeatScreen";
import { mountGlobalEffectsHud } from "../ui/globalEffectsHud";
import type { HubLocationId } from "../ui/hubLocations";
import { mountHubScreen } from "../ui/hubScreen";
import { mountMerchantScreen } from "../ui/merchantScreen";
import { mountQuestLogScreen } from "../ui/questLogScreen";
import { mountQuestTracker } from "../ui/questTracker";
import { mountRewardScreen } from "../ui/rewardScreen";
import { mountSaveSlotsScreen } from "../ui/saveSlotsScreen";
import { mountSettingsScreen } from "../ui/settingsScreen";
import { mountStartMenu } from "../ui/startMenu";
import { mountTownHallScreen } from "../ui/townHallScreen";
import { mountWorldMapScreen } from "../ui/worldMapScreen";

type AppScreen =
  | "title"
  | "settings"
  | "slots"
  | "create"
  | "hub"
  | "world_map"
  | "battle"
  | "reward"
  | "defeat";

export class GameApp {
  private screen: AppScreen = "title";
  private state: GameState | null = null;
  private activeSlot = -1;
  private battle: Battle | null = null;
  private hubUnit: Unit | null = null;
  private prevUnlocked = new Set<ZoneId>();
  /** Куда вернуть игрока с экрана награды (карта + окно региона). */
  private rewardReturn: { zoneId: ZoneId; pointId: string } | null = null;
  /** Тик глобальных эффектов вне боя (1 с). */
  private globalEffectsTimer: ReturnType<typeof setInterval> | null = null;

  private readonly app: Application;
  private readonly hud: BattleHudApi;
  private readonly globalEffectsHud: ReturnType<typeof mountGlobalEffectsHud>;
  private readonly startMenu: ReturnType<typeof mountStartMenu>;
  private readonly settings: ReturnType<typeof mountSettingsScreen>;
  private readonly slots: ReturnType<typeof mountSaveSlotsScreen>;
  private readonly create: ReturnType<typeof mountCharacterCreateScreen>;
  private readonly hub: ReturnType<typeof mountHubScreen>;
  private readonly worldMap: ReturnType<typeof mountWorldMapScreen>;
  private readonly merchant: ReturnType<typeof mountMerchantScreen>;
  private readonly townHall: ReturnType<typeof mountTownHallScreen>;
  private readonly questLog: ReturnType<typeof mountQuestLogScreen>;
  private readonly questTracker: ReturnType<typeof mountQuestTracker>;
  private readonly reward: ReturnType<typeof mountRewardScreen>;
  private readonly defeat: ReturnType<typeof mountDefeatScreen>;

  constructor(app: Application, hud: BattleHudApi) {
    this.app = app;
    this.hud = hud;
    this.globalEffectsHud = mountGlobalEffectsHud(document.getElementById("hud")!);

    this.startMenu = mountStartMenu({
      onPlay: () => this.goSlots(),
      onSettings: () => this.goSettings(),
      onDevPanel: () => this.hud.openItemGenerator(),
    });

    this.settings = mountSettingsScreen({
      onBack: () => {
        if (this.state) this.goHub();
        else this.goTitle();
      },
    });

    this.slots = mountSaveSlotsScreen({
      onBack: () => this.goTitle(),
      onSelectSlot: (index) => this.onSlotSelected(index),
      onInfo: () => this.hud.showToast("Статистика появится позже"),
      onDelete: (index) => this.deleteSlot(index),
    });

    this.create = mountCharacterCreateScreen({
      onBack: () => this.goSlots(),
      onCreate: (index, opts) => this.createInSlot(index, opts),
    });

    this.hub = mountHubScreen({
      onCharacter: () => {
        this.merchant.hide();
        this.townHall.hide();
        this.questLog.hide();
        if (this.hud.isInventoryOpen()) this.hud.closeInventory();
        else this.hud.openCharacter();
      },
      onInventory: () => {
        this.merchant.hide();
        this.townHall.hide();
        this.questLog.hide();
        // В городе сумка без листа персонажа бессмысленна - открываем оба окна.
        if (this.hud.isInventoryOpen()) this.hud.closeInventory();
        else this.hud.openCharacter();
      },
      onQuestLog: () => this.goQuestLog(),
      onItemGenerator: () => {
        this.merchant.hide();
        this.townHall.hide();
        this.questLog.hide();
        this.hud.openItemGenerator();
      },
      onSave: () => this.manualSave(),
      onSettings: () => this.goSettingsFromHub(),
      onCharacterSelect: () => this.exitToSlots(),
      onExitToMenu: () => this.exitToMenu(),
      onLocation: (id) => this.onTownLocation(id),
      onStash: () => this.toggleTownStash(),
      onAddTestGold: () => this.addTestGold(),
    });

    this.worldMap = mountWorldMapScreen({
      onBackToTown: () => this.goHub(),
      onStartZone: (zoneId, pointId) => this.startBattle(zoneId, pointId),
      showToast: (t) => this.hud.showToast(t),
    });

    this.merchant = mountMerchantScreen({
      onClose: () => {
        this.hud.closeOverlays();
      },
      onChanged: () => {
        // Сначала unit из профиля (покупка пишет в profile.inventory),
        // иначе persist() затрёт сумку старым hubUnit.
        this.rebuildHubUnit();
        this.persist();
        if (this.state && this.screen === "hub") this.hub.show(this.state);
      },
      showToast: (t) => this.hud.showToast(t),
    });

    this.townHall = mountTownHallScreen({
      onClose: () => {
        // Pending-ролл награды при просмотре доски нужно сохранить.
        this.persist();
        this.syncQuestTracker();
      },
      onChanged: () => {
        this.rebuildHubUnit();
        this.persist();
        if (this.state && this.screen === "hub") this.hub.show(this.state);
        this.syncQuestTracker();
      },
      showToast: (t) => this.hud.showToast(t),
    });

    this.questLog = mountQuestLogScreen({
      onClose: () => {
        this.syncQuestTracker();
      },
      onChanged: () => {
        this.persist();
        this.syncQuestTracker();
      },
      showToast: (t) => this.hud.showToast(t),
    });

    this.questTracker = mountQuestTracker({
      onToggle: () => this.goQuestLog(),
    });

    this.hud.setOnMarketSell((item, price) => {
      if (!this.state) return;
      this.state.hero.gold += price;
      pushBuyback(this.state, item);
      this.persist();
      if (this.screen === "hub") this.hub.show(this.state);
      if (this.merchant.isOpen()) this.merchant.show(this.state);
    });

    this.hud.setOnPanelsClosed(() => {
      if (this.merchant.isOpen()) this.merchant.hide();
      if (this.townHall.isOpen()) this.townHall.hide();
      if (this.questLog.isOpen()) this.questLog.hide();
    });

    window.addEventListener("keydown", (ev) => {
      if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const target = ev.target;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (typing) return;
      if (ev.code !== "KeyJ") return;
      if (this.screen !== "hub" && this.screen !== "world_map" && this.screen !== "battle") {
        return;
      }
      ev.preventDefault();
      this.goQuestLog();
    });

    this.reward = mountRewardScreen({
      onTaken: () => {
        this.rebuildHubUnit();
        this.persist();
      },
      onDone: () => this.closeRewardToMap(),
      onOpenInventory: () => this.hud.toggleInventory(),
      onOpenCharacter: () => this.hud.openCharacter(),
      showToast: (t) => this.hud.showToast(t),
    });

    this.defeat = mountDefeatScreen({
      onWake: () => this.wakeFromDefeat(),
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.persist();
    });
    window.addEventListener("pagehide", () => this.persist());
  }

  /** Прокси выбора скилла в активный бой. */
  selectAbility(id: AbilityId): void {
    this.battle?.selectAbility(id);
  }

  private bindHubEquipmentSync(): void {
    this.hud.setOnEquipmentChanged(() => {
      if (this.screen === "battle" || !this.state) return;
      if (!this.hubUnit) return;
      const clamp = clampUnitBeltToEquipment(this.hubUnit);
      if (clamp.overflowLost > 0) {
        this.hud.showToast("Часть зелий потеряна: сумка полна");
      } else if (clamp.overflowReturned > 0) {
        this.hud.showToast("Лишние зелья сняты с пояса в сумку");
      }
      syncProfileFromUnit(this.state.hero, this.hubUnit);
      this.persist();
      if (this.screen === "hub") this.hub.show(this.state);
      else if (this.screen === "world_map") this.hub.showHeroDock(this.state);
      if (this.merchant.isOpen() && this.state) this.merchant.show(this.state);
    });
  }

  start(): void {
    this.goTitle();
  }

  private requireState(): GameState {
    if (!this.state) throw new Error("Нет активной игры");
    return this.state;
  }

  private persist(): void {
    if (!this.state || this.activeSlot < 0) return;
    if (this.hubUnit && this.screen !== "battle") {
      syncProfileFromUnit(this.state.hero, this.hubUnit);
      syncProfileVitals(this.state.hero, this.hubUnit);
    }
    saveSlot(this.activeSlot, this.state);
  }

  private stopGlobalEffectsTick(): void {
    if (this.globalEffectsTimer == null) return;
    clearInterval(this.globalEffectsTimer);
    this.globalEffectsTimer = null;
  }

  private syncGlobalEffectsHud(): void {
    if (!this.state) {
      this.globalEffectsHud.setVisible(false);
      return;
    }
    const meta = this.screen === "hub" || this.screen === "world_map";
    this.globalEffectsHud.setVisible(meta);
    if (!meta) return;
    const inHub = this.screen === "hub";
    ensureHeroGlobalEffects(this.state.hero, inHub);
    this.globalEffectsHud.sync(this.state.hero.globalEffects);
  }

  /** Тик глобальных эффектов: vitals только в городе, таймеры и на карте. */
  private startGlobalEffectsTick(): void {
    this.stopGlobalEffectsTick();
    this.globalEffectsTimer = setInterval(() => {
      if (!this.state) return;
      if (this.screen !== "hub" && this.screen !== "world_map") return;
      const inHub = this.screen === "hub";
      ensureHeroGlobalEffects(this.state.hero, inHub);
      const result = tickGlobalEffectsOutsideCombat(
        this.state.hero.globalEffects,
        this.hubUnit,
        { inHub, dt: 1 },
      );
      this.state.hero.globalEffects = result.effects;
      if (result.changed && this.hubUnit) {
        syncProfileVitals(this.state.hero, this.hubUnit);
        this.hub.showHeroDock(this.state);
      }
      this.globalEffectsHud.sync(this.state.hero.globalEffects);
    }, 1000);
  }

  private manualSave(): void {
    this.persist();
    this.hud.showToast("Игра сохранена");
  }

  private exitToMenu(): void {
    this.leaveActiveGame();
    this.goTitle();
  }

  private exitToSlots(): void {
    this.leaveActiveGame();
    this.goSlots();
  }

  private leaveActiveGame(): void {
    this.stopGlobalEffectsTick();
    this.persist();
    this.destroyBattle();
    this.hubUnit = null;
    this.state = null;
    this.activeSlot = -1;
    this.prevUnlocked = new Set();
    this.hud.closeOverlays();
    this.syncGlobalEffectsHud();
  }

  private goSettingsFromHub(): void {
    if (this.hubUnit && this.state) {
      syncProfileFromUnit(this.state.hero, this.hubUnit);
      syncProfileVitals(this.state.hero, this.hubUnit);
    }
    this.stopGlobalEffectsTick();
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "settings";
    this.hud.setShellMode("title");
    this.syncGlobalEffectsHud();
    this.syncQuestTracker();
    this.settings.show();
  }

  private hideAll(): void {
    this.startMenu.hide();
    this.settings.hide();
    this.slots.hide();
    this.create.hide();
    this.hub.hide();
    this.worldMap.hide();
    this.merchant.hide();
    this.townHall.hide();
    this.questLog.hide();
    this.reward.hide();
    this.defeat.hide();
  }

  /** Трекер: hub / карта / бой. */
  private syncQuestTracker(): void {
    const visible =
      this.screen === "hub" || this.screen === "world_map" || this.screen === "battle";
    this.questTracker.setVisible(visible);
    this.questTracker.refresh(this.state);
  }

  private goTitle(): void {
    this.destroyBattle();
    this.stopGlobalEffectsTick();
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "title";
    this.hud.setShellMode("title");
    this.syncGlobalEffectsHud();
    this.syncQuestTracker();
    this.startMenu.show();
  }

  private goSettings(): void {
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "settings";
    this.hud.setShellMode("title");
    this.syncQuestTracker();
    this.settings.show();
  }

  private goSlots(): void {
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "slots";
    this.syncQuestTracker();
    this.hud.setShellMode("title");
    this.slots.show(listSaveSlots());
  }

  private onSlotSelected(index: number): void {
    const existing = loadSlot(index);
    if (!existing) {
      this.hideAll();
      this.screen = "create";
      this.hud.setShellMode("title");
      this.create.show(index);
      return;
    }
    this.enterGame(index, existing);
  }

  private createInSlot(index: number, opts: NewHeroOptions): void {
    const state = createNewGameState(opts);
    saveSlot(index, state);
    this.enterGame(index, state);
  }

  private deleteSlot(index: number): void {
    clearSlot(index);
    if (this.activeSlot === index) {
      this.state = null;
      this.activeSlot = -1;
      this.hubUnit = null;
    }
    this.hud.showToast("Персонаж удалён");
    this.goSlots();
  }

  private enterGame(index: number, state: GameState): void {
    this.activeSlot = index;
    this.state = cloneGameState(state);
    this.state.unlockedZones = syncUnlockedZones(this.state.hero.level, this.state.unlockedZones);
    this.prevUnlocked = new Set(this.state.unlockedZones);
    this.goHub();
  }

  private rebuildHubUnit(): void {
    const state = this.requireState();
    const init = hydrateCombatUnit(state.hero);
    this.hubUnit = new Unit(init);
    this.hubUnit.rebuildSheetFromEquipment(sheetBaseFromProfile(state.hero));
    applyProfileVitals(this.hubUnit, state.hero);
    this.hud.setHero(this.hubUnit);
  }

  private destroyBattle(): void {
    if (!this.battle) return;
    this.battle.destroy();
    this.battle = null;
  }

  /** Быстрый поход: последняя зона, иначе карта мира. */
  embarkQuick(): void {
    const state = this.requireState();
    if (this.hubUnit) syncProfileFromUnit(state.hero, this.hubUnit);
    const last = state.lastZoneId;
    if (last && isZoneUnlocked(last, state.hero.level, state.unlockedZones)) {
      this.startBattle(last);
      return;
    }
    const unlocked = state.unlockedZones.filter((id) =>
      isZoneUnlocked(id, state.hero.level, state.unlockedZones),
    );
    if (unlocked.length === 1) {
      this.startBattle(unlocked[0]!);
      return;
    }
    this.goWorldMap();
  }

  /** После поражения: город с 1 HP и 1 маны. */
  private wakeFromDefeat(): void {
    const state = this.requireState();
    state.hero.currentHp = 1;
    state.hero.currentMana = 1;
    this.goHub();
  }

  goHub(): void {
    const state = this.requireState();
    this.destroyBattle();
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "hub";
    this.hud.setShellMode("hub");
    this.hud.setCanChangeEquipment(() => true);
    this.bindHubEquipmentSync();
    state.unlockedZones = syncUnlockedZones(state.hero.level, state.unlockedZones);
    this.noteNewZones();
    this.rebuildHubUnit();
    this.hub.show(state);
    ensureHeroGlobalEffects(state.hero, true);
    this.startGlobalEffectsTick();
    this.syncGlobalEffectsHud();
    this.syncQuestTracker();
    this.persist();
  }

  private noteNewZones(): void {
    const state = this.requireState();
    for (const id of state.unlockedZones) {
      if (this.prevUnlocked.has(id)) continue;
      if (id === "ruined_temple") this.hud.showToast("Открыт Разрушенный храм");
    }
    this.prevUnlocked = new Set(state.unlockedZones);
  }

  goWorldMap(opts?: { openZoneId?: ZoneId; openPointId?: string }): void {
    const state = this.requireState();
    if (this.hubUnit) {
      syncProfileFromUnit(state.hero, this.hubUnit);
      syncProfileVitals(state.hero, this.hubUnit);
    }
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "world_map";
    this.hud.setShellMode("hub");
    this.hud.setCanChangeEquipment(() => true);
    this.bindHubEquipmentSync();
    this.worldMap.show(state, opts);
    this.hub.showHeroDock(state);
    ensureHeroGlobalEffects(state.hero, false);
    this.startGlobalEffectsTick();
    this.syncGlobalEffectsHud();
    this.syncQuestTracker();
  }

  /** Закрыть экран награды: карта мира с открытым окном региона. */
  private closeRewardToMap(): void {
    this.hud.setOnLootReturn(null);
    this.hud.closeOverlays();
    const ret = this.rewardReturn;
    this.rewardReturn = null;
    if (ret) this.goWorldMap({ openZoneId: ret.zoneId, openPointId: ret.pointId });
    else this.goWorldMap({ openZoneId: this.state?.lastZoneId ?? undefined });
  }

  private onTownLocation(id: HubLocationId): void {
    switch (id) {
      case "market":
        this.goMerchant();
        return;
      case "city_gate":
        this.goWorldMap();
        return;
      case "town_hall":
        this.goTownHall();
        return;
      case "forge":
        this.hud.showToast("Кузница - скоро");
        return;
      case "tavern":
        this.hud.showToast("Таверна - скоро");
        return;
      case "stash":
        this.openTownStash();
        return;
    }
  }

  /** Открыть / закрыть тайник (кнопка города и клавиша S). */
  private toggleTownStash(): void {
    if (this.screen !== "hub") return;
    if (this.hud.isStashOpen()) {
      this.hud.closeOverlays();
      return;
    }
    this.openTownStash();
  }

  private openTownStash(): void {
    if (this.screen !== "hub") return;
    const state = this.requireState();
    if (this.hubUnit) syncProfileFromUnit(state.hero, this.hubUnit);
    ensureHeroStash(state.hero);
    this.merchant.hide();
    this.townHall.hide();
    this.questLog.hide();
    this.hud.openStash(state.hero.stash);
  }

  /** Тест: +1000 золота на топбаре. */
  private addTestGold(): void {
    if (this.screen !== "hub" || !this.state) return;
    this.state.hero.gold += 1000;
    this.persist();
    this.hub.show(this.state);
    if (this.merchant.isOpen()) this.merchant.show(this.state);
    this.hud.showToast("+1000 золота");
  }

  /** Рынок поверх карты города + экип и сумка справа как у тайника. */
  goMerchant(): void {
    if (this.screen !== "hub") return;
    const state = this.requireState();
    if (this.hubUnit) syncProfileFromUnit(state.hero, this.hubUnit);
    this.townHall.hide();
    this.questLog.hide();
    this.hud.openMarketSide();
    this.merchant.show(state);
  }

  /** Доска ратуши: взять / сдать. */
  goTownHall(): void {
    if (this.screen !== "hub") return;
    const state = this.requireState();
    if (this.hubUnit) syncProfileFromUnit(state.hero, this.hubUnit);
    this.merchant.hide();
    this.questLog.hide();
    this.hud.closeOverlays();
    this.townHall.show(state);
  }

  /** Журнал взятых квестов (хаб / карта / бой). */
  goQuestLog(): void {
    if (this.screen !== "hub" && this.screen !== "world_map" && this.screen !== "battle") {
      return;
    }
    const state = this.requireState();
    if (this.questLog.isOpen()) {
      this.questLog.hide();
      this.syncQuestTracker();
      return;
    }
    this.townHall.hide();
    this.merchant.hide();
    this.questLog.show(state);
  }

  startBattle(zoneId: ZoneId, pointId?: string): void {
    const state = this.requireState();
    if (this.hubUnit) {
      syncProfileFromUnit(state.hero, this.hubUnit);
      syncProfileVitals(state.hero, this.hubUnit);
      this.persist();
    }
    this.stopGlobalEffectsTick();
    const zone = getZone(zoneId);
    const point = getZonePoint(zone, pointId);
    state.lastZoneId = zoneId;
    this.destroyBattle();
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "battle";
    this.hud.setShellMode("battle");
    this.syncGlobalEffectsHud();

    const encounter = rollEncounter({
      threatBudget: point.encounter.threatBudget,
      pool: point.encounter.pool,
      guarantee: point.encounter.guarantee,
      eliteChance: point.eliteChance ?? 0,
    });

    const heroSnap = cloneGameState(state).hero;
    this.syncQuestTracker();
    this.battle = new Battle(this.app, this.hud, {
      hero: heroSnap,
      zone,
      pointId: point.id,
      encounter,
      onEnemyKilled: (kindId) => {
        if (!this.state) return;
        if (
          !applyKillProgress(this.state, kindId, {
            zoneId,
            pointId: point.id,
          })
        ) {
          return;
        }
        this.syncQuestTracker();
        if (this.questLog.isOpen()) this.questLog.show(this.state);
      },
      onComplete: (result) => {
        queueMicrotask(() => this.onBattleComplete(result));
      },
    });
  }

  private onBattleComplete(result: BattleResult): void {
    const state = this.requireState();
    /** Состав пояса до боя - цель автодозарядки (тип и порядок ячеек). */
    const beltTarget = {
      beltHpPotions: state.hero.beltHpPotions,
      beltManaPotions: state.hero.beltManaPotions,
    };
    syncProfileFromUnit(state.hero, {
      equipment: result.equipment,
      inventory: result.inventory,
      beltHpPotions: result.beltHpPotions,
      beltManaPotions: result.beltManaPotions,
    });
    const shortage = refillBeltFromInventory(
      state.hero.inventory,
      state.hero,
      beltTarget,
    );
    const shortageText = beltRefillShortageText(shortage.missingHp, shortage.missingMana);

    if (result.outcome === "flee") {
      // Раны и мана из боя сохраняются; в город не кидаем (там реген).
      state.hero.currentHp = Math.max(1, result.heroHp);
      state.hero.currentMana = Math.max(0, result.heroMana);
      this.stopGlobalEffectsTick();
      this.destroyBattle();
      this.rebuildHubUnit();
      this.persist();
      this.goWorldMap({ openZoneId: result.zoneId, openPointId: result.pointId });
      if (shortageText) this.hud.showAlert("Не хватило зелий", shortageText);
      return;
    }

    if (result.outcome === "defeat") {
      const stolen = defeatGoldLoss(state.hero.gold);
      state.hero.gold = Math.max(0, state.hero.gold - stolen);
      this.stopGlobalEffectsTick();
      this.destroyBattle();
      this.hideAll();
      this.hud.closeOverlays();
      this.screen = "defeat";
      this.hud.setShellMode("title");
      this.hud.setCanChangeEquipment(() => false);
      this.syncGlobalEffectsHud();
      this.syncQuestTracker();
      this.persist();
      this.defeat.show();
      if (shortageText) this.hud.showAlert("Не хватило зелий", shortageText);
      return;
    }

    // Победа: раны и мана сохраняются до отдыха в городе.
    state.hero.currentHp = Math.max(1, result.heroHp);
    state.hero.currentMana = Math.max(0, result.heroMana);
    const zone = getZone(result.zoneId);
    const point = getZonePoint(zone, result.pointId);
    const kills = result.killed.length;
    const xp = victoryXp(state.hero.level, result.killed);
    const gold = victoryGold(point.itemLevel, kills);
    const levelResult = addXpToProfile(state.hero, xp);
    state.hero.gold += gold;
    state.unlockedZones = syncUnlockedZones(state.hero.level, state.unlockedZones);

    const items = rollVictoryLoot({
      zone,
      point,
      kills,
      learnedAspects: state.hero.learnedAspects,
    });

    this.persist();
    this.destroyBattle();
    this.stopGlobalEffectsTick();
    this.hideAll();
    this.screen = "reward";
    this.hud.setShellMode("hub");
    this.hud.setCanChangeEquipment(() => true);
    this.bindHubEquipmentSync();
    this.rebuildHubUnit();
    this.syncGlobalEffectsHud();
    this.syncQuestTracker();

    this.noteNewZones();

    this.rewardReturn = { zoneId: result.zoneId, pointId: result.pointId };
    this.reward.show(state.hero, {
      items,
      xpGained: xp,
      goldGained: gold,
      levelsGained: levelResult.levelsGained,
      newLevel: state.hero.level,
      kills,
      zoneName: zone.name,
      pointName: point.name,
      stats: result.stats,
    });
    this.hud.setOnLootReturn((item) => {
      this.reward.returnItem(item);
    });
    if (shortageText) this.hud.showAlert("Не хватило зелий", shortageText);
  }
}
