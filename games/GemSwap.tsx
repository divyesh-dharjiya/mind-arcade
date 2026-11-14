"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { levelRng, shuffle, type Rng } from "@/lib/rng";
import { sfx } from "@/lib/sfx";
import { burst, floatText, shake } from "@/lib/fx";
import { GoalBar, Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

type Special = "none" | "row" | "col" | "nova";
interface Gem {
  id: number;
  t: number;
  sp: Special;
  from?: number; // spawn row (negative = above the board)
}
type Grid = (Gem | null)[];

const COLORS = ["#f43f5e", "#fb923c", "#facc15", "#22c55e", "#3b82f6", "#a855f7"];
const LIGHT = ["#fecdd3", "#fed7aa", "#fef9c3", "#bbf7d0", "#bfdbfe", "#e9d5ff"];
const DARK = ["#9f1239", "#c2410c", "#a16207", "#15803d", "#1d4ed8", "#7e22ce"];

type Goal = { kind: "score"; target: number } | { kind: "orders"; orders: [number, number][] } | { kind: "ice"; count: number; double: number };
// [size, types, moves, goal]
const TABLE: [number, number, number, Goal][] = [
  [7, 5, 20, { kind: "score", target: 1500 }],
  [7, 5, 20, { kind: "score", target: 2200 }],
  [8, 5, 22, { kind: "score", target: 3000 }],
  [8, 6, 22, { kind: "score", target: 3200 }],
  [8, 6, 22, { kind: "score", target: 4000 }],
  [8, 6, 20, { kind: "score", target: 4500 }],
  [8, 6, 20, { kind: "score", target: 5000 }],
  [8, 6, 18, { kind: "score", target: 5200 }],
  [8, 6, 18, { kind: "score", target: 6000 }],
  [8, 6, 20, { kind: "orders", orders: [[0, 14], [4, 14]] }],
  [8, 6, 20, { kind: "orders", orders: [[1, 12], [3, 12], [5, 12]] }],
  [8, 6, 18, { kind: "orders", orders: [[2, 18], [4, 18]] }],
  [8, 6, 18, { kind: "orders", orders: [[0, 14], [3, 14], [5, 14]] }],
  [8, 6, 17, { kind: "orders", orders: [[1, 16], [2, 16], [4, 16]] }],
  [8, 6, 16, { kind: "orders", orders: [[0, 16], [3, 16], [5, 16]] }],
  [8, 6, 22, { kind: "ice", count: 10, double: 0 }],
  [8, 6, 22, { kind: "ice", count: 14, double: 0 }],
  [8, 6, 22, { kind: "ice", count: 18, double: 0 }],
  [8, 6, 24, { kind: "ice", count: 20, double: 4 }],
  [8, 6, 24, { kind: "ice", count: 24, double: 6 }],
  [8, 6, 24, { kind: "ice", count: 26, double: 8 }],
  [8, 6, 25, { kind: "ice", count: 30, double: 10 }],
  [8, 6, 25, { kind: "ice", count: 34, double: 12 }],
  [8, 6, 26, { kind: "ice", count: 38, double: 14 }],
];

function runs(g: Grid, n: number) {
  const out: { cells: number[]; dir: "h" | "v" }[] = [];
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      const t = g[r * n + c]?.t;
      let e = c + 1;
      while (t !== undefined && e < n && g[r * n + e]?.t === t) e++;
      if (t !== undefined && e - c >= 3) out.push({ cells: Array.from({ length: e - c }, (_, k) => r * n + c + k), dir: "h" });
      c = e;
    }
  }
  for (let c = 0; c < n; c++) {
    let r = 0;
    while (r < n) {
      const t = g[r * n + c]?.t;
      let e = r + 1;
      while (t !== undefined && e < n && g[e * n + c]?.t === t) e++;
      if (t !== undefined && e - r >= 3) out.push({ cells: Array.from({ length: e - r }, (_, k) => (r + k) * n + c), dir: "v" });
      r = e;
    }
  }
  return out;
}

