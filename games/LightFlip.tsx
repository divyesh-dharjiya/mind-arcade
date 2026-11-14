"use client";

import { animate, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { levelRng, shuffle } from "@/lib/rng";
import { sfx } from "@/lib/sfx";
import { burstAt } from "@/lib/fx";
import { GameButton, Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

const PLUS: [number, number][] = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
const CROSS: [number, number][] = [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// [size, presses]
const TABLE: [number, number][] = [
  [3, 2], [3, 3], [4, 3], [4, 4], [4, 5], [5, 5], [5, 6], [5, 7],
  [4, 3], [4, 4], [4, 5], [5, 5], [5, 6], [5, 7], [6, 7], [6, 8],
  [3, 2], [3, 3], [4, 3], [4, 4], [4, 5], [5, 5], [5, 6], [6, 6],
];

export function params(level: number) {
  const [n, presses] = TABLE[level - 1] ?? [6, 8];
  const pattern = level >= 9 && level < 17 ? CROSS : PLUS;
  const states = level >= 17 ? 3 : 2;
  return { n, presses, pattern, states };
}

function applyPress(grid: number[], n: number, idx: number, pattern: [number, number][], states: number, dir: 1 | -1) {
  const r = Math.floor(idx / n);
  const c = idx % n;
  const hit: number[] = [];
  for (const [dr, dc] of pattern) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
    const i = rr * n + cc;
    grid[i] = (grid[i] + dir + states) % states;
    hit.push(i);
  }
  return hit;
}

export function generate(level: number) {
  const { n, presses, pattern, states } = params(level);
  for (let salt = 0; salt < 60; salt++) {
    const rng = levelRng("light-flip", level, salt);
    const cells = shuffle(rng, Array.from({ length: n * n }, (_, i) => i)).slice(0, presses);
    const grid = new Array<number>(n * n).fill(0);
    for (const i of cells) applyPress(grid, n, i, pattern, states, -1);
    if (grid.filter((v) => v !== 0).length >= Math.min(3, presses)) {
      const need = new Array<number>(n * n).fill(0);
      for (const i of cells) need[i] = 1;
      return { grid, need, par: presses };
    }
  }
  throw new Error("Could not generate Light Flip level");
}

const GLOW = [
  null,
  { core: "#fff7c2", mid: "#fde047", edge: "#f59e0b", halo: "rgba(250,204,21,0.65)" },
  { core: "#e0f2fe", mid: "#38bdf8", edge: "#2563eb", halo: "rgba(56,189,248,0.65)" },
] as const;
const GLOW_TRI = [
  null,
  { core: "#e0f2fe", mid: "#38bdf8", edge: "#2563eb", halo: "rgba(56,189,248,0.65)" },
  { core: "#fce7f3", mid: "#f472b6", edge: "#c026d3", halo: "rgba(236,72,153,0.65)" },
] as const;

function Lamp({ value, states, pulse, delay, hint, onPress }: { value: number; states: number; pulse: number; delay: number; hint: boolean; onPress: () => void }) {
  const bulb = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!pulse || !bulb.current) return;
    void animate(bulb.current, { scale: [1, 0.72, 1.14, 1] }, { duration: 0.42, delay, ease: "easeOut" });
  }, [pulse, delay]);
  const g = (states === 3 ? GLOW_TRI : GLOW)[value];
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={value ? "Lamp on" : "Lamp off"}
      className="group relative aspect-square rounded-2xl transition-transform active:scale-95"
      style={{
        background: "linear-gradient(160deg, #2b3256, #151a33)",
        boxShadow: "inset 0 2px 0 rgba(255,255,255,0.1), inset 0 -4px 0 rgba(0,0,0,0.35), 0 5px 0 #0a0d20, 0 10px 18px -8px rgba(0,0,0,0.7)",
      }}
    >
      <span
        className="absolute inset-[16%] rounded-full transition-[box-shadow] duration-300"
        style={{ boxShadow: g ? `0 0 32px 8px ${g.halo}, 0 0 70px 6px ${g.halo}` : "inset 0 3px 8px rgba(0,0,0,0.7)" }}
      />
      <span
        ref={bulb}
        className="absolute inset-[16%] rounded-full transition-[background] duration-200"
        style={{
          background: g
            ? `radial-gradient(circle at 38% 32%, ${g.core} 0 18%, ${g.mid} 45%, ${g.edge} 100%)`
            : "radial-gradient(circle at 38% 32%, #4b5576 0 12%, #2a304e 55%, #1b2038 100%)",
        }}
      >
        <span className="absolute left-[22%] top-[16%] h-[22%] w-[30%] rotate-[-25deg] rounded-full bg-white/50 blur-[1px]" />
      </span>
      {hint && <span className="absolute inset-0 animate-pulse rounded-2xl ring-4 ring-emerald-400" />}
    </button>
  );
}

