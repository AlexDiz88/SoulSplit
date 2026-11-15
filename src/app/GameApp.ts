import type { Application } from "pixi.js";
import { Battle, type BattleResult } from "../combat/Battle";
import { rollEncounter } from "../combat/enemies";
import { Unit } from "../combat/Unit";
import { victoryGold } from "../meta/economy";
import { cloneGameState, createNewGameState, type GameState, type RegionId } from "../meta/gameState";
import {
  applyDefeatTrauma,
  formatTraumaPenaltyLine,
} from "../meta/healer";
import { pushBuyback } from "../meta/market";
import {
  beltRefillShortageText,
  refillBeltFromInventory,
} from "../items/potions";
import { combatModsFromGlobalEffects } from "../effects/globalEffects";
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
import { getRegion, getLocation, isRegionUnlocked, syncUnlockedRegions } from "../meta/regions";
import {
  advanceHours,
  debugAdvanceHours,
  DEBUG_HOURS_STEP,
  formatWorldClock,
  HOURS_PER_SORTIE,
} from "../meta/worldTime";
import {
  ensureTavernDay,
  isFireplaceResting,
  stopFireplaceRest,
} from "../meta/tavern";
import { applyKillProgress } from "../quests/questLog";
import type { AbilityId } from "../types";
import type { BattleHudApi } from "../ui/BattleHud";
import { mountCharacterCreateScreen } from "../ui/characterCreateScreen";
import { mountDefeatScreen } from "../ui/defeatScreen";
import { mountGlobalEffectsHud } from "../ui/globalEffectsHud";
import type { HubLocationId } from "../ui/hubLocations";
import { mountHealerScreen } from "../ui/healerScreen";
import { mountHubScreen } from "../ui/hubScreen";
import { mountMerchantScreen } from "../ui/merchantScreen";
import { mountQuestLogScreen } from "../ui/questLogScreen";
import { mountQuestTracker } from "../ui/questTracker";
import { mountRewardScreen } from "../ui/rewardScreen";
import { mountSaveSlotsScreen } from "../ui/saveSlotsScreen";
import { mountSettingsScreen } from "../ui/settingsScreen";
import { mountStartMenu } from "../ui/startMenu";
import { mountTavernScreen } from "../ui/tavernScreen";
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
  private prevUnlocked = new Set<RegionId>();
  /** Куда вернуть игрока с экрана награды (карта + окно региона). */
  private rewardReturn: { regionId: RegionId; locationId: string } | null = null;
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
  private readonly healer: ReturnType<typeof mountHealerScreen>;
  private readonly tavern: ReturnType<typeof mountTavernScreen>;
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
        // Инвентарь / лист не прерывают отдых у камина.
        this.merchant.hide();
        this.townHall.hide();
        this.healer.hide();
        this.tavern.hide();
        this.questLog.hide();
        if (this.hud.isInventoryOpen()) this.hud.closeInventory();
        else this.hud.openCharacter();
      },
      onInventory: () => {
        this.merchant.hide();
        this.townHall.hide();
        this.healer.hide();
        this.tavern.hide();
        this.questLog.hide();
        // В городе сумка без листа персонажа бессмысленна - открываем оба окна.
        if (this.hud.isInventoryOpen()) this.hud.closeInventory();
        else this.hud.openCharacter();
      },
      onQuestLog: () => this.goQuestLog(),
      onItemGenerator: () => {
        this.interruptFireplaceRest();
        this.merchant.hide();
        this.townHall.hide();
        this.healer.hide();
        this.tavern.hide();
        this.questLog.hide();
        this.hud.openItemGenerator();
      },
      onSave: () => {
        this.interruptFireplaceRest();
        this.manualSave();
      },
      onSettings: () => {
        this.interruptFireplaceRest();
        this.goSettingsFromHub();
      },
      onCharacterSelect: () => {
        this.interruptFireplaceRest();
        this.exitToSlots();
      },
      onExitToMenu: () => {
        this.interruptFireplaceRest();
        this.exitToMenu();
      },
      onLocation: (id) => this.onTownLocation(id),
      onStash: () => this.toggleTownStash(),
      onAddTestGold: () => this.addTestGold(),
      onDebugAdvanceTime: () => this.debugAdvanceWorldTime(),
    });

    this.worldMap = mountWorldMapScreen({
      onBackToTown: () => this.goHub(),
      onStartLocation: (regionId, locationId) => this.startBattle(regionId, locationId),
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

    this.healer = mountHealerScreen({
      onClose: () => {
        this.persist();
        this.syncGlobalEffectsHud();
      },
      onChanged: () => {
        this.rebuildHubUnit();
        this.persist();
        if (this.state && this.screen === "hub") this.hub.show(this.state);
        this.syncGlobalEffectsHud();
      },
      showToast: (t) => this.hud.showToast(t),
    });

    this.tavern = mountTavernScreen({
      onClose: () => {
        this.persist();
        this.syncGlobalEffectsHud();
      },
      onChanged: () => {
        this.rebuildHubUnit();
        this.persist();
        if (this.state && this.screen === "hub") this.hub.show(this.state);
        this.syncGlobalEffectsHud();
        this.syncQuestTracker();
      },
      onSlept: () => {
        this.rebuildHubUnit();
        this.persist();
        if (this.state && this.screen === "hub") this.hub.show(this.state);
        this.syncGlobalEffectsHud();
        if (this.tavern.isOpen() && this.state) {
          this.tavern.show(this.state, this.hubUnit);
        }
      },
      onLoadoutChanged: () => {
        this.rebuildHubUnit();
        this.persist();
        if (this.state && this.screen === "hub") this.hub.show(this.state);
      },
      onFireplaceChanged: () => {
        this.syncGlobalEffectsHud();
        this.persist();
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
      if (this.healer.isOpen()) this.healer.hide();
      if (this.tavern.isOpen()) this.tavern.hide();
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
    const show =
      this.screen === "hub" ||
      this.screen === "world_map" ||
      this.screen === "battle" ||
      this.screen === "reward" ||
      this.screen === "defeat";
    this.globalEffectsHud.setVisible(show);
    if (!show) return;
    const inHub = this.screen === "hub";
    ensureHeroGlobalEffects(this.state.hero, inHub);
    this.globalEffectsHud.sync(this.state.hero.globalEffects);
  }

  /** Тик глобальных эффектов: vitals в городе, таймеры везде включая бой. */
  private startGlobalEffectsTick(): void {
    this.stopGlobalEffectsTick();
    this.globalEffectsTimer = setInterval(() => {
      if (!this.state) return;
      if (
        this.screen !== "hub" &&
        this.screen !== "world_map" &&
        this.screen !== "battle" &&
        this.screen !== "reward"
      ) {
        return;
      }
      const inHub = this.screen === "hub";
      ensureHeroGlobalEffects(this.state.hero, inHub);
      const vitalsUnit = this.screen === "battle" ? null : this.hubUnit;
      const before = this.state.hero.globalEffects;
      const result = tickGlobalEffectsOutsideCombat(
        before,
        vitalsUnit,
        { inHub, dt: 1 },
      );
      this.state.hero.globalEffects = result.effects;
      if (result.changed) {
        if (vitalsUnit && inHub) {
          syncProfileVitals(this.state.hero, vitalsUnit);
          this.hub.showHeroDock(this.state);
        }
        if (this.screen === "hub" || this.screen === "world_map") {
          this.applyMetaModsToHubUnit();
        }
        if (this.screen === "battle") {
          this.battle?.syncHeroGlobalEffects(this.state.hero.globalEffects);
        }
        if (this.healer.isOpen()) this.healer.show(this.state);
        if (this.tavern.isOpen()) this.tavern.refresh(this.hubUnit);
      }
      this.globalEffectsHud.sync(this.state.hero.globalEffects);
    }, 1000);
  }

  /** Любое действие кроме инвентаря и журнала прерывает отдых у камина. */
  private interruptFireplaceRest(): void {
    if (!this.state || !isFireplaceResting(this.state)) return;
    stopFireplaceRest(this.state);
    this.syncGlobalEffectsHud();
    this.persist();
    this.hud.showToast("Отдых у камина прерван");
    if (this.tavern.isOpen()) this.tavern.refresh(this.hubUnit);
  }

  private applyMetaModsToHubUnit(): void {
    if (!this.state || !this.hubUnit) return;
    this.hubUnit.setMetaCombatMods(combatModsFromGlobalEffects(this.state.hero.globalEffects));
    this.hud.setHero(this.hubUnit);
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
    this.healer.hide();
    this.tavern.hide();
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
    this.state.unlockedRegions = syncUnlockedRegions(this.state.hero.level, this.state.unlockedRegions);
    this.prevUnlocked = new Set(this.state.unlockedRegions);
    this.goHub();
  }

  private rebuildHubUnit(): void {
    const state = this.requireState();
    const init = hydrateCombatUnit(state.hero);
    this.hubUnit = new Unit(init);
    this.hubUnit.metaCombatMods = combatModsFromGlobalEffects(state.hero.globalEffects);
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
    const last = state.lastRegionId;
    if (last && isRegionUnlocked(last, state.hero.level, state.unlockedRegions)) {
      this.startBattle(last);
      return;
    }
    const unlocked = state.unlockedRegions.filter((id) =>
      isRegionUnlocked(id, state.hero.level, state.unlockedRegions),
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
    state.unlockedRegions = syncUnlockedRegions(state.hero.level, state.unlockedRegions);
    this.noteNewRegions();
    this.rebuildHubUnit();
    this.hub.show(state);
    ensureHeroGlobalEffects(state.hero, true);
    this.startGlobalEffectsTick();
    this.syncGlobalEffectsHud();
    this.syncQuestTracker();
    this.persist();
  }

  private noteNewRegions(): void {
    const state = this.requireState();
    for (const id of state.unlockedRegions) {
      if (this.prevUnlocked.has(id)) continue;
      if (id === "ruins") this.hud.showToast("Открыты Руины");
    }
    this.prevUnlocked = new Set(state.unlockedRegions);
  }

  goWorldMap(opts?: { openRegionId?: RegionId; openLocationId?: string }): void {
    const state = this.requireState();
    this.interruptFireplaceRest();
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
    if (ret) this.goWorldMap({ openRegionId: ret.regionId, openLocationId: ret.locationId });
    else this.goWorldMap({ openRegionId: this.state?.lastRegionId ?? undefined });
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
      case "healer":
        this.goHealer();
        return;
      case "forge":
        this.interruptFireplaceRest();
        this.hud.showToast("Кузница - скоро");
        return;
      case "tavern":
        this.goTavern();
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
    this.interruptFireplaceRest();
    const state = this.requireState();
    if (this.hubUnit) syncProfileFromUnit(state.hero, this.hubUnit);
    ensureHeroStash(state.hero);
    this.merchant.hide();
    this.townHall.hide();
    this.healer.hide();
    this.tavern.hide();
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
    if (this.healer.isOpen()) this.healer.show(this.state);
    if (this.tavern.isOpen()) this.tavern.refresh(this.hubUnit);
    this.hud.showToast("+1000 золота");
  }

  /** Debug: +N часов к текущему времени. */
  private debugAdvanceWorldTime(): void {
    if (this.screen !== "hub" || !this.state) return;
    this.interruptFireplaceRest();
    const result = debugAdvanceHours(this.state, DEBUG_HOURS_STEP);
    ensureTavernDay(this.state);
    this.persist();
    this.hub.show(this.state);
    if (this.merchant.isOpen()) this.merchant.show(this.state);
    if (this.tavern.isOpen()) this.tavern.refresh(this.hubUnit);
    const clock = formatWorldClock(result.hour);
    const msg =
      result.daysAdvanced > 0
        ? `Debug: +${DEBUG_HOURS_STEP}ч → ${clock}, новый день (торговцы обновлены)`
        : `Debug: +${DEBUG_HOURS_STEP}ч → ${clock}`;
    this.hud.showToast(msg);
  }

  private noteDayRoll(daysAdvanced: number): void {
    if (daysAdvanced <= 0) return;
    this.hud.showToast(
      daysAdvanced === 1
        ? "Новый день. Торговцы обновили товар."
        : `Прошло дней: ${daysAdvanced}. Торговцы обновили товар.`,
    );
  }

  /** Рынок поверх карты города + экип и сумка справа как у тайника. */
  goMerchant(): void {
    if (this.screen !== "hub") return;
    this.interruptFireplaceRest();
    const state = this.requireState();
    if (this.hubUnit) syncProfileFromUnit(state.hero, this.hubUnit);
    this.townHall.hide();
    this.healer.hide();
    this.tavern.hide();
    this.questLog.hide();
    this.hud.openMarketSide();
    this.merchant.show(state);
  }

  /** Доска ратуши: взять / сдать. */
  goTownHall(): void {
    if (this.screen !== "hub") return;
    this.interruptFireplaceRest();
    const state = this.requireState();
    if (this.hubUnit) syncProfileFromUnit(state.hero, this.hubUnit);
    this.merchant.hide();
    this.healer.hide();
    this.tavern.hide();
    this.questLog.hide();
    this.hud.closeOverlays();
    this.townHall.show(state);
  }

  /** Лекарь: травмы и временные усиления. */
  goHealer(): void {
    if (this.screen !== "hub") return;
    this.interruptFireplaceRest();
    const state = this.requireState();
    if (this.hubUnit) syncProfileFromUnit(state.hero, this.hubUnit);
    this.merchant.hide();
    this.townHall.hide();
    this.tavern.hide();
    this.questLog.hide();
    this.hud.closeOverlays();
    this.healer.show(state);
  }

  /** Таверна: слухи, номер, камин, комната подготовки. */
  goTavern(): void {
    if (this.screen !== "hub") return;
    const state = this.requireState();
    if (this.hubUnit) syncProfileFromUnit(state.hero, this.hubUnit);
    ensureTavernDay(state);
    this.merchant.hide();
    this.townHall.hide();
    this.healer.hide();
    this.questLog.hide();
    this.hud.closeOverlays();
    this.tavern.show(state, this.hubUnit);
  }

  /** Журнал взятых квестов (хаб / карта / бой). Не прерывает отдых у камина. */
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
    this.healer.hide();
    this.tavern.hide();
    this.merchant.hide();
    this.questLog.show(state);
  }

  startBattle(regionId: RegionId, locationId?: string): void {
    const state = this.requireState();
    this.interruptFireplaceRest();
    if (this.hubUnit) {
      syncProfileFromUnit(state.hero, this.hubUnit);
      syncProfileVitals(state.hero, this.hubUnit);
      this.persist();
    }
    const region = getRegion(regionId);
    const location = getLocation(region, locationId);
    if (!location) return;
    state.lastRegionId = regionId;
    this.destroyBattle();
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "battle";
    this.hud.setShellMode("battle");
    ensureHeroGlobalEffects(state.hero, false);
    this.startGlobalEffectsTick();
    this.syncGlobalEffectsHud();

    const encounter = rollEncounter({
      threatBudget: location.encounter.threatBudget,
      pool: location.encounter.pool,
      guarantee: location.encounter.guarantee,
      eliteChance: location.eliteChance ?? 0,
    });

    const heroSnap = cloneGameState(state).hero;
    this.syncQuestTracker();
    this.battle = new Battle(this.app, this.hud, {
      hero: heroSnap,
      region,
      locationId: location.id,
      encounter,
      onEnemyKilled: (kindId) => {
        if (!this.state) return;
        if (
          !applyKillProgress(this.state, kindId, {
            regionId,
            locationId: location.id,
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

    // Вылазка сдвигает часы один раз (бой сам время не крутит).
    const timeResult = advanceHours(state, HOURS_PER_SORTIE);

    if (result.outcome === "flee") {
      // Раны и мана из боя сохраняются; в город не кидаем (там реген).
      state.hero.currentHp = Math.max(1, result.heroHp);
      state.hero.currentMana = Math.max(0, result.heroMana);
      this.stopGlobalEffectsTick();
      this.destroyBattle();
      this.rebuildHubUnit();
      this.persist();
      this.goWorldMap({ openRegionId: result.regionId, openLocationId: result.locationId });
      this.noteDayRoll(timeResult.daysAdvanced);
      if (shortageText) this.hud.showAlert("Закончились зелья", shortageText);
      return;
    }

    if (result.outcome === "defeat") {
      const traumaResult = applyDefeatTrauma(state.hero.globalEffects);
      state.hero.globalEffects = traumaResult.effects;
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
      this.defeat.show({ penaltyText: formatTraumaPenaltyLine(traumaResult.trauma) });
      this.noteDayRoll(timeResult.daysAdvanced);
      if (shortageText) this.hud.showAlert("Закончились зелья", shortageText);
      return;
    }

    // Победа: раны и мана сохраняются до отдыха в городе.
    state.hero.currentHp = Math.max(1, result.heroHp);
    state.hero.currentMana = Math.max(0, result.heroMana);
    const region = getRegion(result.regionId);
    const location = getLocation(region, result.locationId);
    if (!location) return;
    const kills = result.killed.length;
    const xp = victoryXp(state.hero.level, result.killed);
    const gold = victoryGold(location.itemLevel, kills);
    const levelResult = addXpToProfile(state.hero, xp);
    state.hero.gold += gold;
    state.unlockedRegions = syncUnlockedRegions(state.hero.level, state.unlockedRegions);

    const items = rollVictoryLoot({
      region,
      location,
      kills,
      learnedAspects: state.hero.learnedAspects,
    });

    this.persist();
    this.destroyBattle();
    this.hideAll();
    this.screen = "reward";
    this.hud.setShellMode("hub");
    this.hud.setCanChangeEquipment(() => true);
    this.bindHubEquipmentSync();
    this.rebuildHubUnit();
    ensureHeroGlobalEffects(state.hero, false);
    this.startGlobalEffectsTick();
    this.syncGlobalEffectsHud();
    this.syncQuestTracker();

    this.noteNewRegions();

    this.rewardReturn = { regionId: result.regionId, locationId: result.locationId };
    this.reward.show(state.hero, {
      items,
      xpGained: xp,
      goldGained: gold,
      levelsGained: levelResult.levelsGained,
      newLevel: state.hero.level,
      kills,
      regionName: region.name,
      locationName: location.name,
      stats: result.stats,
    });
    this.hud.setOnLootReturn((item) => {
      this.reward.returnItem(item);
    });
    this.noteDayRoll(timeResult.daysAdvanced);
    if (shortageText) this.hud.showAlert("Закончились зелья", shortageText);
  }
}
