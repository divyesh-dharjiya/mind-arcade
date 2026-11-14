export interface GameProps {
  level: number;
  /** Call once when the level is cleared. stars: 1–3 */
  onWin: (stars: number) => void;
  /** Call once when the level is failed. */
  onLose: (reason: string) => void;
}

export function clampStars(n: number): number {
  return Math.max(1, Math.min(3, Math.round(n)));
}
