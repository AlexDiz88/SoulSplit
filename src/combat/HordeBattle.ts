import { Application, Container, Graphics, Sprite, Text } from "pixi.js";
import { ABILITIES, ALL_ABILITY_IDS, SCHOOL_COLOR } from "../abilities/definitions";
import { dragonBreathCells, GRID_SIZE, inBounds, orthoNeighbors, squallCells } from "../abilities/shapes";
import { getBackgroundTexture, pickRandomBackgroundUrl } from "../art/backgrounds";
import { pickRandomHeroPortraitUrl } from "../art/portraits";
import { createStarterWeapon } from "../items/generate";
import type { AbilityDef, AbilityId, GridPos, School, WeaponKind } from "../types";
import {
  abilityCooldown,
  abilityPacketDamage,
  autoAttackDamage,
  manaCost,
  rollCrit,
  rollWeaponDamage,
} from "../stats/formulas";
import { createBaseHeroSheet, getStat } from "../stats/sheet";
import { easeInOutQuad, TweenManager } from "../util/tween";
import { VfxManager } from "../vfx/VfxManager";
import { CELL, GAP } from "./board";
import { rollEncounter } from "./enemies";
import { Unit } from "./Unit";
import { WEAPON_LABEL, WEAPON_REACH } from "./weapons";
import { SKILL_HOTKEY_CODES, type BattleHudApi } from "../ui/BattleHud";

const PITCH = CELL + GAP;
const HERO_SIZE = CELL * 2 + GAP;
const STACK_GAP = 28;
const DROP_SEC = 0.4;
const ABILITY_GCD = 1;
/** Дальность способности - нейтральный тон, не цвет школы. */
const TELEGRAPH_REACH = 0xc8c4b8;
/** Клетки урона/воздействия - одинаковый бледно-красный для всех школ. */
const TELEGRAPH_IMPACT = 0xe07070;

interface Motion {
  u: Unit;
  x0: number;
  y0: number;
  toX: number;
  toY: number;
  elapsed: number;
}

interface PendingCast {
  def: AbilityDef;
  clicked: Unit | null;
  cell: GridPos | null;
}

interface TornadoField {
  pos: GridPos;
  stayElapsed: number;
  stayIndex: number;
  lastTick: number;
  dps: number;
  staySec: number;
  stays: number;
  gfx: Graphics;
}

/** Один герой снизу, враги на сетке 4×4. Ближний ряд зачищен — остальные опускаются. */
export class HordeBattle {
  readonly app: Application;
  readonly root = new Container();
  readonly board = new Container();
  readonly unitsLayer = new Container();
  readonly markLayer = new Container();
  readonly telegraphLayer = new Container();
  readonly tweens = new TweenManager();
  readonly vfx: VfxManager;

  units: Unit[] = [];
  selectedAbility: AbilityId | null = null;
  paused = false;
  timeScale = 1;
  casting = false;
  weapon: WeaponKind = "melee";

  private destroyed = false;
  private started = false;
  private ended = false;
  private hero!: Unit;
  private gcdRemaining = 0;
  private pendingCast: PendingCast | null = null;
  private gridOrigin = { x: 0, y: 0 };
  private heroAnchor = { x: 0, y: 0 };
  private baseBoardX = 0;
  private baseBoardY = 0;
  private rangeGfx = new Graphics();
  private abilityGfx: Graphics | null = null;
  private hoverGfx: Graphics | null = null;
  private hoverCell: GridPos | null = null;
  private mark = new Graphics();
  private motions: Motion[] = [];
  /** Пока ряд доезжает, следующий сдвиг не стартует. */
  private collapsing = false;
  private tornados: TornadoField[] = [];
  private readonly hud: BattleHudApi;
  private readonly background: Sprite;

  constructor(app: Application, hud: BattleHudApi) {
    this.app = app;
    this.hud = hud;
    this.vfx = new VfxManager(this.tweens);
    this.vfx.setShakeTarget(this.board);

    this.background = new Sprite(getBackgroundTexture(pickRandomBackgroundUrl()));
    this.background.anchor.set(0.5);
    this.background.eventMode = "none";

    this.root.addChild(this.background);
    this.root.addChild(this.board);
    this.board.addChild(this.drawArena());
    this.board.addChild(this.unitsLayer);
    this.markLayer.eventMode = "none";
    this.markLayer.addChild(this.mark);
    this.board.addChild(this.markLayer);
    this.telegraphLayer.eventMode = "none";
    this.rangeGfx.eventMode = "none";
    this.telegraphLayer.addChild(this.rangeGfx);
    this.board.addChild(this.telegraphLayer);
    this.board.addChild(this.vfx.layer);
    app.stage.addChild(this.root);

    this.spawnCrowd();
    this.layout();
    this.hud.setPause(false);
    this.hud.setSpeed(1);
    this.hud.setBattleBanner("start");
    this.setWeapon("melee");
    this.selectHero(this.hero.id);
    this.bindHud();
    this.app.canvas.addEventListener("pointerdown", this.onPointer);
    this.app.canvas.addEventListener("pointermove", this.onPointerMove);
    this.app.canvas.addEventListener("pointerleave", this.onPointerLeave);
    this.app.ticker.add(this.onTick);
    window.addEventListener("resize", this.onResize);
  }

  private readonly onTick = (ticker: { deltaMS: number }): void => {
    if (this.destroyed) return;
    this.update(ticker.deltaMS / 1000);
  };

  private readonly onResize = (): void => {
    this.layout();
  };

  private readonly onPointer = (ev: PointerEvent): void => {
    if (ev.button === 2) {
      ev.preventDefault();
      this.cancelAbilityTargeting();
      return;
    }
    if (ev.button !== 0) return;
    this.onCanvasPointer(ev);
  };

  private readonly onPointerMove = (ev: PointerEvent): void => {
    this.updateAbilityHover(ev);
  };

  private readonly onPointerLeave = (): void => {
    this.clearHoverTelegraph();
  };

