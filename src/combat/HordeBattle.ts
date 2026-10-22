import { Application, Container, Graphics, Text } from "pixi.js";
import { ABILITIES, ALL_ABILITY_IDS, SCHOOL_COLOR } from "../abilities/definitions";
import { blastCells, GRID_SIZE } from "../abilities/shapes";
import { pickRandomHeroPortraitUrl } from "../art/portraits";
import type { AbilityDef, AbilityId, GridPos, WeaponKind } from "../types";
import { easeInOutQuad, TweenManager } from "../util/tween";
import { VfxManager } from "../vfx/VfxManager";
import { CELL, GAP } from "./board";
import { rollEncounter } from "./enemies";
import { Unit } from "./Unit";
import { WEAPON_LABEL, WEAPON_REACH } from "./weapons";
import type { BattleHudApi } from "../ui/BattleHud";

const PITCH = CELL + GAP;
const HERO_SIZE = CELL * 2 + GAP;
const STACK_GAP = 28;
const DROP_SEC = 0.4;
const ABILITY_GCD = 1;

interface DropAnim {
  u: Unit;
  x0: number;
  y0: number;
  to: { x: number; y: number };
}

interface PendingCast {
  def: AbilityDef;
  clicked: Unit | null;
  cell: GridPos | null;
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
  private hero!: Unit;
  private gcdRemaining = 0;
  private pendingCast: PendingCast | null = null;
  private gridOrigin = { x: 0, y: 0 };
  private heroAnchor = { x: 0, y: 0 };
  private baseBoardX = 0;
  private baseBoardY = 0;
  private rangeGfx = new Graphics();
  private abilityGfx: Graphics | null = null;
  private mark = new Graphics();
  private drop: { elapsed: number; anim: DropAnim[] } | null = null;
  private readonly hud: BattleHudApi;

  constructor(app: Application, hud: BattleHudApi) {
    this.app = app;
    this.hud = hud;
    this.vfx = new VfxManager(this.tweens);
    this.vfx.setShakeTarget(this.board);

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
    this.setWeapon("melee");
    this.selectHero(this.hero.id);
    this.bindHud();
    this.app.canvas.addEventListener("pointerdown", this.onPointer);
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

  private readonly onPauseClick = (): void => {
    this.applyPause(!this.paused);
    this.hud.setHint(this.paused ? "Пауза. Пробел — продолжить." : this.idleHint());
  };

  private readonly onSpeedClick = (): void => {
    this.timeScale = this.timeScale === 1 ? 2 : 1;
    this.hud.setSpeed(this.timeScale);
  };

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.app.ticker.remove(this.onTick);
    this.app.canvas.removeEventListener("pointerdown", this.onPointer);
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
    if (ev.code !== "Space") return;
    const target = ev.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    ev.preventDefault();
    if (ev.repeat) return;
    this.onPauseClick();
  };

  private readonly onKeyUp = (ev: KeyboardEvent): void => {
    if (ev.key === "Alt" || ev.code === "AltLeft" || ev.code === "AltRight") {
      ev.preventDefault();
    }
  };

