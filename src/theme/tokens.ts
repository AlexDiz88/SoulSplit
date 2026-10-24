/**
 * Тема UI Soul Split (eclipse / ghost-violet из main_menu).
 * CSS-переменные в theme.css зеркалят эти значения.
 */
export const THEME = {
  ink: "#0a0c14",
  slate: "#1a1d2c",
  stone: "#2a2e42",
  mist: "#d8d4f0",
  corona: "#f0ecff",
  violet: "#a898e8",
  violetDeep: "#6a5aab",
  pool: "#b8d0e8",
  danger: "#d07070",
  dangerDeep: "#a84848",

  border: "rgba(170, 165, 210, 0.38)",
  borderHover: "rgba(210, 200, 255, 0.72)",
  borderPrimary: "rgba(190, 180, 245, 0.5)",
  borderDanger: "rgba(196, 90, 90, 0.55)",

  glowSoft: "rgba(160, 145, 230, 0.35)",
  glowStrong: "rgba(180, 165, 255, 0.5)",
  glowCorona: "rgba(200, 185, 255, 0.85)",

  panel: "rgba(22, 24, 38, 0.9)",
  panelSolid: "rgba(18, 20, 32, 0.96)",
  overlay: "rgba(4, 5, 12, 0.72)",

  btnFace: "linear-gradient(180deg, rgba(72, 76, 102, 0.55) 0%, rgba(28, 30, 46, 0.82) 48%, rgba(14, 16, 26, 0.92) 100%)",
  btnFaceHover:
    "linear-gradient(180deg, rgba(88, 90, 120, 0.62) 0%, rgba(36, 38, 58, 0.88) 48%, rgba(16, 18, 30, 0.95) 100%)",
  btnPrimary:
    "linear-gradient(180deg, rgba(90, 82, 130, 0.7) 0%, rgba(40, 36, 68, 0.88) 45%, rgba(16, 14, 28, 0.95) 100%)",
  btnDanger:
    "linear-gradient(180deg, rgba(90, 42, 48, 0.55) 0%, rgba(40, 18, 24, 0.88) 48%, rgba(18, 10, 14, 0.95) 100%)",

  screenWash:
    "radial-gradient(ellipse 70% 45% at 50% 8%, rgba(200, 190, 255, 0.14), transparent 58%), radial-gradient(ellipse 55% 40% at 50% 88%, rgba(40, 50, 80, 0.4), transparent 65%), linear-gradient(180deg, rgba(6, 8, 14, 0.55), rgba(8, 10, 18, 0.88))",
} as const;

export type ThemeTokens = typeof THEME;

/** CSS custom property names (без `--`). */
export const THEME_CSS_VARS = {
  ink: "--theme-ink",
  slate: "--theme-slate",
  stone: "--theme-stone",
  mist: "--theme-mist",
  corona: "--theme-corona",
  violet: "--theme-violet",
  violetDeep: "--theme-violet-deep",
  pool: "--theme-pool",
  danger: "--theme-danger",
  border: "--theme-border",
  borderHover: "--theme-border-hover",
  glowSoft: "--theme-glow-soft",
  glowStrong: "--theme-glow-strong",
  panel: "--theme-panel",
} as const;