function findMove(g: Grid, n: number): [number, number] | null {
  for (let i = 0; i < n * n; i++)
    for (const j of [i + 1, i + n]) {
      if (j >= n * n || (j === i + 1 && j % n === 0)) continue;
      const h = g.slice();
      [h[i], h[j]] = [h[j], h[i]];
      if (runs(h, n).length) return [i, j];
    }
  return null;
}

function makeRefill(level: number, types: number) {
  const rng: Rng = levelRng("gem-swap-refill", level);
  let id = 0;
  return {
    gem: (t?: number, from?: number): Gem => ({ id: id++, t: t ?? Math.floor(rng() * types), sp: "none", from }),
    rnd: () => rng(),
  };
}

export function setup(level: number) {
  const [n, types, moves, goal] = TABLE[level - 1] ?? TABLE[TABLE.length - 1];
  const rng = levelRng("gem-swap", level);
  let grid: Grid = [];
  for (let attempt = 0; attempt < 50; attempt++) {
    grid = new Array(n * n).fill(null);
    for (let i = 0; i < n * n; i++) {
      const r = Math.floor(i / n);
      const c = i % n;
      let t = 0;
      for (let k = 0; k < 20; k++) {
        t = Math.floor(rng() * types);
        const h = c >= 2 && grid[i - 1]?.t === t && grid[i - 2]?.t === t;
        const v = r >= 2 && grid[i - n]?.t === t && grid[i - 2 * n]?.t === t;
        if (!h && !v) break;
      }
      grid[i] = { id: 100000 + i, t, sp: "none" };
    }
    if (findMove(grid, n)) break;
  }
  const ice = new Array<number>(n * n).fill(0);
  if (goal.kind === "ice") {
    const cells = shuffle(rng, Array.from({ length: n * n }, (_, i) => i));
    cells.slice(0, goal.count).forEach((i, k) => (ice[i] = k < goal.double ? 2 : 1));
  }
  return { n, types, moves, goal, grid, ice };
}

