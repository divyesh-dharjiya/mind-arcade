export interface ResultStat {
  label: string;
  value: string;
}

export interface GameProps {
  level: number;
  /** True while the pause menu is open: stop timers and loops. */
  paused: boolean;
  /** Call once when the level is cleared. stars: 1–3 */
  onWin: (stars: number, stats?: ResultStat[]) => void;
  /** Call once when the level is failed. */
  onLose: (reason: string) => void;
}

export function clampStars(n: number): number {
  return Math.max(1, Math.min(3, Math.round(n)));
}
