"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { levelRng } from "@/lib/rng";
import { Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

type Mode = "number" | "color" | "spiral";
// [size, shuffle steps, mode]
const TABLE: [number, number, Mode][] = [
  [3, 10, "number"], [3, 16, "number"], [3, 22, "number"], [3, 30, "number"], [3, 40, "number"],
  [4, 24, "number"], [4, 36, "number"], [4, 50, "number"],
  [3, 30, "color"], [3, 44, "color"], [4, 40, "color"], [4, 60, "color"],
  [3, 40, "spiral"], [4, 50, "spiral"], [4, 80, "spiral"],
];

function spiralOrder(n: number): number[] {
  const out: number[] = [];
  let top = 0, left = 0, bottom = n - 1, right = n - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) out.push(top * n + c);
    top++;
    for (let r = top; r <= bottom; r++) out.push(r * n + right);
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) out.push(bottom * n + c);
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) out.push(r * n + left);
      left++;
    }
  }
  return out;
}

function makeTarget(n: number, mode: Mode): number[] {
  const t = new Array<number>(n * n).fill(0);
  const order = mode === "spiral" ? spiralOrder(n) : Array.from({ length: n * n }, (_, i) => i);
  order.forEach((pos, k) => {
    t[pos] = k === n * n - 1 ? 0 : k + 1;
  });
  return t;
}

function generate(level: number) {
  const [n, steps, mode] = TABLE[level - 1] ?? TABLE[TABLE.length - 1];
  const target = makeTarget(n, mode);
  for (let salt = 0; salt < 20; salt++) {
    const rng = levelRng("slide-puzzle", level, salt);
    const board = target.slice();
    let blank = board.indexOf(0);
    let prev = -1;
    for (let s = 0; s < steps; s++) {
      const r = Math.floor(blank / n);
      const c = blank % n;
      const opts: number[] = [];
      if (r > 0) opts.push(blank - n);
      if (r < n - 1) opts.push(blank + n);
      if (c > 0) opts.push(blank - 1);
      if (c < n - 1) opts.push(blank + 1);
      const choices = opts.filter((o) => o !== prev);
      const next = choices[Math.floor(rng() * choices.length)];
      board[blank] = board[next];
      board[next] = 0;
      prev = blank;
      blank = next;
    }
    if (board.some((v, i) => v !== target[i])) return { n, mode, target, board, par: steps };
  }
  throw new Error("Could not generate slide puzzle");
}

function tileColor(goalPos: number, n: number) {
  const r = Math.floor(goalPos / n);
  const c = goalPos % n;
  const hue = 190 + (c / (n - 1)) * 150 + r * 6;
  const light = 66 - (r / (n - 1)) * 30;
  return `hsl(${hue} 85% ${light}%)`;
}

export default function SlidePuzzle({ level, onWin }: GameProps) {
  const init = useMemo(() => generate(level), [level]);
  const { n, mode, target, par } = init;
  const [board, setBoard] = useState(() => init.board.slice());
  const [moves, setMoves] = useState(0);
  const doneRef = useRef(false);

  const goalPos = useMemo(() => {
    const g: Record<number, number> = {};
    target.forEach((t, i) => (g[t] = i));
    return g;
  }, [target]);

  const moveTo = useCallback(
    (p: number) => {
      if (doneRef.current) return;
      let b = board.indexOf(0);
      if (p === b || p < 0 || p >= n * n) return;
      const sameRow = Math.floor(p / n) === Math.floor(b / n);
      const sameCol = p % n === b % n;
      if (!sameRow && !sameCol) return;
      const step = sameRow ? (p > b ? 1 : -1) : p > b ? n : -n;
      const next = board.slice();
      let count = 0;
      while (b !== p) {
        next[b] = next[b + step];
        next[b + step] = 0;
        b += step;
        count++;
      }
      const total = moves + count;
      setBoard(next);
      setMoves(total);
      if (next.every((v, i) => v === target[i])) {
        doneRef.current = true;
        const stars = total <= par * 1.5 ? 3 : total <= par * 3 ? 2 : 1;
        window.setTimeout(() => onWin(stars), 450);
      }
    },
    [board, moves, n, target, par, onWin],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const b = board.indexOf(0);
      const r = Math.floor(b / n);
      const c = b % n;
      let p = -1;
      if (e.key === "ArrowUp" && r < n - 1) p = b + n;
      else if (e.key === "ArrowDown" && r > 0) p = b - n;
      else if (e.key === "ArrowLeft" && c < n - 1) p = b + 1;
      else if (e.key === "ArrowRight" && c > 0) p = b - 1;
      if (p >= 0) {
        e.preventDefault();
        moveTo(p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [board, n, moveTo]);

  const cell = 100 / n;
  const correct = board.filter((v, i) => v !== 0 && v === target[i]).length;

  return (
    <div className="flex flex-col items-center">
      <Hud>
        <Stat label="Moves" value={moves} />
        <Stat label="Target" value={`≤ ${Math.floor(par * 1.5)}`} tone={moves > par * 1.5 ? "warn" : "good"} />
        <Stat label="In place" value={`${correct}/${n * n - 1}`} />
      </Hud>

      <div className="flex w-full flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-center">
        <div className="relative aspect-square w-full max-w-[420px] rounded-3xl border border-white/10 bg-slate-950/60 p-2">
          <div className="relative h-full w-full">
            {board.map((tile, pos) =>
              tile === 0 ? null : (
                <button
                  key={tile}
                  type="button"
                  onClick={() => moveTo(pos)}
                  aria-label={mode === "color" ? `Tile` : `Tile ${tile}`}
                  className="absolute p-1 transition-all duration-150 ease-out"
                  style={{
                    left: `${(pos % n) * cell}%`,
                    top: `${Math.floor(pos / n) * cell}%`,
                    width: `${cell}%`,
                    height: `${cell}%`,
                  }}
                >
                  <span
                    className={`flex h-full w-full items-center justify-center rounded-2xl border text-2xl font-bold shadow-lg transition hover:brightness-110 sm:text-3xl ${
                      mode === "color"
                        ? "border-white/20 text-transparent"
                        : target[pos] === tile
                          ? "border-violet-300/60 bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white"
                          : "border-white/15 bg-gradient-to-br from-slate-600 to-slate-800 text-slate-100"
                    }`}
                    style={mode === "color" ? { background: tileColor(goalPos[tile], n) } : undefined}
                  >
                    {mode === "color" ? "" : tile}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-400">Target</span>
          <div
            className="grid w-28 gap-1 rounded-xl border border-white/10 bg-slate-950/60 p-1.5"
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
          >
            {target.map((t, i) => (
              <span
                key={i}
                className={`flex aspect-square items-center justify-center rounded-md text-[10px] font-bold ${t === 0 ? "bg-transparent" : mode === "color" ? "" : "bg-violet-500/70 text-white"}`}
                style={mode === "color" && t !== 0 ? { background: tileColor(i, n) } : undefined}
              >
                {mode === "color" || t === 0 ? "" : t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
