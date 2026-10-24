import type { Application } from "pixi.js";
import { HordeBattle, type BattleResult } from "../combat/HordeBattle";
import { rollEncounter } from "../combat/enemies";
import { Unit } from "../combat/Unit";
import { victoryGold } from "../meta/economy";
import { cloneGameState, createNewGameState, type GameState, type ZoneId } from "../meta/gameState";
import { pushBuyback } from "../meta/market";
import {
  addXpToProfile,
  ensureHeroStash,
  hydrateCombatUnit,
  sheetBaseFromProfile,
  syncProfileFromUnit,
  type NewHeroOptions,
} from "../meta/heroProfile";
import { rollVictoryLoot, victoryXp } from "../meta/loot";
import {
  clearSlot,
  listSaveSlots,
  loadSlot,
  saveSlot,
} from "../meta/save";
import { getZone, isZoneUnlocked, syncUnlockedZones } from "../meta/zones";
import type { AbilityId } from "../types";
import type { BattleHudApi } from "../ui/BattleHud";
import { mountCharacterCreateScreen } from "../ui/characterCreateScreen";
import { mountDefeatScreen } from "../ui/defeatScreen";
import type { HubLocationId } from "../ui/hubLocations";
import { mountHubScreen } from "../ui/hubScreen";
import { mountMerchantScreen } from "../ui/merchantScreen";
import { mountRewardScreen } from "../ui/rewardScreen";
import { mountSaveSlotsScreen } from "../ui/saveSlotsScreen";
import { mountSettingsScreen } from "../ui/settingsScreen";
import { mountStartMenu } from "../ui/startMenu";
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
  private battle: HordeBattle | null = null;
  private hubUnit: Unit | null = null;
  private prevUnlocked = new Set<ZoneId>();

  private readonly app: Application;
  private readonly hud: BattleHudApi;
  private readonly startMenu: ReturnType<typeof mountStartMenu>;
  private readonly settings: ReturnType<typeof mountSettingsScreen>;
  private readonly slots: ReturnType<typeof mountSaveSlotsScreen>;
  private readonly create: ReturnType<typeof mountCharacterCreateScreen>;
  private readonly hub: ReturnType<typeof mountHubScreen>;
  private readonly worldMap: ReturnType<typeof mountWorldMapScreen>;
  private readonly merchant: ReturnType<typeof mountMerchantScreen>;
  private readonly reward: ReturnType<typeof mountRewardScreen>;
  private readonly defeat: ReturnType<typeof mountDefeatScreen>;

  constructor(app: Application, hud: BattleHudApi) {
    this.app = app;
    this.hud = hud;

    this.startMenu = mountStartMenu({
      onPlay: () => this.goSlots(),
      onSettings: () => this.goSettings(),
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
        this.hud.openCharacter();
      },
      onBestiary: () => {
        this.merchant.hide();
        this.hud.openBestiary();
      },
      onGrimoire: () => {
        this.merchant.hide();
        this.hud.openGrimoire();
      },
      onItemGenerator: () => {
        this.merchant.hide();
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
      onStartZone: (id) => this.startBattle(id),
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
    });

    this.reward = mountRewardScreen({
      onTaken: () => {
        this.rebuildHubUnit();
        this.persist();
      },
      onDone: () => this.goHub(),
      onOpenInventory: () => this.hud.openInventory(),
      showToast: (t) => this.hud.showToast(t),
    });

    this.defeat = mountDefeatScreen({
      onHub: () => this.goHub(),
      onRetry: () => this.retryLastZone(),
      onCharacter: () => this.hud.openCharacter(),
      onInventory: () => this.hud.openInventory(),
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
      syncProfileFromUnit(this.state.hero, this.hubUnit);
      this.persist();
      if (this.screen === "hub") this.hub.show(this.state);
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
    }
    saveSlot(this.activeSlot, this.state);
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
    this.persist();
    this.destroyBattle();
    this.hubUnit = null;
    this.state = null;
    this.activeSlot = -1;
    this.prevUnlocked = new Set();
    this.hud.closeOverlays();
  }

  private goSettingsFromHub(): void {
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "settings";
    this.hud.setShellMode("title");
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
    this.reward.hide();
    this.defeat.hide();
  }

  private goTitle(): void {
    this.destroyBattle();
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "title";
    this.hud.setShellMode("title");
    this.startMenu.show();
  }

  private goSettings(): void {
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "settings";
    this.hud.setShellMode("title");
    this.settings.show();
  }

  private goSlots(): void {
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "slots";
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

  private retryLastZone(): void {
    const state = this.requireState();
    const id = state.lastZoneId ?? "outskirts";
    if (!isZoneUnlocked(id, state.hero.level, state.unlockedZones)) {
      this.goHub();
      return;
    }
    this.startBattle(id);
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
    this.persist();
  }

  private noteNewZones(): void {
    const state = this.requireState();
    for (const id of state.unlockedZones) {
      if (this.prevUnlocked.has(id)) continue;
      if (id === "ruins") this.hud.showToast("Открыты Руины");
    }
    this.prevUnlocked = new Set(state.unlockedZones);
  }

  goWorldMap(): void {
    const state = this.requireState();
    if (this.hubUnit) syncProfileFromUnit(state.hero, this.hubUnit);
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "world_map";
    this.hud.setShellMode("hub");
    this.hud.setCanChangeEquipment(() => true);
    this.bindHubEquipmentSync();
    this.worldMap.show(state);
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
        this.hud.showToast("Ратуша - скоро");
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
    this.hud.openMarketSide();
    this.merchant.show(state);
  }

  startBattle(zoneId: ZoneId): void {
    const state = this.requireState();
    if (this.hubUnit) {
      syncProfileFromUnit(state.hero, this.hubUnit);
      this.persist();
    }
    const zone = getZone(zoneId);
    state.lastZoneId = zoneId;
    this.destroyBattle();
    this.hideAll();
    this.hud.closeOverlays();
    this.screen = "battle";
    this.hud.setShellMode("battle");

    const encounter = rollEncounter({
      pool: zone.enemyPool,
      countMin: zone.enemyCount[0],
      countMax: zone.enemyCount[1],
      itemLevel: zone.itemLevel,
      eliteChance: zone.eliteChance ?? 0,
    });

    const heroSnap = cloneGameState(state).hero;
    this.battle = new HordeBattle(this.app, this.hud, {
      hero: heroSnap,
      zone,
      encounter,
      onComplete: (result) => {
        queueMicrotask(() => this.onBattleComplete(result));
      },
    });
  }

  private onBattleComplete(result: BattleResult): void {
    const state = this.requireState();
    syncProfileFromUnit(state.hero, {
      equipment: result.equipment,
      inventory: result.inventory,
    });

    if (result.outcome === "defeat") {
      this.persist();
      this.destroyBattle();
      this.hideAll();
      this.screen = "defeat";
      this.hud.setShellMode("hub");
      this.hud.setCanChangeEquipment(() => true);
      this.bindHubEquipmentSync();
      this.rebuildHubUnit();
      this.defeat.show();
      return;
    }

    const zone = getZone(result.zoneId);
    const kills = result.killed.length;
    const xp = victoryXp(zone, kills);
    const gold = victoryGold(zone.itemLevel, kills);
    const levelBefore = state.hero.level;
    const levelResult = addXpToProfile(state.hero, xp);
    state.hero.gold += gold;
    state.unlockedZones = syncUnlockedZones(state.hero.level, state.unlockedZones);

    const items = rollVictoryLoot({
      zone,
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

    if (levelBefore < 3 && state.hero.level >= 3 && !this.prevUnlocked.has("ruins")) {
      this.hud.showToast("Открыты Руины");
      this.prevUnlocked.add("ruins");
    }

    this.reward.show(state.hero, {
      items,
      xpGained: xp,
      goldGained: gold,
      levelsGained: levelResult.levelsGained,
      newLevel: state.hero.level,
      kills,
      zoneName: zone.name,
    });
  }
}
