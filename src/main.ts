import "./style.css";
import { Application } from "pixi.js";
import { preloadBackgrounds } from "./art/backgrounds";
import { preloadPortraits } from "./art/portraits";
import { GameApp } from "./app/GameApp";
import { createBattleHud } from "./ui/BattleHud";
import type { AbilityId } from "./types";

async function boot(): Promise<void> {
  const mount = document.getElementById("game-root");
  if (!mount) throw new Error("game-root not found");

  await Promise.all([
    document.fonts.load("500 16px \"Exo 2\""),
    document.fonts.load("600 16px \"Exo 2\""),
    document.fonts.load("700 16px \"Exo 2\""),
    document.fonts.load("800 16px \"Exo 2\""),
  ]);

  const app = new Application();
  await app.init({
    resizeTo: mount,
    background: "#0c0f0c",
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  mount.appendChild(app.canvas);
  app.canvas.style.width = "100%";
  app.canvas.style.height = "100%";

  let game!: GameApp;
  const hud = createBattleHud((abilityId: AbilityId) => game.selectAbility(abilityId));
  game = new GameApp(app, hud);
  // Меню сразу: портреты/фоны боя греем в фоне, они не нужны title screen
  game.start();
  void Promise.all([preloadPortraits(), preloadBackgrounds()]).catch((err) => {
    console.warn("preload assets:", err);
  });
}

boot().catch((err) => {
  console.error(err);
  const hint = document.getElementById("hint");
  if (hint) hint.textContent = `Ошибка запуска: ${String(err)}`;
});