  private bindHud(): void {
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
    const bg = new Graphics();
    bg.rect(-900, -700, 1800, 1400).fill({ color: 0x0c100c });
    c.addChild(bg);

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
    const gridW = GRID_SIZE * PITCH - GAP;
    const gridH = GRID_SIZE * PITCH - GAP;
    const totalH = gridH + STACK_GAP + HERO_SIZE;
    const topInset = 78;
    const bottomInset = 168;
    const scale = Math.min(1, (w - 120) / (gridW + 48), (h - topInset - bottomInset) / (totalH + 36));
    this.baseBoardX = w / 2;
    this.baseBoardY = topInset + (h - topInset - bottomInset) / 2;
    this.board.position.set(this.baseBoardX, this.baseBoardY);
    this.board.scale.set(Math.floor(scale * 100) / 100);
    this.placeAll();
    this.drawWeaponRange();
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
    this.hero = new Unit({
      id: "aira",
      name: "Айра",
      short: "АЙР",
      team: "player",
      school: "ice",
      pos: { col: 1, row: 0 },
      stats: { maxHp: 2000, atk: 26, autoAttackCd: 1.2, range: "melee", reach: 1 },
      abilities: ALL_ABILITY_IDS,
      portraitUrl: pickRandomHeroPortraitUrl(),
      cardSize: HERO_SIZE,
    });
    this.unitsLayer.addChild(this.hero.view);
    this.units.push(this.hero);

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
        abilities: [],
        portraitUrl: kind.portraitUrl,
      });
      this.unitsLayer.addChild(u.view);
      this.units.push(u);
    });
  }

  private refreshHeroMeta(): void {
    const reach = WEAPON_REACH[this.weapon];
    this.hud.setHeroMeta(
      this.hero,
      `${WEAPON_LABEL[this.weapon]} · дальность ${reach} · автоатака ${this.hero.stats.autoAttackCd.toFixed(1)}с`,
    );
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
  }

  selectHero(id: string | null): void {
    if (id !== this.hero.id) return;
    this.selectedAbility = null;
    this.clearAbilityTelegraph();
    this.refreshSkillBar(true);
    this.refreshHeroMeta();
    this.hud.setHint(this.idleHint());
  }

  setWeapon(kind: WeaponKind): void {
    this.weapon = kind;
    this.hero.stats.reach = WEAPON_REACH[kind];
    this.hero.stats.range = kind === "bow" || kind === "staff" ? "ranged" : "melee";
    this.hud.setWeapons(kind);
    this.refreshHeroMeta();
    const pref = this.livingEnemies().find((u) => u.id === this.hero.preferredTargetId);
    if (pref && this.distanceOf(pref.pos.row) > WEAPON_REACH[kind]) {
      this.hero.preferredTargetId = null;
      this.hud.showToast("Цель вышла из дальности оружия");
    }
    this.drawWeaponRange();
    if (!this.selectedAbility) this.hud.setHint(this.idleHint());
  }

  selectAbility(id: AbilityId): void {
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
    if (def.reach <= 0) {
      void this.performCast(def, this.hero, null);
      return;
    }
    this.selectedAbility = id;
    this.refreshSkillBar();
    this.hud.setHint(
      def.targetMode === "cone"
        ? `${def.name}: конус, радиус ${def.reach}. ЛКМ — клетка, ПКМ — отмена.`
        : `${def.name}: радиус ${def.reach}. ЛКМ — цель, ПКМ — отмена.`,
    );
    this.drawAbilityTelegraph(def);
  }

  private onCanvasPointer(ev: PointerEvent): void {
    const bounds = this.app.canvas.getBoundingClientRect();
    const localX = (ev.clientX - bounds.left - this.board.x) / this.board.scale.x;
    const localY = (ev.clientY - bounds.top - this.board.y) / this.board.scale.y;
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
    if (def.targetMode === "cone") {
      if (!this.coneCells(def.reach).some((c) => c.col === cell.col && c.row === cell.row)) {
        this.hud.showToast("Вне конуса");
        return;
      }
      void this.performCast(def, null, cell);
      return;
    }
    if (def.targetMode === "enemy_blast") {
      void this.performCast(def, this.unitAtCell(cell), cell);
      return;
    }
    this.hud.showToast("Нужна цель");
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
      if (def.targetMode === "cone") {
        const inside = this.coneCells(def.reach).some((c) => c.col === u.pos.col && c.row === u.pos.row);
        if (!inside) {
          this.hud.showToast("Вне конуса");
          return;
        }
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

  private coneCells(reach: number): GridPos[] {
    const cells: GridPos[] = [];
    const mid = (GRID_SIZE - 1) / 2;
    for (let row = 0; row < GRID_SIZE; row++) {
      const dist = this.distanceOf(row);
      if (dist > reach) continue;
      for (let col = 0; col < GRID_SIZE; col++) {
        if (Math.abs(col - mid) <= dist - 0.5) cells.push({ col, row });
      }
    }
    return cells;
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
    const cells = def.targetMode === "cone" ? this.coneCells(def.reach) : this.cellsInReach(def.reach);
    this.abilityGfx = this.vfx.highlightCells(
      cells.map((pos) => {
        const c = this.cellCenter(pos);
        return { x: c.x, y: c.y, size: CELL - 8 };
      }),
      SCHOOL_COLOR[def.school],
    );
    this.telegraphLayer.addChild(this.abilityGfx);
  }

  private clearAbilityTelegraph(): void {
    this.abilityGfx?.destroy();
    this.abilityGfx = null;
  }

  private async performCast(def: AbilityDef, clicked: Unit | null, cell: GridPos | null): Promise<void> {
    if (this.destroyed || this.paused) return;
    if (def.targetMode === "enemy" && (!clicked || clicked.team !== "enemy")) {
      this.hud.showToast("Нужна цель-враг");
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
    this.casting = true;
    this.gcdRemaining = ABILITY_GCD;
    this.pendingCast = null;
    this.selectedAbility = null;
    this.clearAbilityTelegraph();
    this.hero.abilityCd[def.id] = def.cooldown;
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
        if (!clicked) return;
        await this.vfx.iceArrow(from, clicked.center, () => {
          this.dealAbilityDamage(caster, clicked, def.damage);
          clicked.addStatus({ id: "slow", kind: "slow", remaining: 3, potency: 0.35 });
        });
        break;
      }
      case "ice_shield": {
        await this.vfx.iceShieldAura(caster.center.x, caster.center.y);
        caster.addStatus({ id: "shield", kind: "shield", remaining: 6, potency: 55 });
        this.vfx.floatingText(caster.center.x, caster.center.y - 20, "ЩИТ", 0x7ec8e8);
        break;
      }
      case "fireball": {
        const aim = clicked?.pos ?? cell;
        if (!aim) return;
        const primary = clicked ?? this.unitAtCell(aim);
        const cells = blastCells(aim);
        const to = this.cellCenter(aim);
        const centers = cells.map((p) => this.cellCenter(p));
        await this.vfx.fireball(from, to, centers, () => {
          for (const u of this.unitsOnCells(cells)) {
            this.dealAbilityDamage(caster, u, u.id === primary?.id ? def.damage : def.damage * 0.55);
          }
        });
        break;
      }
      case "flame_cone": {
        const cells = this.coneCells(def.reach);
        const centers = cells.map((p) => this.cellCenter(p));
        await this.vfx.flameCone(from, centers);
        for (const u of this.unitsOnCells(cells)) this.dealAbilityDamage(caster, u, def.damage);
        break;
      }
      case "stun_strike": {
        if (!clicked) return;
        const home = { ...from };
        await this.vfx.stunStrike(
          from,
          clicked.center,
          (t) => {
            caster.view.x = home.x + (clicked.center.x - home.x) * 0.2 * t;
            caster.view.y = home.y + (clicked.center.y - home.y) * 0.2 * t;
          },
          () => {
            this.dealAbilityDamage(caster, clicked, def.damage);
            clicked.addStatus({ id: "stun", kind: "stun", remaining: 2.2, potency: 1 });
            this.vfx.floatingText(clicked.center.x, clicked.center.y - 24, "ОГЛУШЕНИЕ", 0xc9b896);
          },
        );
        caster.view.position.set(home.x, home.y);
        break;
      }
      case "battle_cry": {
        await this.vfx.battleCry(from, [caster.center]);
        caster.addStatus({ id: "atk_buff", kind: "atk_buff", remaining: 5, potency: 0.35 });
        this.vfx.floatingText(caster.center.x, caster.center.y - 20, "СИЛА", 0xc9b896);
        break;
      }
      case "slash": {
        if (!clicked) return;
        await this.vfx.slash(clicked.center.x, clicked.center.y, () => {
          this.dealAbilityDamage(caster, clicked, def.damage);
          clicked.addStatus({ id: "bleed", kind: "bleed", remaining: 4, potency: 8 });
          this.vfx.floatingText(clicked.center.x, clicked.center.y - 20, "КРОВОТЕЧЕНИЕ", 0xc45a4a);
        });
        break;
      }
      case "shadow_strike": {
        if (!clicked) return;
        caster.setHidden(true);
        await this.vfx.shadowDash(from, clicked.center, () => {
          this.dealAbilityDamage(caster, clicked, def.damage);
        });
        caster.setHidden(false);
        caster.view.position.set(from.x, from.y);
        break;
      }
      default:
        break;
    }
  }

  private unitsOnCells(cells: GridPos[]): Unit[] {
    return this.units.filter(
      (u) => u.team === "enemy" && u.alive && cells.some((c) => c.col === u.pos.col && c.row === u.pos.row),
    );
  }

  private dealAbilityDamage(attacker: Unit, target: Unit, base: number): void {
    const dmg = Math.round(base * attacker.atkMultiplier());
    const { dealt } = target.applyDamage(dmg);
    target.flash(0xffffff);
    if (dealt > 0) this.vfx.floatingText(target.center.x, target.center.y - 10, `${dealt}`, 0xffe6a0);
    if (!target.alive) this.vfx.floatingText(target.center.x, target.center.y, "ПАЛ", 0xc45a4a);
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
    const dmg = Math.round(attacker.stats.atk * attacker.atkMultiplier());
    const { dealt } = target.applyDamage(dmg);
    if (dealt > 0) this.vfx.floatingText(target.center.x, target.center.y - 8, `${dealt}`, 0xe8e2d4);
  }

  private frontClear(): boolean {
    const living = this.livingEnemies();
    if (!living.length) return false;
    const onFront = living.some((u) => u.pos.row === GRID_SIZE - 1);
    const above = living.some((u) => u.pos.row < GRID_SIZE - 1);
    return !onFront && above;
  }

  private maybeStartDrop(): void {
    if (this.drop || !this.frontClear()) return;
    const movers = this.livingEnemies().filter((u) => u.pos.row < GRID_SIZE - 1);
    if (!movers.length) return;
    for (const u of this.units) {
      if (u.team === "enemy" && !u.alive) u.view.visible = false;
    }
    this.drop = {
      elapsed: 0,
      anim: movers.map((u) => ({
        u,
        x0: u.view.x,
        y0: u.view.y,
        to: this.cellCenter({ col: u.pos.col, row: u.pos.row + 1 }),
      })),
    };
  }

  private advanceDrop(dt: number): void {
    if (!this.drop) return;
    this.drop.elapsed += dt;
    const t = Math.min(1, this.drop.elapsed / DROP_SEC);
    const e = easeInOutQuad(t);
    for (const a of this.drop.anim) {
      if (!a.u.alive) continue;
      a.u.view.x = a.x0 + (a.to.x - a.x0) * e;
      a.u.view.y = a.y0 + (a.to.y - a.y0) * e;
    }
    if (t < 1) return;
    for (const a of this.drop.anim) {
      if (!a.u.alive) continue;
      a.u.pos = { col: a.u.pos.col, row: a.u.pos.row + 1 };
      a.u.view.position.set(a.to.x, a.to.y);
    }
    this.drop = null;
    this.maybeStartDrop();
  }

  private commitDrop(): void {
    if (!this.drop) return;
    for (const a of this.drop.anim) {
      if (!a.u.alive) continue;
      a.u.pos = { col: a.u.pos.col, row: a.u.pos.row + 1 };
    }
    this.drop = null;
  }

  private update(rawDt: number): void {
    const tweenDt = rawDt * this.timeScale;
    const combatDt = this.paused ? 0 : rawDt * this.timeScale;
    this.tweens.update(tweenDt);
    this.board.position.set(this.baseBoardX, this.baseBoardY);
    this.vfx.update(rawDt);
    this.drawMark();

    if (combatDt <= 0) return;
    this.advanceDrop(combatDt);
    this.gcdRemaining = Math.max(0, this.gcdRemaining - combatDt);

    for (const u of this.units) {
      if (!u.alive) continue;
      const needPreview = u.stats.autoAttackCd * u.autoCdMultiplier();
      if (u.team === "enemy") u.attackCharge = needPreview > 0 ? Math.min(1, u.autoTimer / needPreview) : 1;
      u.tickStatuses(combatDt);
      for (const key of Object.keys(u.abilityCd)) {
        u.abilityCd[key] = Math.max(0, (u.abilityCd[key] ?? 0) - combatDt);
      }
      if (u.hasStatus("stun")) continue;
      u.autoTimer += combatDt;
      const need = u.stats.autoAttackCd * u.autoCdMultiplier();
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
    this.refreshSkillBar();
  }

  private checkEnd(): void {
    if (this.paused && !this.hero.alive) return;
    const enemies = this.livingEnemies().length > 0;
    if (!enemies) {
      this.applyPause(true);
      this.hud.showToast("Победа!");
      this.hud.setHint("Враги повержены.");
    } else if (!this.hero.alive) {
      this.applyPause(true);
      this.hud.showToast("Поражение");
      this.hud.setHint("Айра пала.");
    }
  }
}
