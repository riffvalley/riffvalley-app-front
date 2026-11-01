export function createReconnectDelay(attempt: number, random = Math.random): number {
  const base = Math.min(30_000, 500 * 2 ** Math.min(attempt, 6));
  return Math.round(base * (0.75 + random() * 0.5));
}