function GemArt({ t, sp }: { t: number; sp: Special }) {
  const c = COLORS[t];
  const shapes = [
    <path key="0" d="M30 12h40l18 18v40L70 88H30L12 70V30z" />,
    <path key="1" d="M50 8l38 22v40L50 92 12 70V30z" />,
    <path key="2" d="M50 6l12 28 30 3-23 20 7 30-26-16-26 16 7-30L8 37l30-3z" />,
    <path key="3" d="M50 8l36 20-10 52H24L14 28z" />,
    <circle key="4" cx="50" cy="50" r="40" />,
    <path key="5" d="M50 6l40 44-40 44L10 50z" />,
  ];
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
      <defs>
        <radialGradient id={`gg${t}`} cx="35%" cy="28%" r="80%">
          <stop offset="0" stopColor={LIGHT[t]} />
          <stop offset="0.45" stopColor={c} />
          <stop offset="1" stopColor={DARK[t]} />
        </radialGradient>
      </defs>
      {sp === "nova" && <circle cx="50" cy="50" r="48" fill="none" stroke="#fff" strokeWidth="5" strokeDasharray="10 8" style={{ animation: "spin 2.4s linear infinite", transformOrigin: "50px 50px" }} />}
      <g fill={`url(#gg${t})`} stroke={DARK[t]} strokeWidth="3" style={{ filter: `drop-shadow(0 4px 0 ${DARK[t]}) drop-shadow(0 6px 6px rgba(0,0,0,0.45))` }}>
        {shapes[t]}
      </g>
      <path d="M30 26 L48 20 L42 40 Z" fill="#fff" opacity="0.7" />
      <circle cx="64" cy="66" r="5" fill="#fff" opacity="0.25" />
      {sp === "row" && <rect x="4" y="44" width="92" height="12" rx="6" fill="#fff" opacity="0.9" style={{ filter: "drop-shadow(0 0 6px #fff)" }} />}
      {sp === "col" && <rect x="44" y="4" width="12" height="92" rx="6" fill="#fff" opacity="0.9" style={{ filter: "drop-shadow(0 0 6px #fff)" }} />}
      {sp === "nova" && <circle cx="50" cy="50" r="12" fill="#fff" style={{ filter: "drop-shadow(0 0 8px #fff)" }} />}
    </svg>
  );
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export default function GemSwap({ level, paused, onWin, onLose }: GameProps) {
  const init = useMemo(() => setup(level), [level]);
  const { n, types, goal } = init;
  const [refill] = useState(() => makeRefill(level, types));
  const [grid, setGrid] = useState<Grid>(() => init.grid.slice());
  const [ice, setIce] = useState<number[]>(() => init.ice.slice());
  const [moves, setMoves] = useState(init.moves);
  const [score, setScore] = useState(0);
  const [collected, setCollected] = useState<number[]>(() => new Array(6).fill(0));
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [blasts, setBlasts] = useState<{ key: number; i: number; kind: Special }[]>([]);
  const busy = useRef(false);
  const doneRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const press = useRef<{ i: number; x: number; y: number; used: boolean } | null>(null);
  const idle = useRef(0);
  const blastKey = useRef(0);
  const specials = level >= 5;

  // idle hint
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => {
      idle.current += 1;
      if (idle.current === 6 && !busy.current && !doneRef.current) setHint(findMove(grid, n));
    }, 1000);
    return () => window.clearInterval(t);
  }, [grid, n, paused]);

  const cellCenter = (i: number): [number, number] | null => {
    const b = boardRef.current?.getBoundingClientRect();
    if (!b) return null;
    const cs = b.width / n;
    return [b.left + ((i % n) + 0.5) * cs, b.top + (Math.floor(i / n) + 0.5) * cs];
  };

  const goalProgress = (sc: number, col: number[], ic: number[]) => {
    if (goal.kind === "score") return sc >= goal.target;
    if (goal.kind === "orders") return goal.orders.every(([t, k]) => col[t] >= k);
    return ic.every((v) => v === 0);
  };

  async function resolve(start: Grid, swapCells: number[], movesLeft: number) {
    let g = start;
    let cascade = 0;
    let sc = score;
    const col = collected.slice();
    const ic = ice.slice();
    for (;;) {
      const found = runs(g, n);
      if (!found.length) break;
      cascade++;
      const clear = new Set<number>();
      const make = new Map<number, Gem>();
      const count = new Map<number, number>();
      found.forEach((rn) => rn.cells.forEach((i) => count.set(i, (count.get(i) ?? 0) + 1)));
      for (const rn of found) {
        rn.cells.forEach((i) => clear.add(i));
        if (!specials) continue;
        const inter = rn.cells.find((i) => (count.get(i) ?? 0) > 1);
        const pivot = inter ?? rn.cells.find((i) => swapCells.includes(i)) ?? rn.cells[Math.floor(rn.cells.length / 2)];
        const base = g[pivot]!;
        if (inter !== undefined || rn.cells.length >= 5) make.set(pivot, { ...refill.gem(base.t), sp: "nova" });
        else if (rn.cells.length === 4 && !make.has(pivot)) make.set(pivot, { ...refill.gem(base.t), sp: rn.dir === "h" ? "row" : "col" });
      }
      // chain specials
      const queue = [...clear].filter((i) => g[i] && g[i]!.sp !== "none");
      const fired = new Set<number>();
      const newBlasts: { key: number; i: number; kind: Special }[] = [];
      while (queue.length) {
        const i = queue.pop()!;
        if (fired.has(i)) continue;
        fired.add(i);
        const sp = g[i]!.sp;
        const r = Math.floor(i / n);
        const c = i % n;
        const add = (j: number) => {
          if (j < 0 || j >= n * n || !g[j] || make.has(j)) return;
          if (!clear.has(j)) {
            clear.add(j);
            if (g[j]!.sp !== "none") queue.push(j);
          }
        };
        if (sp === "row") for (let k = 0; k < n; k++) add(r * n + k);
        if (sp === "col") for (let k = 0; k < n; k++) add(k * n + c);
        if (sp === "nova") for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) if (r + dr >= 0 && r + dr < n && c + dc >= 0 && c + dc < n) add((r + dr) * n + (c + dc));
        newBlasts.push({ key: blastKey.current++, i, kind: sp });
      }
      make.forEach((_, i) => clear.delete(i));

      // effects
      if (newBlasts.length) {
        setBlasts(newBlasts);
        sfx.explode();
        shake(boardRef.current, 6);
        window.setTimeout(() => setBlasts([]), 500);
      }
      sfx.match(cascade + clear.size / 4);
      const gained = clear.size * 50 * cascade;
      sc += gained;
      const next = g.slice();
      let sumX = 0;
      let sumY = 0;
      clear.forEach((i) => {
        const gem = g[i]!;
        col[gem.t] += 1;
        if (ic[i] > 0) ic[i] -= 1;
        const p = cellCenter(i);
        if (p) {
          sumX += p[0];
          sumY += p[1];
          burst(p[0], p[1], { colors: [COLORS[gem.t], LIGHT[gem.t], "#fff"], count: 7, speed: 200, size: 4, ring: false });
        }
        next[i] = null;
      });
      make.forEach((gem, i) => (next[i] = gem));
      if (clear.size) floatText(sumX / clear.size, sumY / clear.size, cascade > 1 ? `+${gained} x${cascade}` : `+${gained}`, cascade > 1 ? "#fde047" : "#fff", cascade > 1 ? 30 : 24);
      if (cascade === 3) floatText(sumX / clear.size, sumY / clear.size - 40, "SWEET!", "#f9a8d4", 34);
      if (cascade === 5) floatText(sumX / clear.size, sumY / clear.size - 40, "DIVINE!", "#a5f3fc", 38);
      setGrid(next);
      setScore(sc);
      setCollected(col.slice());
      setIce(ic.slice());
      await wait(260);

      // gravity + refill
      const fallen: Grid = new Array(n * n).fill(null);
      for (let c = 0; c < n; c++) {
        let w = n - 1;
        for (let r = n - 1; r >= 0; r--) {
          const gem = next[r * n + c];
          if (gem) {
            fallen[w * n + c] = { ...gem, from: undefined };
            w--;
          }
        }
        const missing = w + 1;
        for (let r = w; r >= 0; r--) fallen[r * n + c] = refill.gem(undefined, r - missing);
      }
      g = fallen;
      setGrid(g);
      await wait(330);
      swapCells = [];
    }

    // outcome
    if (goalProgress(sc, col, ic)) {
      doneRef.current = true;
      sfx.clear();
      const b = boardRef.current?.getBoundingClientRect();
      if (b) burst(b.left + b.width / 2, b.top + b.height / 2, { colors: [...COLORS, "#fff"], count: 50, speed: 460, kind: "star" });
      const ratio = movesLeft / init.moves;
      const stars = ratio >= 0.3 ? 3 : ratio >= 0.12 ? 2 : 1;
      window.setTimeout(
        () =>
          onWin(stars, [
            { label: "Score", value: sc.toLocaleString() },
            { label: "Moves left", value: `${movesLeft}/${init.moves}` },
            { label: "Goal", value: goal.kind === "score" ? `${goal.target.toLocaleString()} pts` : goal.kind === "orders" ? "Orders filled" : "Ice cleared" },
          ]),
        900,
      );
      return;
    }
    if (movesLeft <= 0) {
      doneRef.current = true;
      window.setTimeout(() => onLose("Out of moves! Look for cascades and power gems to hit the goal faster."), 400);
      return;
    }
    if (!findMove(g, n)) {
      const b = boardRef.current?.getBoundingClientRect();
      if (b) floatText(b.left + b.width / 2, b.top + b.height / 2, "SHUFFLE!", "#fff", 36);
      let shuffled = g;
      for (let k = 0; k < 40; k++) {
        const pool = shuffle(refill.rnd, g);
        if (!runs(pool, n).length && findMove(pool, n)) {
          shuffled = pool;
          break;
        }
      }
      await wait(500);
      setGrid(shuffled);
      await wait(400);
    }
  }

  async function trySwap(a: number, b: number) {
    if (busy.current || doneRef.current || paused) return;
    const adj = (Math.abs(a - b) === 1 && Math.floor(a / n) === Math.floor(b / n)) || Math.abs(a - b) === n;
    if (!adj || !grid[a] || !grid[b]) return;
    busy.current = true;
    idle.current = 0;
    setHint(null);
    setSelected(null);
    const swapped = grid.slice();
    [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
    sfx.whoosh();
    setGrid(swapped);
    await wait(220);
    if (!runs(swapped, n).length) {
      sfx.error();
      setGrid(grid);
      await wait(240);
      busy.current = false;
      return;
    }
    const m = moves - 1;
    setMoves(m);
    await resolve(swapped, [a, b], m);
    busy.current = false;
  }

  const onDown = (i: number) => (e: RPointerEvent) => {
    if (paused) return;
    press.current = { i, x: e.clientX, y: e.clientY, used: false };
  };
  const onMove = (e: RPointerEvent) => {
    const p = press.current;
    if (!p || p.used) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    p.used = true;
    const c = p.i % n;
    let j = -1;
    if (Math.abs(dx) > Math.abs(dy)) j = dx > 0 ? (c < n - 1 ? p.i + 1 : -1) : c > 0 ? p.i - 1 : -1;
    else j = dy > 0 ? p.i + n : p.i - n;
    if (j >= 0 && j < n * n) void trySwap(p.i, j);
  };
  const onUp = (i: number) => () => {
    const p = press.current;
    press.current = null;
    if (!p || p.used || busy.current) return;
    if (selected === null) {
      sfx.select();
      setSelected(i);
    } else if (selected === i) setSelected(null);
    else {
      const s = selected;
      const adj = (Math.abs(s - i) === 1 && Math.floor(s / n) === Math.floor(i / n)) || Math.abs(s - i) === n;
      if (adj) void trySwap(s, i);
      else {
        sfx.select();
        setSelected(i);
      }
    }
  };

  const iceLeft = ice.filter((v) => v > 0).length;
  const iceTotal = init.ice.filter((v) => v > 0).length;
  const pct = 100 / n;

  return (
    <div className="flex w-full select-none flex-col items-center">
      <Hud>
        <Stat icon="moves" label="Moves" value={moves} tone={moves <= 5 ? "warn" : "default"} />
        {goal.kind === "score" && <GoalBar label="Score" value={Math.min(score, goal.target)} max={goal.target} color="#e879f9" />}
        {goal.kind === "ice" && <GoalBar label="Ice" value={iceTotal - iceLeft} max={iceTotal} color="#7dd3fc" />}
        {goal.kind === "orders" &&
          goal.orders.map(([t, k]) => {
            const left = Math.max(0, k - collected[t]);
            return (
              <div key={t} className={`panel flex h-10 items-center gap-1.5 rounded-2xl px-2.5 ${left === 0 ? "ring-2 ring-emerald-400/70" : ""}`}>
                <span className="h-7 w-7">
                  <GemArt t={t} sp="none" />
                </span>
                <span className="font-display text-lg font-bold tabular-nums">{left === 0 ? "✓" : left}</span>
              </div>
            );
          })}
        {goal.kind !== "score" && <Stat icon="trophy" label="Score" value={score.toLocaleString()} />}
      </Hud>

      <div className="board w-full max-w-[min(94vw,520px)] p-2 sm:p-3">
        <div ref={boardRef} className="relative aspect-square w-full touch-none overflow-hidden rounded-[18px]">
          {Array.from({ length: n * n }, (_, i) => (
            <div
              key={`bg${i}`}
              className="absolute"
              style={{
                left: `${(i % n) * pct}%`,
                top: `${Math.floor(i / n) * pct}%`,
                width: `${pct}%`,
                height: `${pct}%`,
                background: (Math.floor(i / n) + (i % n)) % 2 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
              }}
            >
              {ice[i] > 0 && (
                <motion.div
                  initial={false}
                  animate={{ opacity: ice[i] === 2 ? 0.95 : 0.6 }}
                  className="absolute inset-[3px] rounded-lg"
                  style={{
                    background: "linear-gradient(145deg, rgba(224,242,254,0.85), rgba(125,211,252,0.55))",
                    boxShadow: "inset 0 2px 0 rgba(255,255,255,0.8), inset 0 0 12px rgba(255,255,255,0.6)",
                  }}
                >
                  {ice[i] === 2 && (
                    <svg viewBox="0 0 40 40" className="h-full w-full opacity-60">
                      <path d="M8 10l10 8-4 12M30 6l-6 12 10 6" stroke="#0369a1" strokeWidth={1.5} fill="none" />
                    </svg>
                  )}
                </motion.div>
              )}
            </div>
          ))}

          <AnimatePresence>
            {grid.map((gem, i) => {
              if (!gem) return null;
              const r = Math.floor(i / n);
              const c = i % n;
              const isSel = selected === i;
              const isHint = hint?.includes(i);
              return (
                <motion.div
                  key={gem.id}
                  className="absolute left-0 top-0 p-[6%]"
                  style={{ width: `${pct}%`, height: `${pct}%`, zIndex: isSel ? 3 : 2 }}
                  initial={{ x: `${c * 100}%`, y: `${(gem.from ?? r) * 100}%`, scale: gem.from !== undefined ? 1 : 0 }}
                  animate={{ x: `${c * 100}%`, y: `${r * 100}%`, scale: isSel ? 1.12 : 1 }}
                  exit={{ scale: 0, opacity: 0, rotate: 120, transition: { duration: 0.22 } }}
                  transition={{ x: { type: "spring", stiffness: 500, damping: 32 }, y: { type: "spring", stiffness: 260, damping: 22 }, scale: { type: "spring", stiffness: 500, damping: 20 } }}
                  onPointerDown={onDown(i)}
                  onPointerMove={onMove}
                  onPointerUp={onUp(i)}
                >
                  <div className={`h-full w-full ${isHint ? "animate-wiggle" : ""}`} style={isSel ? { filter: "drop-shadow(0 0 10px #fff)" } : undefined}>
                    <GemArt t={gem.t} sp={gem.sp} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <AnimatePresence>
            {blasts.map((b) => {
              const r = Math.floor(b.i / n);
              const c = b.i % n;
              return b.kind === "nova" ? (
                <motion.div
                  key={b.key}
                  className="pointer-events-none absolute z-10 rounded-full"
                  style={{ left: `${(c + 0.5) * pct}%`, top: `${(r + 0.5) * pct}%`, width: `${pct * 5}%`, height: `${pct * 5}%`, x: "-50%", y: "-50%", background: "radial-gradient(circle, #fff, rgba(253,224,71,0.6) 40%, transparent 70%)" }}
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 1.2, opacity: 0 }}
                  transition={{ duration: 0.45 }}
                />
              ) : (
                <motion.div
                  key={b.key}
                  className="pointer-events-none absolute z-10 bg-white shadow-[0_0_24px_#fff]"
                  style={b.kind === "row" ? { left: 0, right: 0, top: `${(r + 0.35) * pct}%`, height: `${pct * 0.3}%` } : { top: 0, bottom: 0, left: `${(c + 0.35) * pct}%`, width: `${pct * 0.3}%` }}
                  initial={b.kind === "row" ? { scaleX: 0, opacity: 1 } : { scaleY: 0, opacity: 1 }}
                  animate={b.kind === "row" ? { scaleX: 1, opacity: 0 } : { scaleY: 1, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              );
            })}
          </AnimatePresence>
        </div>
      </div>
      <p className="mt-5 text-center text-sm text-white/55">
        Swipe a gem — or tap two neighbours — to swap.{specials ? " Match 4 for a Line gem, 5 or an L/T for a Nova." : ""}
      </p>
    </div>
  );
}
