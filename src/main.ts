import "./style.css";
import { Application } from "pixi.js";
import { preloadPortraits } from "./art/portraits";
import { HordeBattle } from "./combat/HordeBattle";
import { createBattleHud } from "./ui/BattleHud";
import type { AbilityId, WeaponKind } from "./types";

async function boot(): Promise<void> {
  const mount = document.getElementById("game-root");
  if (!mount) throw new Error("game-root not found");

  const app = new Application();
  await app.init({
    resizeTo: window,
    background: "#0c0f0c",
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  mount.appendChild(app.canvas);

  await preloadPortraits();

  let battle!: HordeBattle;
  const hud = createBattleHud(
    (abilityId: AbilityId) => battle.selectAbility(abilityId),
    (weapon: WeaponKind) => battle.setWeapon(weapon),
  );
  battle = new HordeBattle(app, hud);
}

boot().catch((err) => {
  console.error(err);
  const hint = document.getElementById("hint");
  if (hint) hint.textContent = `Ошибка запуска: ${String(err)}`;
});
