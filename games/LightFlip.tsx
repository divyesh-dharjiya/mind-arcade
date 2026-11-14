"use client";

import { useMemo, useRef, useState } from "react";
import { levelRng, shuffle } from "@/lib/rng";
import { GameButton, Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

const PLUS: [number, number][] = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const CROSS: [number, number][] = [
  [0, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

// [size, presses] per level
const TABLE: [number, number][] = [
  [3, 2], [3, 3], [3, 4], [4, 3], [4, 4], [4, 5], [5, 5], // classic 1–7
  [3, 3], [4, 3], [4, 4], [4, 5], [5, 5], [5, 6], // diagonal 8–13
  [3, 2], [3, 3], [4, 3], [4, 4], [4, 5], [5, 5], [5, 6], // three colours 14–20
];

function params(level: number) {
  const [n, presses] = TABLE[level - 1] ?? [5, 6];
  const pattern = level >= 8 && level < 14 ? CROSS : PLUS;
  const states = level >= 14 ? 3 : 2;
  return { n, presses, pattern, states };
}

function applyPress(grid: number[], n: number, idx: number, pattern: [number, number][], states: number, dir: 1 | -1) {
  const r = Math.floor(idx / n);
  const c = idx % n;
  for (const [dr, dc] of pattern) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
    const i = rr * n + cc;
    grid[i] = (grid[i] + dir + states) % states;
  }
}

function generate(level: number) {
  const { n, presses, pattern, states } = params(level);
  for (let salt = 0; salt < 50; salt++) {
    const rng = levelRng("light-flip", level, salt);
    const cells = shuffle(
      rng,
      Array.from({ length: n * n }, (_, i) => i),
    ).slice(0, presses);
    const grid = new Array<number>(n * n).fill(0);
    // Un-press each chosen cell, so pressing each once solves the board.
    for (const i of cells) applyPress(grid, n, i, pattern, states, -1);
    if (grid.some((v) => v !== 0)) {
      const need = new Array<number>(n * n).fill(0);
      for (const i of cells) need[i] = 1;
      return { grid, need, par: presses };
    }
  }
  throw new Error("Could not generate Light Flip level");
}

const COLORS = [
  "bg-slate-800/80 border-white/5",
  "bg-gradient-to-br from-yellow-300 to-amber-500 border-yellow-200 shadow-[0_0_24px_rgba(250,204,21,0.55)]",
];
const TRI_COLORS = [
  "bg-slate-800/80 border-white/5",
  "bg-gradient-to-br from-sky-300 to-blue-500 border-sky-200 shadow-[0_0_24px_rgba(56,189,248,0.55)]",
  "bg-gradient-to-br from-pink-300 to-fuchsia-500 border-pink-200 shadow-[0_0_24px_rgba(236,72,153,0.55)]",
];

export default function LightFlip({ level, onWin }: GameProps) {
  const { n, pattern, states } = params(level);
  const initial = useMemo(() => generate(level), [level]);
  const [grid, setGrid] = useState(() => initial.grid.slice());
  const [need, setNeed] = useState(() => initial.need.slice());
  const [moves, setMoves] = useState(0);
  const [hint, setHint] = useState<number | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [lastTap, setLastTap] = useState<{ i: number; k: number } | null>(null);
  const doneRef = useRef(false);
  const tick = useRef(0);
  const par = initial.par;

  function press(i: number) {
    if (doneRef.current) return;
    const g = grid.slice();
    applyPress(g, n, i, pattern, states, 1);
    const nd = need.slice();
    nd[i] = (nd[i] - 1 + states) % states;
    setGrid(g);
    setNeed(nd);
    setHint(null);
    setLastTap({ i, k: ++tick.current });
    const m = moves + 1;
    setMoves(m);
    if (g.every((v) => v === 0)) {
      doneRef.current = true;
      let stars = m <= par ? 3 : m <= par + Math.ceil(par * 0.6) + 1 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      window.setTimeout(() => onWin(stars), 500);
    }
  }

  function showHint() {
    const i = need.findIndex((v) => v > 0);
    if (i >= 0) {
      setHint(i);
      setUsedHint(true);
    }
  }

  const palette = states === 3 ? TRI_COLORS : COLORS;
  const lit = grid.filter((v) => v !== 0).length;

  return (
    <div className="flex flex-col items-center">
      <Hud>
        <Stat label="Moves" value={moves} />
        <Stat label="Par" value={par} tone={moves > par ? "warn" : "good"} />
        <Stat label="Lit" value={lit} />
        <GameButton onClick={showHint}>Hint{usedHint ? "" : " (max 2★)"}</GameButton>
      </Hud>

      <div className="mb-4 flex items-center gap-3 text-xs text-slate-400">
        <span>Tap pattern:</span>
        <PatternPreview pattern={pattern} />
        {states === 3 && (
          <span className="flex items-center gap-1">
            Off <span className="text-slate-500">→</span>
            <i className="inline-block h-3 w-3 rounded-sm bg-sky-400" />
            <span className="text-slate-500">→</span>
            <i className="inline-block h-3 w-3 rounded-sm bg-pink-400" />
            <span className="text-slate-500">→</span> Off
          </span>
        )}
      </div>

      <div
        className="grid w-full max-w-[440px] gap-2 rounded-3xl border border-white/10 bg-slate-950/60 p-3 sm:gap-3 sm:p-4"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {grid.map((v, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Tile ${i + 1}, ${v === 0 ? "off" : "on"}`}
            onClick={() => press(i)}
            className={`relative aspect-square rounded-2xl border transition-all duration-200 hover:brightness-110 active:scale-95 ${palette[v]}`}
          >
            {lastTap?.i === i && <span key={lastTap.k} className="absolute inset-0 animate-pop rounded-2xl ring-2 ring-white/60" />}
            {hint === i && <span className="absolute inset-0 animate-pulse rounded-2xl ring-4 ring-emerald-400" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function PatternPreview({ pattern }: { pattern: [number, number][] }) {
  const set = new Set(pattern.map(([r, c]) => `${r},${c}`));
  return (
    <span className="grid grid-cols-3 gap-[2px]">
      {[-1, 0, 1].flatMap((r) =>
        [-1, 0, 1].map((c) => (
          <i
            key={`${r},${c}`}
            className={`block h-2.5 w-2.5 rounded-[3px] ${set.has(`${r},${c}`) ? (r === 0 && c === 0 ? "bg-white" : "bg-yellow-400") : "bg-slate-700"}`}
          />
        )),
      )}
    </span>
  );
}