export default function LightFlip({ level, onWin }: GameProps) {
  const { n, pattern, states } = params(level);
  const init = useMemo(() => generate(level), [level]);
  const [grid, setGrid] = useState(() => init.grid.slice());
  const [need, setNeed] = useState(() => init.need.slice());
  const [moves, setMoves] = useState(0);
  const [hint, setHint] = useState<number | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [pulse, setPulse] = useState<{ cells: number[]; origin: number; k: number }>({ cells: [], origin: -1, k: 0 });
  const doneRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const par = init.par;

  function press(i: number) {
    if (doneRef.current) return;
    const g = grid.slice();
    const hit = applyPress(g, n, i, pattern, states, 1);
    const nd = need.slice();
    nd[i] = (nd[i] - 1 + states) % states;
    setGrid(g);
    setNeed(nd);
    setHint(null);
    setPulse((p) => ({ cells: hit, origin: i, k: p.k + 1 }));
    const lit = g.filter((v) => v !== 0).length;
    sfx.click(lit % 12);
    sfx.pop(12 - Math.min(12, lit));
    const m = moves + 1;
    setMoves(m);
    if (lit === 0) {
      doneRef.current = true;
      sfx.clear();
      window.setTimeout(() => burstAt(boardRef.current, { colors: ["#fde047", "#fff", "#f59e0b"], count: 40, speed: 380, kind: "star" }), 200);
      let stars = m <= par ? 3 : m <= par + Math.ceil(par * 0.6) + 1 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      window.setTimeout(
        () =>
          onWin(stars, [
            { label: "Moves", value: String(m) },
            { label: "Par", value: String(par) },
            { label: "Hint used", value: usedHint ? "Yes" : "No" },
          ]),
        700,
      );
    }
  }

  function showHint() {
    const i = need.findIndex((v) => v > 0);
    if (i >= 0) {
      setHint(i);
      setUsedHint(true);
    }
  }

  const lit = grid.filter((v) => v !== 0).length;
  const set = new Set(pattern.map(([r, c]) => `${r},${c}`));

  return (
    <div className="flex w-full flex-col items-center">
      <Hud>
        <Stat icon="moves" label="Moves" value={moves} />
        <Stat icon="target" label="Par" value={par} tone={moves > par ? "warn" : "good"} />
        <Stat icon="hint" label="Lit" value={lit} />
        <GameButton onClick={showHint} icon="hint" disabled={usedHint && hint !== null}>
          Hint{usedHint ? "" : " · 2★ max"}
        </GameButton>
      </Hud>

      <div className="panel mb-4 flex items-center gap-3 rounded-2xl px-4 py-2 text-xs font-semibold text-white/60">
        <span>Each tap flips</span>
        <span className="grid grid-cols-3 gap-[3px]">
          {[-1, 0, 1].flatMap((r) =>
            [-1, 0, 1].map((c) => (
              <motion.i
                key={`${r},${c}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: (Math.abs(r) + Math.abs(c)) * 0.08 }}
                className={`block h-3 w-3 rounded-[4px] ${set.has(`${r},${c}`) ? (r === 0 && c === 0 ? "bg-white" : states === 3 ? "bg-sky-400" : "bg-yellow-400") : "bg-white/10"}`}
              />
            )),
          )}
        </span>
        {states === 3 && (
          <span className="flex items-center gap-1">
            Off → <i className="inline-block h-3 w-3 rounded-full bg-sky-400" /> → <i className="inline-block h-3 w-3 rounded-full bg-pink-400" /> → Off
          </span>
        )}
      </div>

      <div ref={boardRef} className="board w-full max-w-[min(92vw,470px)] p-3 sm:p-4">
        <div className="grid gap-2.5 sm:gap-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {grid.map((v, i) => {
            const inPulse = pulse.cells.includes(i);
            const dist = inPulse ? Math.abs(Math.floor(i / n) - Math.floor(pulse.origin / n)) + Math.abs((i % n) - (pulse.origin % n)) : 0;
            return (
              <Lamp
                key={i}
                value={v}
                states={states}
                pulse={inPulse ? pulse.k : 0}
                delay={dist * 0.06}
                hint={hint === i}
                onPress={() => press(i)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