  private pointerLocal(ev: PointerEvent): { x: number; y: number } {
    const bounds = this.app.canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - bounds.left - this.board.x) / this.board.scale.x,
      y: (ev.clientY - bounds.top - this.board.y) / this.board.scale.y,
    };
  }

  private readonly onContextMenu = (ev: MouseEvent): void => {
    ev.preventDefault();
  };

  private readonly onDocPointer = (ev: PointerEvent): void => {
    if (ev.button !== 2) return;
    ev.preventDefault();
    // ПКМ вне канваса тоже сбрасывает выбор цели.
    if (ev.target === this.app.canvas) return;
    this.cancelAbilityTargeting();
  };

  private readonly onStartClick = (): void => {
    if (this.destroyed || this.started || this.ended) return;
    this.started = true;
    this.paused = false;
    this.hud.setPause(false);
    this.syncBattleBanner();
    this.hud.setHint(this.idleHint());
  };

  private readonly onPauseClick = (): void => {
    if (!this.started || this.ended) return;
    this.applyPause(!this.paused);
    this.hud.setHint(this.paused ? "Пауза. Пробел - продолжить." : this.idleHint());
  };

  private readonly onSpeedClick = (): void => {
    this.timeScale = this.timeScale === 1 ? 2 : 1;
    this.hud.setSpeed(this.timeScale);
  };

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearTornados();
    this.app.ticker.remove(this.onTick);
    this.app.canvas.removeEventListener("pointerdown", this.onPointer);
    this.app.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.app.canvas.removeEventListener("pointerleave", this.onPointerLeave);
    window.removeEventListener("resize", this.onResize);
    document.getElementById("btn-pause")?.removeEventListener("click", this.onPauseClick);
    document.getElementById("btn-speed")?.removeEventListener("click", this.onSpeedClick);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("contextmenu", this.onContextMenu);
    document.removeEventListener("pointerdown", this.onDocPointer);
    this.root.destroy({ children: true });
  }

  private readonly onKey = (ev: KeyboardEvent): void => {
    if (ev.key === "Alt" || ev.code === "AltLeft" || ev.code === "AltRight") {
      ev.preventDefault();
      return;
    }
    const target = ev.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    if (ev.repeat) return;

    if (ev.code === "Space") {
      ev.preventDefault();
      this.onPauseClick();
      return;
    }

    const slot = (SKILL_HOTKEY_CODES as readonly string[]).indexOf(ev.code);
    if (slot < 0) return;
    if (!document.getElementById("grimoire")?.hidden) return;
    if (!document.getElementById("character")?.hidden) return;
    if (!document.getElementById("bestiary")?.hidden) return;
    if (!document.getElementById("item-generator")?.hidden) return;
    if (!document.getElementById("side-menu")?.hidden) return;

    const id = this.hero?.abilities[slot];
    if (!id) return;
    ev.preventDefault();
    this.selectAbility(id);
  };

  private readonly onKeyUp = (ev: KeyboardEvent): void => {
    if (ev.key === "Alt" || ev.code === "AltLeft" || ev.code === "AltRight") {
      ev.preventDefault();
    }
  };

  private bindHud(): void {
    this.hud.onStart(this.onStartClick);
    document.getElementById("btn-pause")?.addEventListener("click", this.onPauseClick);
    document.getElementById("btn-speed")?.addEventListener("click", this.onSpeedClick);
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("contextmenu", this.onContextMenu);
    document.addEventListener("pointerdown", this.onDocPointer);
  }

  /** Сброс выбора способности, требующей цель (ПКМ). */
  cancelAbilityTargeting(): void {
    if (!this.selectedAbility && !this.pendingCast) return;
    this.selectedAbility = null;
    this.pendingCast = null;
    this.clearAbilityTelegraph();
    this.refreshSkillBar();
    this.hud.setHint(this.idleHint());
  }

  private idleHint(): string {
    const reach = WEAPON_REACH[this.weapon];
    return `${WEAPON_LABEL[this.weapon]} достаёт ${reach} ${this.rowsWord(reach)} снизу. Клик по врагу в дальности задаёт цель автоатаки.`;
  }

  private rowsWord(n: number): string {
    if (n === 1) return "ряд";
    return "ряда";
  }

  /** 1 — нижний ряд у героя, 4 — верхний. */
  private distanceOf(row: number): number {
    return GRID_SIZE - row;
  }

  private drawArena(): Container {
    const gridW = GRID_SIZE * PITCH - GAP;
    const gridH = GRID_SIZE * PITCH - GAP;
    const totalH = gridH + STACK_GAP + HERO_SIZE;
    this.gridOrigin = { x: -gridW / 2, y: -totalH / 2 };
    this.heroAnchor = {
      x: 0,
      y: -totalH / 2 + gridH + STACK_GAP + HERO_SIZE / 2,
    };

    const c = new Container();

    const grid = new Graphics();
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE; row++) {
        const x = this.gridOrigin.x + col * PITCH;
        const y = this.gridOrigin.y + row * PITCH;
        grid.roundRect(x, y, CELL, CELL, 6).fill({ color: 0x141a14, alpha: 0.9 });
        grid.roundRect(x, y, CELL, CELL, 6).stroke({ color: 0x5a3a3a, width: 1.5, alpha: 0.55 });
      }
    }
    c.addChild(grid);

    for (let row = 0; row < GRID_SIZE; row++) {
      const label = new Text({
        text: String(this.distanceOf(row)),
        style: {
          fontFamily: "Exo 2, sans-serif",
          fontSize: 13,
          fontWeight: "800",
          fill: 0x7a6840,
        },
      });
      label.anchor.set(1, 0.5);
      label.position.set(
        this.gridOrigin.x - 10,
        this.gridOrigin.y + row * PITCH + CELL / 2,
      );
      c.addChild(label);
    }

    const shadow = new Graphics();
    shadow.ellipse(this.heroAnchor.x, this.heroAnchor.y + 8, HERO_SIZE * 0.42, 18).fill({
      color: 0x000000,
      alpha: 0.35,
    });
    c.addChild(shadow);
    return c;
  }

  private cellCenter(pos: GridPos): { x: number; y: number } {
    return {
      x: this.gridOrigin.x + pos.col * PITCH + CELL / 2,
      y: this.gridOrigin.y + pos.row * PITCH + CELL / 2,
    };
  }

  private layout(): void {
    this.commitDrop();
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.fitBackground(w, h);
    const gridW = GRID_SIZE * PITCH - GAP;
    const gridH = GRID_SIZE * PITCH - GAP;
    const totalH = gridH + STACK_GAP + HERO_SIZE;
    const portrait = w <= 520 && h > w;
    const phoneLandscape = h <= 450 && w > h && w <= 960;
    const side = portrait ? 4 : phoneLandscape ? 48 : 120;
    const topInset = portrait ? 48 : phoneLandscape ? 36 : 78;
    const bottomInset = portrait
      ? Math.round(Math.min(h * 0.26, 220))
      : phoneLandscape
        ? Math.round(Math.min(h * 0.34, 140))
        : 168;
    const pad = portrait || phoneLandscape ? 6 : 28;
    const scale = Math.min(1, (w - side * 2) / (gridW + pad), (h - topInset - bottomInset) / (totalH + 20));
    this.baseBoardX = w / 2;
    this.baseBoardY = topInset + (h - topInset - bottomInset) / 2;
    this.board.position.set(this.baseBoardX, this.baseBoardY);
    this.board.scale.set(Math.floor(scale * 100) / 100);
    this.placeAll();
    this.drawWeaponRange();
    this.syncBannerPosition();
  }

  private syncBannerPosition(): void {
    const scale = this.board.scale.x;
    const gridTop = this.baseBoardY + this.gridOrigin.y * scale;
    this.hud.setBattleBannerPosition(this.baseBoardX, gridTop - 12);
  }

  private syncBattleBanner(): void {
    if (!this.started) {
      this.hud.setBattleBanner("start");
      return;
    }
    if (this.paused && !this.ended) {
      this.hud.setBattleBanner("pause");
      return;
    }
    this.hud.setBattleBanner("hidden");
  }

  /** Cover-скейл фона под размер окна. */
  private fitBackground(w: number, h: number): void {
    const tex = this.background.texture;
    const tw = tex.width || 1;
    const th = tex.height || 1;
    const scale = Math.max(w / tw, h / th);
    this.background.scale.set(scale);
    this.background.position.set(w / 2, h / 2);
  }

  private placeAll(): void {
    for (const u of this.units) {
      if (u.team === "player") {
        u.view.position.set(this.heroAnchor.x, this.heroAnchor.y);
      } else if (u.alive) {
        const c = this.cellCenter(u.pos);
        u.view.position.set(c.x, c.y);
      }
    }
  }

  private spawnCrowd(): void {
    const starter = createStarterWeapon("mainhand");
    const equipment = { mainhand: starter };
    const weapon = starter.weapon!;
    this.hero = new Unit({
      id: "aira",
      name: "Айра",
      short: "АЙР",
      team: "player",
      school: "air",
      pos: { col: 1, row: 0 },
      stats: {
        maxHp: 2000,
        atk: weapon.damageMax,
        autoAttackCd: weapon.baseCd,
        range: weapon.range,
        reach: weapon.reach,
      },
      abilities: ALL_ABILITY_IDS,
      portraitUrl: pickRandomHeroPortraitUrl(),
      cardSize: HERO_SIZE,
      equipment,
      sheet: undefined,
    });
    // База + стартовое оружие уже в compute через equipment; maxHp из base sheet.
    this.hero.rebuildSheetFromEquipment(createBaseHeroSheet());
    this.weapon = weapon.kind;
    this.unitsLayer.addChild(this.hero.view);
    this.units.push(this.hero);
    this.hud.setHero(this.hero);

    rollEncounter().forEach((spawn, index) => {
      const kind = spawn.kind;
      const u = new Unit({
        id: `${kind.id}-${index}`,
        name: kind.name,
        short: kind.short,
        team: "enemy",
        school: kind.school,
        pos: { col: spawn.col, row: spawn.row },
        stats: {
          maxHp: kind.hp,
          atk: kind.atk,
          autoAttackCd: kind.cd,
          range: kind.reach <= 2 ? "melee" : "ranged",
          reach: kind.reach,
        },
        abilities: kind.abilities ?? [],
        portraitUrl: kind.portraitUrl,
      });
      this.unitsLayer.addChild(u.view);
      this.units.push(u);
    });
  }

  private skillBarState(): { selectedAbility: AbilityId | null; gcdRemaining: number; gcdDuration: number } {
    return {
      selectedAbility: this.selectedAbility,
      gcdRemaining: this.gcdRemaining,
      gcdDuration: ABILITY_GCD,
    };
  }

  private refreshSkillBar(rebuild = false): void {
    if (rebuild) this.hud.renderSkills(this.hero, this.skillBarState());
    else this.hud.syncSkills(this.hero, this.skillBarState());
    this.syncCanvasCursor();
  }

  private syncCanvasCursor(): void {
    // Способность с выбором цели/клетки - курсор-мишень.
    this.app.canvas.style.cursor = this.selectedAbility
      ? "var(--cur-target)"
      : "var(--cur-default)";
  }

  selectHero(id: string | null): void {
    if (id !== this.hero.id) return;
    this.selectedAbility = null;
    this.clearAbilityTelegraph();
    this.refreshSkillBar(true);
    this.hud.setHint(this.idleHint());
  }

  setWeapon(kind: WeaponKind): void {
    this.weapon = kind;
    this.hero.stats.reach = WEAPON_REACH[kind];
    this.hero.stats.range = kind === "bow" || kind === "staff" ? "ranged" : "melee";
    // Песочница: смена типа оружия обновляет implicit на mainhand, аффиксы сохраняются.
    const main = this.hero.equipment.mainhand;
    if (main?.weapon) {
      main.weapon.kind = kind;
      main.weapon.reach = WEAPON_REACH[kind];
      main.weapon.range = kind === "bow" || kind === "staff" ? "ranged" : "melee";
      main.weapon.baseCd = kind === "bow" || kind === "staff" ? 1.6 : kind === "spear" ? 1.4 : 1.2;
      this.hero.stats.autoAttackCd = main.weapon.baseCd;
      main.name = WEAPON_LABEL[kind];
    }
    const pref = this.livingEnemies().find((u) => u.id === this.hero.preferredTargetId);
    if (pref && this.distanceOf(pref.pos.row) > WEAPON_REACH[kind]) {
      this.hero.preferredTargetId = null;
      this.hud.showToast("Цель вышла из дальности оружия");
    }
    this.drawWeaponRange();
    if (!this.selectedAbility) this.hud.setHint(this.idleHint());
  }

  selectAbility(id: AbilityId): void {
    if (!this.started) {
      this.hud.showToast("Сначала нажми Старт");
      return;
    }
    if (this.paused) {
      this.hud.showToast("На паузе способности недоступны");
      return;
    }
    if (!this.hero.alive) return;
    if (this.gcdRemaining > 0) {
      this.hud.showToast("Глобальная перезарядка");
      return;
    }
    if ((this.hero.abilityCd[id] ?? 0) > 0) {
      this.hud.showToast("Способность на перезарядке");
      return;
    }
    this.pendingCast = null;
    const def = ABILITIES[id];
    if (!this.canPayMana(def)) {
      this.hud.showToast("Недостаточно маны");
      return;
    }
    if (def.reach <= 0) {
      void this.performCast(def, this.hero, null);
      return;
    }
    this.selectedAbility = id;
    this.refreshSkillBar();
    this.hud.setHint(this.abilityAimHint(def));
    this.drawAbilityTelegraph(def);
  }

  private abilityAimHint(def: AbilityDef): string {
    if (def.targetMode === "zone") {
      return `${def.name}: зона, ряд ${def.reach}. ЛКМ - клетка, ПКМ - отмена.`;
    }
    if (def.targetMode === "cell") {
      return `${def.name}: клетка, ряд ${def.reach}. ЛКМ - клетка (можно пустая), ПКМ - отмена.`;
    }
    return `${def.name}: радиус ${def.reach}. ЛКМ - враг, ПКМ - отмена.`;
  }

  private isGroundTarget(mode: AbilityDef["targetMode"]): boolean {
    return mode === "zone" || mode === "cell" || mode === "enemy_blast" || mode === "cone";
  }

  private onCanvasPointer(ev: PointerEvent): void {
    const { x: localX, y: localY } = this.pointerLocal(ev);
    const hit = this.unitAtLocal(localX, localY);
    if (hit) {
      this.onUnitClick(hit);
      return;
    }
    if (!this.selectedAbility) return;
    if (this.paused) {
      this.hud.showToast("На паузе способности недоступны");
      return;
    }
    const cell = this.cellAtLocal(localX, localY);
    if (!cell) return;
    const def = ABILITIES[this.selectedAbility];
    if (this.distanceOf(cell.row) > def.reach) {
      this.hud.showToast("Клетка вне радиуса");
      return;
    }
    if (this.isGroundTarget(def.targetMode)) {
      void this.performCast(def, this.unitAtCell(cell), cell);
      return;
    }
    this.hud.showToast("Нужна цель-враг");
  }

  private onUnitClick(u: Unit): void {
    if (u.team === "player") {
      if (!this.selectedAbility) this.selectHero(u.id);
      else this.hud.showToast("Это способность по врагам");
      return;
    }
    if (this.selectedAbility) {
      if (this.paused) {
        this.hud.showToast("На паузе способности недоступны");
        return;
      }
      const def = ABILITIES[this.selectedAbility];
      if (this.distanceOf(u.pos.row) > def.reach) {
        this.hud.showToast("Цель вне радиуса способности");
        return;
      }
      void this.performCast(def, u, u.pos);
      return;
    }
    if (this.distanceOf(u.pos.row) > WEAPON_REACH[this.weapon]) {
      this.hud.showToast(`Вне дальности: ${WEAPON_LABEL[this.weapon].toLowerCase()}`);
      return;
    }
    this.hero.preferredTargetId = u.id;
  }

  private unitAtLocal(x: number, y: number): Unit | null {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i]!;
      if (!u.alive || !u.view.visible) continue;
      const half = u.cardSize / 2;
      if (Math.abs(u.view.x - x) <= half && Math.abs(u.view.y - y) <= half) return u;
    }
    return null;
  }

  private cellAtLocal(x: number, y: number): GridPos | null {
    const col = Math.floor((x - this.gridOrigin.x) / PITCH);
    const row = Math.floor((y - this.gridOrigin.y) / PITCH);
    if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) return null;
    return { col, row };
  }

  private unitAtCell(pos: GridPos): Unit | null {
    return (
      this.units.find((u) => u.team === "enemy" && u.alive && u.pos.col === pos.col && u.pos.row === pos.row) ??
      null
    );
  }

  private cellsInReach(reach: number): GridPos[] {
    const cells: GridPos[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      if (this.distanceOf(row) > reach) continue;
      for (let col = 0; col < GRID_SIZE; col++) cells.push({ col, row });
    }
    return cells;
  }

  private drawWeaponRange(): void {
    this.rangeGfx.clear();
  }

  private drawAbilityTelegraph(def: AbilityDef): void {
    this.clearAbilityTelegraph();
    const cells = this.cellsInReach(def.reach);
    this.abilityGfx = this.vfx.highlightCells(
      cells.map((pos) => {
        const c = this.cellCenter(pos);
        return { x: c.x, y: c.y, size: CELL - 8 };
      }),
      TELEGRAPH_REACH,
      { fillAlpha: 0.08, strokeAlpha: 0.32, strokeWidth: 1.5 },
    );
    this.telegraphLayer.addChild(this.abilityGfx);
  }

  private updateAbilityHover(ev: PointerEvent): void {
    if (this.destroyed || !this.selectedAbility || this.paused || this.casting) {
      this.clearHoverTelegraph();
      return;
    }
    const def = ABILITIES[this.selectedAbility];
    if (!this.isGroundTarget(def.targetMode)) {
      this.clearHoverTelegraph();
      return;
    }
    const local = this.pointerLocal(ev);
    const unit = this.unitAtLocal(local.x, local.y);
    let cell: GridPos | null = null;
    if (unit && unit.team === "enemy" && this.distanceOf(unit.pos.row) <= def.reach) {
      cell = { ...unit.pos };
    } else {
      cell = this.cellAtLocal(local.x, local.y);
      if (cell && this.distanceOf(cell.row) > def.reach) cell = null;
    }
    if (!cell) {
      this.clearHoverTelegraph();
      return;
    }
    if (this.hoverCell && this.hoverCell.col === cell.col && this.hoverCell.row === cell.row) return;
    this.drawHoverImpact(def, cell);
  }

  private drawHoverImpact(def: AbilityDef, cell: GridPos): void {
    this.hoverGfx?.destroy();
    this.hoverGfx = null;
    this.hoverCell = cell;
    const hits =
      def.id === "flame_cone"
        ? dragonBreathCells(cell).map((h) => h.pos)
        : def.id === "squall"
          ? squallCells(cell)
          : [cell];
    const centers = hits.map((pos) => {
      const c = this.cellCenter(pos);
      return { x: c.x, y: c.y, size: CELL - 6 };
    });
    this.hoverGfx = this.vfx.highlightCells(centers, TELEGRAPH_IMPACT, {
      fillAlpha: 0.34,
      strokeAlpha: 0.95,
      strokeWidth: 2.5,
    });
    this.telegraphLayer.addChild(this.hoverGfx);
  }

  private clearHoverTelegraph(): void {
    this.hoverGfx?.destroy();
    this.hoverGfx = null;
    this.hoverCell = null;
  }

  private clearAbilityTelegraph(): void {
    this.abilityGfx?.destroy();
    this.abilityGfx = null;
    this.clearHoverTelegraph();
  }

  private async performCast(def: AbilityDef, clicked: Unit | null, cell: GridPos | null): Promise<void> {
    if (this.destroyed || !this.started || this.paused) return;
    if (def.targetMode === "enemy" && (!clicked || clicked.team !== "enemy" || !clicked.alive)) {
      this.hud.showToast("Нужна цель-враг");
      return;
    }
    if (this.isGroundTarget(def.targetMode) && !cell && !clicked) {
      this.hud.showToast("Нужна клетка");
      return;
    }
    if (this.casting) {
      // Не глотаем клик во время VFX предыдущего каста — ставим в очередь.
      this.pendingCast = { def, clicked, cell };
      this.selectedAbility = null;
      this.clearAbilityTelegraph();
      this.refreshSkillBar();
      this.hud.setHint(`Ожидание: ${def.name}…`);
      return;
    }
    if (this.gcdRemaining > 0) {
      this.hud.showToast("Глобальная перезарядка");
      return;
    }
    if (!this.canPayMana(def)) {
      this.hud.showToast("Недостаточно маны");
      return;
    }
    this.spendMana(def);
    this.casting = true;
    this.gcdRemaining = ABILITY_GCD;
    this.pendingCast = null;
    this.selectedAbility = null;
    this.clearAbilityTelegraph();
    const cdr = this.hero.sheet ? getStat(this.hero.sheet, "cooldownReduction") : 0;
    this.hero.abilityCd[def.id] = abilityCooldown(def.cooldown, cdr);
    this.refreshSkillBar();
    this.hud.setHint(`Каст: ${def.name}…`);
    try {
      await this.resolveAbility(def, clicked, cell);
    } finally {
      if (!this.destroyed) {
        this.hero.setHidden(false);
        this.hero.view.position.set(this.heroAnchor.x, this.heroAnchor.y);
        this.casting = false;
        this.refreshSkillBar();
        this.hud.setHint(this.hero.alive ? "Способность применена" : "Айра пала");
        this.checkEnd();
        this.tryFlushPendingCast();
      }
    }
  }

  private tryFlushPendingCast(): void {
    if (this.destroyed || this.casting || this.paused || !this.pendingCast) return;
    if (this.gcdRemaining > 0) return;
    if (!this.hero.alive) {
      this.pendingCast = null;
      return;
    }
    const next = this.pendingCast;
    this.pendingCast = null;
    void this.performCast(next.def, next.clicked, next.cell);
  }

  private async resolveAbility(def: AbilityDef, clicked: Unit | null, cell: GridPos | null): Promise<void> {
    const caster = this.hero;
    const from = { x: this.heroAnchor.x, y: this.heroAnchor.y };
    caster.flash(SCHOOL_COLOR[def.school]);

    switch (def.id) {
      case "ice_arrow": {
        const aim = this.aimCell(cell, clicked);
        if (!aim) return;
        const to = this.cellCenter(aim);
        const slowDur = def.effects?.slowDuration ?? 3;
        const slowPot = def.effects?.slowPotency ?? 0.35;
        await this.vfx.iceArrow(from, to, () => {
          const hit = this.occupantAtImpact(aim, to);
          if (!hit) return;
          this.dealAbilityDamage(caster, hit, def.damage, def);
          hit.addStatus({ id: "slow", kind: "slow", remaining: slowDur, potency: slowPot });
        });
        break;
      }
      case "ice_shield": {
        await this.vfx.iceShieldAura(
          caster.center.x,
          caster.center.y,
          caster.cardSize * 0.58,
        );
        const shieldAmt = def.effects?.shieldAmount ?? 55;
        const shieldDur = def.effects?.shieldDuration ?? 6;
        caster.addStatus({ id: "shield", kind: "shield", remaining: shieldDur, potency: shieldAmt });
        this.vfx.floatingText(caster.center.x, caster.center.y - 20, "ЩИТ", 0x7ec8e8);
        break;
      }
      case "fireball": {
        const aim = this.aimCell(cell, clicked);
        if (!aim) return;
        const to = this.cellCenter(aim);
        const burnDur = def.effects?.burnDuration ?? 4;
        const burnPot = this.scaleDotPotency(caster, def.school, def.effects?.burnPerSec ?? 8);
        await this.vfx.fireball(from, to, [to], () => {
          const hit = this.occupantAtImpact(aim, to);
          if (!hit) return;
          this.dealAbilityDamage(caster, hit, def.damage, def);
          hit.addStatus({ id: "burn", kind: "burn", remaining: burnDur, potency: burnPot });
          this.vfx.floatingText(hit.center.x, hit.center.y - 20, "ГОРЕНИЕ", 0xff7a3d);
        });
        break;
      }
      case "flame_cone": {
        const aim = this.aimCell(cell, clicked);
        if (!aim) return;
        const hits = dragonBreathCells(aim);
        const centers = hits.map((h) => this.cellCenter(h.pos));
        const secondaryRatio = def.effects?.zoneSecondaryRatio ?? 0.55;
        await this.vfx.flameCone(from, centers, CELL);
        for (const hit of hits) {
          const u = this.unitAtCell(hit.pos);
          if (!u) continue;
          this.dealAbilityDamage(caster, u, hit.full ? def.damage : def.damage * secondaryRatio, def);
        }
        break;
      }
      case "stun_strike": {
        const aim = this.aimCell(cell, clicked);
        if (!aim) return;
        const to = this.cellCenter(aim);
        const home = { ...from };
        const stunDur = def.effects?.stunDuration ?? 2.2;
        await this.vfx.stunStrike(
          from,
          to,
          (t) => {
            caster.view.x = home.x + (to.x - home.x) * 0.2 * t;
            caster.view.y = home.y + (to.y - home.y) * 0.2 * t;
          },
          () => {
            const hit = this.occupantAtImpact(aim, to);
            if (!hit) return;
            this.dealAbilityDamage(caster, hit, def.damage, def);
            hit.addStatus({ id: "stun", kind: "stun", remaining: stunDur, potency: 1 });
            this.vfx.floatingText(hit.center.x, hit.center.y - 24, "ОГЛУШЕНИЕ", 0xc9b896);
          },
        );
        caster.view.position.set(home.x, home.y);
        break;
      }
      case "titan_might": {
        await this.vfx.titanMight(from, [caster.center]);
        const buffDur = def.effects?.atkBuffDuration ?? 5;
        const buffPot = def.effects?.atkBuffPotency ?? 0.35;
        caster.addStatus({ id: "atk_buff", kind: "atk_buff", remaining: buffDur, potency: buffPot });
        this.vfx.floatingText(caster.center.x, caster.center.y - 20, "СИЛА", 0xc9b896);
        break;
      }
      case "sever_artery": {
        if (!clicked || !clicked.alive) return;
        // Мгновенно: урон и кровотечение в кадр каста, VFX только визуал.
        const bleedDur = def.effects?.bleedDuration ?? 5;
        const bleedPot = this.scaleDotPotency(caster, def.school, def.effects?.bleedPerSec ?? 12);
        this.dealAbilityDamage(caster, clicked, def.damage, def);
        clicked.addStatus({ id: "bleed", kind: "bleed", remaining: bleedDur, potency: bleedPot });
        this.vfx.floatingText(clicked.center.x, clicked.center.y - 20, "КРОВОТЕЧЕНИЕ", 0xc45a4a);
        await this.vfx.severArtery(clicked.center.x, clicked.center.y);
        break;
      }
      case "shadow_strike": {
        if (!clicked) return;
        const aim = { ...clicked.pos };
        const to = this.cellCenter(aim);
        caster.addStatus({ id: "invuln", kind: "invuln", remaining: 99, potency: 1 });
        caster.setHidden(true);
        try {
          await this.vfx.shadowDash(from, to, () => {
            if (!this.sameEnemyOnCell(clicked, aim, to)) return;
            this.dealAbilityDamage(caster, clicked, def.damage, def);
          });
        } finally {
          caster.clearStatus("invuln");
          caster.setHidden(false);
          caster.view.position.set(from.x, from.y);
        }
        break;
      }
      case "wind_gust": {
        if (!clicked || !clicked.alive) return;
        const aim = { ...clicked.pos };
        const target = clicked;
        const to = this.cellCenter(aim);
        await this.vfx.projectile(from, to, SCHOOL_COLOR.air, {
          size: 12,
          trail: true,
          arc: 18,
          duration: 0.32,
          // Попадание в том же кадре, до сдвига ряда. Иначе снаряд и промахивается, и отбрасывает.
          onArrive: () => {
            if (this.destroyed) return;
            if (!this.sameEnemyOnCell(target, aim, to)) return;
            this.dealAbilityDamage(caster, target, def.damage, def);
            this.tryKnockbackAway(target);
          },
        });
        break;
      }
      case "wind_speed": {
        await this.vfx.ring(caster.center.x, caster.center.y, SCHOOL_COLOR.air, caster.cardSize * 0.7, 0.4);
        const hasteMult = def.effects?.hasteIntervalMult ?? 0.75;
        const hasteDur = def.effects?.hasteDuration ?? 5;
        caster.addStatus({ id: "haste", kind: "haste", remaining: hasteDur, potency: hasteMult });
        this.vfx.floatingText(caster.center.x, caster.center.y - 20, "ВЕТЕР", 0xa8c8dc);
        break;
      }
      case "squall": {
        const aim = this.aimCell(cell, clicked);
        if (!aim) return;
        const hits = squallCells(aim);
        const centers = hits.map((pos) => this.cellCenter(pos));
        await this.vfx.flashCircle(this.cellCenter(aim).x, this.cellCenter(aim).y, SCHOOL_COLOR.air, CELL * 0.55, 0.28);
        for (const c of centers) {
          void this.vfx.ring(c.x, c.y, SCHOOL_COLOR.air, CELL * 0.42, 0.35);
        }
        for (const pos of hits) {
          const u = this.unitAtCell(pos);
          if (!u) continue;
          this.dealAbilityDamage(caster, u, def.damage, def);
        }
        break;
      }
      case "tornado": {
        const aim = this.aimCell(cell, clicked);
        if (!aim) return;
        this.spawnTornado(aim, def);
        await this.vfx.ring(this.cellCenter(aim).x, this.cellCenter(aim).y, SCHOOL_COLOR.air, CELL * 0.55, 0.4);
        break;
      }
      default:
        break;
    }
  }

  /** Отброс на 1 клетку дальше от героя. Если занято или за краем - без сдвига. */
  private tryKnockbackAway(u: Unit): void {
    if (!u.alive) return;
    const next = { col: u.pos.col, row: u.pos.row - 1 };
    if (!inBounds(next) || this.unitAtCell(next)) return;
    u.pos = next;
    this.retargetMotion(u);
    this.vfx.floatingText(u.center.x, u.center.y - 28, "ОТБРОШЕН", 0xa8c8dc);
    this.interruptUnitCast(u);
  }

  /** Срыв подготовки: спец-способность или сдвиг с клетки. Обычный урон не срывает. */
  private interruptUnitCast(u: Unit): void {
    if (!u.interruptCast()) return;
    this.showCastInterrupted(u);
  }

  private showCastInterrupted(u: Unit): void {
    this.vfx.floatingText(u.center.x, u.center.y - 28, "ПРЕРВАНО", 0xe8dc9a);
  }

  private tryStartEnemyCast(u: Unit): void {
    if (!u.alive || u.cast || u.hasStatus("stun") || !u.abilities.length) return;
    if (!this.findAutoTarget(u)) return;
    for (const id of u.abilities) {
      if ((u.abilityCd[id] ?? 0) > 0) continue;
      const def = ABILITIES[id];
      if (!def) continue;
      u.abilityCd[id] = def.cooldown;
      const castTime = def.effects?.castTime ?? 0;
      if (castTime <= 0) {
        void this.resolveEnemyAbility(u, id);
        return;
      }
      u.beginCast(id, castTime);
      u.flash(0x1cf0ff);
      return;
    }
  }

  private async resolveEnemyAbility(caster: Unit, id: AbilityId): Promise<void> {
    if (!caster.alive || this.destroyed) return;
    const def = ABILITIES[id];
    if (!def) return;
    switch (id) {
      case "dark_arrow": {
        const target = this.hero;
        if (!target.alive) return;
        const from = caster.center;
        const to = target.center;
        await this.vfx.projectile(from, to, 0x6a4a8a, { size: 10, trail: true, arc: 14, duration: 0.36 });
        if (!caster.alive || !target.alive || this.destroyed) return;
        this.dealAbilityDamage(caster, target, def.damage, def);
        break;
      }
      default:
        break;
    }
  }

  private spawnTornado(pos: GridPos, def: AbilityDef): void {
    const c = this.cellCenter(pos);
    const gfx = new Graphics();
    this.drawTornadoGfx(gfx, c.x, c.y);
    this.telegraphLayer.addChild(gfx);
    const field: TornadoField = {
      pos: { ...pos },
      stayElapsed: 0,
      stayIndex: 0,
      lastTick: -1,
      dps: def.effects?.tornadoDps ?? def.damage,
      staySec: def.effects?.tornadoStaySec ?? 3,
      stays: def.effects?.tornadoStays ?? 3,
      gfx,
    };
    this.tornados.push(field);
    this.tornadoTick(field);
    field.lastTick = 0;
  }

  private drawTornadoGfx(gfx: Graphics, x: number, y: number): void {
    gfx.clear();
    gfx.circle(x, y, CELL * 0.38).fill({ color: 0xa8c8dc, alpha: 0.28 });
    gfx.circle(x, y, CELL * 0.38).stroke({ color: 0xd5e6f0, width: 2, alpha: 0.85 });
    gfx.circle(x, y, CELL * 0.18).fill({ color: 0xffffff, alpha: 0.22 });
  }

  private tornadoTick(field: TornadoField): void {
    const u = this.unitAtCell(field.pos);
    if (!u) return;
    this.dealAbilityDamage(this.hero, u, field.dps, ABILITIES.tornado);
  }

  private updateTornados(dt: number): void {
    if (!this.tornados.length) return;
    const keep: TornadoField[] = [];
    for (const field of this.tornados) {
      field.stayElapsed += dt;
      const tickIndex = Math.floor(field.stayElapsed);
      if (tickIndex > field.lastTick) {
        const upto = Math.min(field.staySec - 1, tickIndex);
        for (let t = field.lastTick + 1; t <= upto; t++) this.tornadoTick(field);
        field.lastTick = upto;
      }
      if (field.stayElapsed < field.staySec) {
        keep.push(field);
        continue;
      }
      field.stayIndex += 1;
      if (field.stayIndex >= field.stays) {
        field.gfx.destroy();
        continue;
      }
      const options = orthoNeighbors(field.pos);
      if (options.length) {
        field.pos = { ...options[Math.floor(Math.random() * options.length)]! };
        const c = this.cellCenter(field.pos);
        this.drawTornadoGfx(field.gfx, c.x, c.y);
      }
      field.stayElapsed = 0;
      field.lastTick = -1;
      this.tornadoTick(field);
      field.lastTick = 0;
      keep.push(field);
    }
    this.tornados = keep;
  }

  private clearTornados(): void {
    for (const field of this.tornados) field.gfx.destroy();
    this.tornados = [];
  }

  private aimCell(cell: GridPos | null, clicked: Unit | null): GridPos | null {
    if (cell) return { ...cell };
    if (clicked) return { ...clicked.pos };
    return null;
  }

  /** Урон по клетке: кто стоит в момент удара (или промах, если пусто). */
  private occupantAtImpact(aim: GridPos, impact: { x: number; y: number }): Unit | null {
    const u = this.unitAtCell(aim);
    if (u) return u;
    this.vfx.floatingText(impact.x, impact.y - 10, "ПРОМАХ", 0x9aa3a0);
    return null;
  }

  /** Способности с targetMode "enemy": нужна та же цель на клетке прицеливания. */
  private sameEnemyOnCell(target: Unit, aim: GridPos, impact: { x: number; y: number }): boolean {
    if (target.alive && target.pos.col === aim.col && target.pos.row === aim.row) return true;
    this.vfx.floatingText(impact.x, impact.y - 10, "ПРОМАХ", 0x9aa3a0);
    return false;
  }

  private canPayMana(def: AbilityDef): boolean {
    const cost = this.abilityManaCost(def);
    return cost <= 0 || this.hero.mana >= cost;
  }

  private abilityManaCost(def: AbilityDef): number {
    const base = def.manaCost ?? 0;
    if (base <= 0 || !this.hero.sheet) return base;
    return manaCost(base, getStat(this.hero.sheet, "manaCostReduction"));
  }

  private spendMana(def: AbilityDef): void {
    const cost = this.abilityManaCost(def);
    if (cost > 0) this.hero.mana = Math.max(0, this.hero.mana - cost);
  }

  /** Урон/DoT-пакет способности с плоским ability% + school%. */
  private scaleAbilityPacket(attacker: Unit, school: School, base: number): { dmg: number; crit: boolean } {
    if (!attacker.sheet) {
      return { dmg: Math.round(base * attacker.atkMultiplier()), crit: false };
    }
    const crit = rollCrit(attacker.sheet);
    const dmg = abilityPacketDamage(base, attacker.sheet, school, attacker.atkMultiplier(), crit);
    return { dmg, crit };
  }

  private dealAbilityDamage(attacker: Unit, target: Unit, base: number, def?: AbilityDef): void {
    const school = def?.school ?? attacker.school;
    const { dmg, crit } = this.scaleAbilityPacket(attacker, school, base);
    const { dealt, castBroken, evaded } = target.applyDamage(dmg, { channel: "magical" });
    target.flash(0xffffff);
    if (evaded) {
      this.vfx.floatingText(target.center.x, target.center.y - 10, "УКЛОН", 0x9aa3a0);
      return;
    }
    if (dealt > 0) {
      const label = crit ? `${dealt}!` : `${dealt}`;
      this.vfx.floatingText(target.center.x, target.center.y - 10, label, crit ? 0xffb060 : 0xffe6a0);
    }
    if (!target.alive) this.vfx.floatingText(target.center.x, target.center.y, "ПАЛ", 0xc45a4a);
    if (castBroken) this.showCastInterrupted(target);
    else if (def?.effects?.interruptsCast) this.interruptUnitCast(target);
  }

  /** DoT potency (урон/сек): плоский ability% + school%, без крита на наложении. */
  private scaleDotPotency(attacker: Unit, school: School, perSec: number): number {
    if (!attacker.sheet) return Math.round(perSec * attacker.atkMultiplier());
    return abilityPacketDamage(perSec, attacker.sheet, school, attacker.atkMultiplier(), false);
  }

  private livingEnemies(): Unit[] {
    return this.units.filter((u) => u.team === "enemy" && u.alive);
  }

  private findAutoTarget(attacker: Unit): Unit | null {
    if (attacker.team === "enemy") {
      const reach = attacker.stats.reach ?? 1;
      if (!this.hero.alive || this.distanceOf(attacker.pos.row) > reach) return null;
      return this.hero;
    }
    const reach = WEAPON_REACH[this.weapon];
    const pool = this.livingEnemies().filter((e) => this.distanceOf(e.pos.row) <= reach);
    if (!pool.length) return null;
    const pref = pool.find((e) => e.id === attacker.preferredTargetId);
    if (pref) return pref;
    pool.sort((a, b) => this.distanceOf(a.pos.row) - this.distanceOf(b.pos.row) || a.pos.col - b.pos.col);
    return pool[0] ?? null;
  }

  private async doAutoAttack(attacker: Unit): Promise<void> {
    if (!attacker.alive || attacker.hasStatus("stun") || this.destroyed) return;
    const target = this.findAutoTarget(attacker);
    if (!target) return;
    const reach = attacker.team === "player" ? WEAPON_REACH[this.weapon] : (attacker.stats.reach ?? 1);
    await this.vfx.autoAttackBolt(attacker.center, target.center, reach <= 2);
    if (!target.alive || this.destroyed) return;

    let dmg: number;
    let crit = false;
    if (attacker.team === "player" && attacker.sheet) {
      const w = attacker.equipment.mainhand?.weapon;
      const roll = w
        ? rollWeaponDamage(w.damageMin, w.damageMax)
        : attacker.stats.atk;
      crit = rollCrit(attacker.sheet);
      dmg = autoAttackDamage(roll, attacker.sheet, attacker.atkMultiplier(), crit);
    } else {
      dmg = Math.round(attacker.stats.atk * attacker.atkMultiplier());
    }

    const { dealt, castBroken, evaded } = target.applyDamage(dmg, { channel: "physical" });
    if (evaded) {
      this.vfx.floatingText(target.center.x, target.center.y - 8, "УКЛОН", 0x9aa3a0);
      return;
    }
    if (dealt > 0) {
      const label = crit ? `${dealt}!` : `${dealt}`;
      this.vfx.floatingText(target.center.x, target.center.y - 8, label, crit ? 0xffb060 : 0xe8e2d4);
    }
    if (castBroken) this.showCastInterrupted(target);
  }

  private frontClear(): boolean {
    const living = this.livingEnemies();
    if (!living.length) return false;
    const onFront = living.some((u) => u.pos.row === GRID_SIZE - 1);
    const above = living.some((u) => u.pos.row < GRID_SIZE - 1);
    return !onFront && above;
  }

  private maybeStartDrop(depth = 0): void {
    if (depth > GRID_SIZE || this.collapsing || !this.frontClear()) return;
    const movers = this.livingEnemies().filter((u) => u.pos.row < GRID_SIZE - 1);
    if (!movers.length) return;
    for (const u of this.units) {
      if (u.team === "enemy" && !u.alive) u.view.visible = false;
    }
    // Логическую клетку освобождаем сразу: снаряд в старую клетку = промах, даже пока идёт анимация.
    this.collapsing = true;
    for (const u of movers) {
      u.pos = { col: u.pos.col, row: u.pos.row + 1 };
      this.interruptUnitCast(u);
      this.retargetMotion(u);
    }
    if (this.motions.length === 0) {
      this.collapsing = false;
      this.maybeStartDrop(depth + 1);
    }
  }

  /** Один слайд к текущей логической клетке. Смена клетки перенацеливает, а не добавляет второй рывок. */
  private retargetMotion(u: Unit): void {
    if (!u.alive) return;
    const goal = this.cellCenter(u.pos);
    const dx = u.view.x - goal.x;
    const dy = u.view.y - goal.y;
    if (dx * dx + dy * dy < 0.25) {
      u.view.position.set(goal.x, goal.y);
      this.motions = this.motions.filter((m) => m.u !== u);
      return;
    }
    const existing = this.motions.find((m) => m.u === u);
    if (!existing) {
      this.motions.push({ u, x0: u.view.x, y0: u.view.y, toX: goal.x, toY: goal.y, elapsed: 0 });
      return;
    }
    if (existing.toX === goal.x && existing.toY === goal.y) return;
    existing.x0 = u.view.x;
    existing.y0 = u.view.y;
    existing.toX = goal.x;
    existing.toY = goal.y;
    existing.elapsed = 0;
  }

  private advanceMotion(dt: number): void {
    const keep: Motion[] = [];
    for (const m of this.motions) {
      if (!m.u.alive) continue;
      const goal = this.cellCenter(m.u.pos);
      if (m.toX !== goal.x || m.toY !== goal.y) {
        m.x0 = m.u.view.x;
        m.y0 = m.u.view.y;
        m.toX = goal.x;
        m.toY = goal.y;
        m.elapsed = 0;
      }
      m.elapsed += dt;
      const t = Math.min(1, m.elapsed / DROP_SEC);
      const e = easeInOutQuad(t);
      m.u.view.x = m.x0 + (m.toX - m.x0) * e;
      m.u.view.y = m.y0 + (m.toY - m.y0) * e;
      if (t < 1) keep.push(m);
      else m.u.view.position.set(m.toX, m.toY);
    }
    this.motions = keep;
    if (this.collapsing && this.motions.length === 0) {
      this.collapsing = false;
      this.maybeStartDrop();
    }
  }

  private commitDrop(): void {
    this.motions = [];
    this.collapsing = false;
  }

  private update(rawDt: number): void {
    const tweenDt = rawDt * this.timeScale;
    const combatDt = !this.started || this.paused ? 0 : rawDt * this.timeScale;
    if (combatDt > 0) this.advanceMotion(combatDt);
    this.tweens.update(tweenDt);
    this.board.position.set(this.baseBoardX, this.baseBoardY);
    this.vfx.update(rawDt);
    this.drawMark();

    if (combatDt <= 0) return;
    this.updateTornados(combatDt);
    this.gcdRemaining = Math.max(0, this.gcdRemaining - combatDt);

    for (const u of this.units) {
      if (!u.alive) continue;
      u.tickResourceRegen(combatDt);
      const needPreview = u.autoAttackNeed();
      if (u.team === "enemy" && !u.cast) {
        u.attackCharge = needPreview > 0 ? Math.min(1, u.autoTimer / needPreview) : 1;
      }
      if (u.tickStatuses(combatDt)) this.showCastInterrupted(u);
      for (const key of Object.keys(u.abilityCd)) {
        u.abilityCd[key] = Math.max(0, (u.abilityCd[key] ?? 0) - combatDt);
      }
      if (u.hasStatus("stun")) continue;

      if (u.team === "enemy" && u.cast) {
        u.cast.elapsed += combatDt;
        u.attackCharge = u.cast.duration > 0 ? Math.min(1, u.cast.elapsed / u.cast.duration) : 1;
        u.redraw();
        if (u.cast.elapsed >= u.cast.duration) {
          const castId = u.cast.id;
          u.cast = null;
          u.autoTimer = 0;
          u.attackCharge = 0;
          u.redraw();
          void this.resolveEnemyAbility(u, castId);
        }
        continue;
      }

      if (u.team === "enemy") {
        this.tryStartEnemyCast(u);
        if (u.cast) continue;
      }

      u.autoTimer += combatDt;
      const need = u.autoAttackNeed();
      if (u.autoTimer < need) continue;
      if (u.team === "player" && this.casting) continue;
      if (!this.findAutoTarget(u)) {
        u.autoTimer = need;
        continue;
      }
      u.autoTimer -= need;
      void this.doAutoAttack(u);
    }

    this.maybeStartDrop();
    this.tryFlushPendingCast();
    this.refreshSkillBar();
    this.checkEnd();
  }

  private drawMark(): void {
    this.mark.clear();
    const target = this.findAutoTarget(this.hero);
    if (!target) return;
    const r = target.cardSize / 2 + 8;
    this.mark.circle(target.view.x, target.view.y, r).stroke({ color: 0xc45a4a, width: 3, alpha: 0.95 });
  }

  private applyPause(paused: boolean): void {
    this.paused = paused;
    if (paused && this.selectedAbility) {
      this.selectedAbility = null;
      this.clearAbilityTelegraph();
    }
    if (paused) this.pendingCast = null;
    this.hud.setPause(paused);
    this.syncBattleBanner();
    this.refreshSkillBar();
  }

  private checkEnd(): void {
    if (this.ended || !this.started) return;
    if (this.paused && !this.hero.alive) return;
    const enemies = this.livingEnemies().length > 0;
    if (!enemies) {
      this.ended = true;
      this.applyPause(true);
      this.hud.showToast("Победа!");
      this.hud.setHint("Враги повержены.");
    } else if (!this.hero.alive) {
      this.ended = true;
      this.applyPause(true);
      this.hud.showToast("Поражение");
      this.hud.setHint("Айра пала.");
    }
  }
}
