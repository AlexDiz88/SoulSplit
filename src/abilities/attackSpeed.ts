/**
 * Круглый % снижения скорости атаки → slowPotency для боя.
 * Интервал ×(1+p); скорость = 1/интервал. Пример: 0.25 (-25%) → p = 1/3.
 */
export function attackSpeedReduceToSlowPotency(reduceFraction: number): number {
  if (reduceFraction <= 0) return 0;
  if (reduceFraction >= 1) return Number.POSITIVE_INFINITY;
  return reduceFraction / (1 - reduceFraction);
}

/**
 * Круглый % повышения скорости атаки → hasteIntervalMult.
 * Пример: 0.25 (+25%) → интервал ×0.8.
 */
export function attackSpeedIncreaseToHasteMult(increaseFraction: number): number {
  if (increaseFraction <= -1) return Number.POSITIVE_INFINITY;
  return 1 / (1 + increaseFraction);
}
