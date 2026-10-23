import type { Application } from "pixi.js";
import { HordeBattle, type BattleResult } from "../combat/HordeBattle";
import { rollEncounter } from "../combat/enemies";
import { Unit } from "../combat/Unit";
import { cloneGameState, createNewGameState, type GameState, type ZoneId } from "../meta/gameState";
import {
  addXpToProfile,
  hydrateCombatUnit,
  sheetBaseFromProfile,
  syncProfileFromUnit,
} from "../meta/heroProfile";
import { rollVictoryLoot, victoryXp } from "../meta/loot";
import { clearSave, loadOrNewGame, saveGame } from "../meta/save";
import { getZone, syncUnlockedZones } from "../meta/zones";
import type { AbilityId } from "../types";
import type { BattleHudApi } from "../ui/BattleHud";
import { mountDefeatScreen } from "../ui/defeatScreen";
import { mountHubScreen } from "../ui/hubScreen";
import { mountRewardScreen } from "../ui/rewardScreen";
import { mountZoneSelectScreen } from "../ui/zoneSelectScreen";

type AppScreen = "hub" | "zone_select" | "battle" | "reward" | "defeat";

export class GameApp {
  private screen: AppScreen = "hub";
  private state: GameState;
  private battle: HordeBattle | null = null;
  private hubUnit: Unit | null = null;

  private readonly app: Application;
  private readonly hud: BattleHudApi;
  private readonly hub: ReturnType<typeof mountHubScreen>;
  private readonly zones: ReturnType<typeof mountZoneSelectScreen>;
  private readonly reward: ReturnType<typeof mountRewardScreen>;
  private readonly defeat: ReturnType<typeof mountDefeatScreen>;

  constructor(app: Application, hud: BattleHudApi) {
    this.app = app;
    this.hud = hud;
    this.state = loadOrNewGame();
    this.state.unlockedZones = syncUnlockedZones(this.state.hero.level, this.state.unlockedZones);

    this.hub = mountHubScreen({
      onEmbark: () => this.goZoneSelect(),
      onCharacter: () => this.hud.openCharacter(),
      onInventory: () => this.hud.openInventory(),
      onNewGame: () => this.newGame(),
    });

    this.zones = mountZoneSelectScreen({
      onBack: () => this.goHub(),
      onStartZone: (id) => this.startBattle(id),
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

    this.defeat = mountDefeatScreen(() => this.goHub());

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.persist();
    });
  }

  /** Прокси выбора скилла в активный бой. */
  selectAbility(id: AbilityId): void {
    this.battle?.selectAbility(id);
  }

  private bindHubEquipmentSync(): void {
    this.hud.setOnEquipmentChanged(() => {
      if (this.screen === "battle") return;
      if (!this.hubUnit) return;
      syncProfileFromUnit(this.state.hero, this.hubUnit);
      this.persist();
    });
  }

  start(): void {
    this.goHub();
  }

  private persist(): void {
    saveGame(this.state);
  }

  private newGame(): void {
    clearSave();
    this.state = createNewGameState();
    this.persist();
    this.goHub();
    this.hud.showToast("Новая игра");
  }

  private hideMeta(): void {
    this.hub.hide();
    this.zones.hide();
    this.reward.hide();
    this.defeat.hide();
  }

  private rebuildHubUnit(): void {
    const init = hydrateCombatUnit(this.state.hero);
    this.hubUnit = new Unit(init);
    this.hubUnit.rebuildSheetFromEquipment(sheetBaseFromProfile(this.state.hero));
    this.hud.setHero(this.hubUnit);
  }

  private destroyBattle(): void {
    if (!this.battle) return;
    this.battle.destroy();
    this.battle = null;
  }

  goHub(): void {
    this.destroyBattle();
    this.hideMeta();
    this.hud.closeOverlays();
    this.screen = "hub";
    this.hud.setShellMode("hub");
    this.hud.setCanChangeEquipment(() => true);
    this.bindHubEquipmentSync();
    this.state.unlockedZones = syncUnlockedZones(this.state.hero.level, this.state.unlockedZones);
    this.rebuildHubUnit();
    this.hub.show(this.state);
    this.persist();
  }

  private goZoneSelect(): void {
    if (this.hubUnit) {
      syncProfileFromUnit(this.state.hero, this.hubUnit);
    }
    this.hideMeta();
    this.hud.closeOverlays();
    this.screen = "zone_select";
    this.hud.setShellMode("hub");
    this.hud.setCanChangeEquipment(() => true);
    this.bindHubEquipmentSync();
    this.zones.show(this.state);
  }

  startBattle(zoneId: ZoneId): void {
    if (this.hubUnit) {
      syncProfileFromUnit(this.state.hero, this.hubUnit);
      this.persist();
    }
    const zone = getZone(zoneId);
    this.state.lastZoneId = zoneId;
    this.destroyBattle();
    this.hideMeta();
    this.hud.closeOverlays();
    this.screen = "battle";
    this.hud.setShellMode("battle");

    const encounter = rollEncounter({
      pool: zone.enemyPool,
      countMin: zone.enemyCount[0],
      countMax: zone.enemyCount[1],
      itemLevel: zone.itemLevel,
    });

    const heroSnap = cloneGameState(this.state).hero;
    this.battle = new HordeBattle(this.app, this.hud, {
      hero: heroSnap,
      zone,
      encounter,
      onComplete: (result) => {
        // Не уничтожаем бой синхронно изнутри ticker/update.
        queueMicrotask(() => this.onBattleComplete(result));
      },
    });
  }

  private onBattleComplete(result: BattleResult): void {
    syncProfileFromUnit(this.state.hero, {
      equipment: result.equipment,
      inventory: result.inventory,
    });

    if (result.outcome === "defeat") {
      this.persist();
      this.destroyBattle();
      this.hideMeta();
      this.screen = "defeat";
      this.hud.setShellMode("hub");
      this.bindHubEquipmentSync();
      this.rebuildHubUnit();
      this.defeat.show();
      return;
    }

    const zone = getZone(result.zoneId);
    const kills = result.killed.length;
    const xp = victoryXp(zone, kills);
    const levelResult = addXpToProfile(this.state.hero, xp);
    this.state.unlockedZones = syncUnlockedZones(this.state.hero.level, this.state.unlockedZones);

    const items = rollVictoryLoot({
      zone,
      kills,
      learnedAspects: this.state.hero.learnedAspects,
    });

    this.persist();
    this.destroyBattle();
    this.hideMeta();
    this.screen = "reward";
    this.hud.setShellMode("hub");
    this.hud.setCanChangeEquipment(() => true);
    this.bindHubEquipmentSync();
    this.rebuildHubUnit();
    this.reward.show(this.state.hero, {
      items,
      xpGained: xp,
      levelsGained: levelResult.levelsGained,
      newLevel: this.state.hero.level,
      kills,
      zoneName: zone.name,
    });
  }
}
