"use client";

import { useMemo, useRef, useState } from "react";
import { levelRng, randInt } from "@/lib/rng";
import { Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];
const EDGE: [number, number][] = [
  [50, 0],
  [100, 50],
  [50, 100],
  [0, 50],
];

// [size, wrap, stiff chance]
const TABLE: [number, boolean, number][] = [
  [3, false, 0], [4, false, 0], [4, false, 0], [5, false, 0], [5, false, 0], [6, false, 0], [6, false, 0],
  [4, true, 0], [4, true, 0], [5, true, 0], [5, true, 0], [6, true, 0], [6, true, 0], [7, true, 0],
  [5, false, 0.3], [6, false, 0.3], [6, false, 0.35], [7, false, 0.35], [7, true, 0.3], [8, false, 0.35],
];

const rot = (m: number, k: number) => {
  let x = m;
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) x = ((x << 1) | (x >> 3)) & 15;
  return x;
};

function neighbor(i: number, d: number, n: number, wrap: boolean): number {
  let r = Math.floor(i / n) + DR[d];
  let c = (i % n) + DC[d];
  if (wrap) {
    r = (r + n) % n;
    c = (c + n) % n;
  } else if (r < 0 || r >= n || c < 0 || c >= n) return -1;
  return r * n + c;
}

function analyse(masks: number[], n: number, wrap: boolean, source: number) {
  const lit = new Array<boolean>(n * n).fill(false);
  const queue = [source];
  lit[source] = true;
  while (queue.length) {
    const i = queue.shift()!;
    for (let d = 0; d < 4; d++) {
      if (!(masks[i] & (1 << d))) continue;
      const j = neighbor(i, d, n, wrap);
      if (j < 0 || lit[j] || !(masks[j] & (1 << ((d + 2) % 4)))) continue;
      lit[j] = true;
      queue.push(j);
    }
  }
  let loose = 0;
  for (let i = 0; i < n * n; i++) {
    for (let d = 0; d < 4; d++) {
      if (!(masks[i] & (1 << d))) continue;
      const j = neighbor(i, d, n, wrap);
      if (j < 0 || !(masks[j] & (1 << ((d + 2) % 4)))) loose++;
    }
  }
  return { lit, solved: loose === 0 && lit.every(Boolean) };
}

function generate(level: number) {
  const [n, wrap, stiffChance] = TABLE[level - 1] ?? TABLE[TABLE.length - 1];
  const rng = levelRng("pipe-connect", level);
  const source = Math.floor(n / 2) * n + Math.floor(n / 2);
  const base = new Array<number>(n * n).fill(0);
  const inTree = new Array<boolean>(n * n).fill(false);
  const frontier: [number, number][] = [];
  const addEdges = (i: number) => {
    for (let d = 0; d < 4; d++) frontier.push([i, d]);
  };
  inTree[source] = true;
  addEdges(source);
  while (frontier.length) {
    const k = Math.floor(rng() * frontier.length);
    const [i, d] = frontier[k];
    frontier[k] = frontier[frontier.length - 1];
    frontier.pop();
    const j = neighbor(i, d, n, wrap);
    if (j < 0 || inTree[j]) continue;
    base[i] |= 1 << d;
    base[j] |= 1 << ((d + 2) % 4);
    inTree[j] = true;
    addEdges(j);
  }

  const stiff = base.map(() => stiffChance > 0 && rng() < stiffChance);
  const rots = base.map((_, i) => (stiff[i] ? (rng() < 0.5 ? 0 : 2) : randInt(rng, 0, 3)));
  const current = () => base.map((m, i) => rot(m, rots[i]));
  // Make sure the board doesn't start solved.
  let guard = 0;
  while (analyse(current(), n, wrap, source).solved && guard++ < 50) {
    const i = Math.floor(rng() * n * n);
    rots[i] += stiff[i] ? 2 : 1;
  }

  let par = 0;
  base.forEach((m, i) => {
    const step = stiff[i] ? 2 : 1;
    for (let t = 0; t < 4; t++) {
      if (rot(m, rots[i] + t * step) === m) {
        par += t;
        break;
      }
    }
  });

  return { n, wrap, source, base, stiff, rots, par };
}

function Tile({ mask, lit, isSource, stiff }: { mask: number; lit: boolean; isSource: boolean; stiff: boolean }) {
  const deg = [0, 1, 2, 3].filter((d) => mask & (1 << d)).length;
  const color = lit ? "#a3e635" : "#64748b";
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      {[0, 1, 2, 3].map((d) =>
        mask & (1 << d) ? (
          <g key={d}>
            <line x1={50} y1={50} x2={EDGE[d][0]} y2={EDGE[d][1]} stroke="#0f172a" strokeWidth={26} />
            <line x1={50} y1={50} x2={EDGE[d][0]} y2={EDGE[d][1]} stroke={color} strokeWidth={14} />
          </g>
        ) : null,
      )}
      <circle cx={50} cy={50} r={isSource ? 0 : 10} fill={color} />
      {isSource && (
        <>
          <circle cx={50} cy={50} r={27} fill="#0f172a" />
          <circle cx={50} cy={50} r={21} fill="#bef264" style={{ filter: "drop-shadow(0 0 8px #a3e635)" }} />
          <path d="M53 34 L42 53 H51 L47 66 L59 46 H50 Z" fill="#14532d" />
        </>
      )}
      {!isSource && deg === 1 && (
        <>
          <circle cx={50} cy={50} r={22} fill="#0f172a" />
          <circle
            cx={50}
            cy={50}
            r={16}
            fill={lit ? "#fde047" : "#334155"}
            style={lit ? { filter: "drop-shadow(0 0 7px #fde047)" } : undefined}
          />
        </>
      )}
      {stiff && <rect x={4} y={4} width={92} height={92} rx={14} fill="none" stroke="#fb923c" strokeWidth={4} opacity={0.8} />}
    </svg>
  );
}

export default function PipeConnect({ level, onWin }: GameProps) {
  const init = useMemo(() => generate(level), [level]);
  const { n, wrap, source, base, stiff, par } = init;
  const [rots, setRots] = useState<number[]>(() => init.rots.slice());
  const [taps, setTaps] = useState(0);
  const doneRef = useRef(false);

  const masks = useMemo(() => base.map((m, i) => rot(m, rots[i])), [base, rots]);
  const { lit } = useMemo(() => analyse(masks, n, wrap, source), [masks, n, wrap, source]);
  const lamps = base.filter((m, i) => i !== source && [0, 1, 2, 3].filter((d) => m & (1 << d)).length === 1).length;
  const litLamps = base.filter(
    (m, i) => i !== source && lit[i] && [0, 1, 2, 3].filter((d) => m & (1 << d)).length === 1,
  ).length;

  function tap(i: number) {
    if (doneRef.current) return;
    const next = rots.slice();
    next[i] += stiff[i] ? 2 : 1;
    setRots(next);
    const t = taps + 1;
    setTaps(t);
    const after = base.map((m, k) => rot(m, next[k]));
    if (analyse(after, n, wrap, source).solved) {
      doneRef.current = true;
      const stars = t <= par + 1 ? 3 : t <= Math.ceil(par * 1.5) + 2 ? 2 : 1;
      window.setTimeout(() => onWin(stars), 700);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <Hud>
        <Stat label="Lamps" value={`${litLamps}/${lamps}`} tone={litLamps === lamps ? "good" : "default"} />
        <Stat label="Taps" value={taps} />
        <Stat label="Par" value={par} tone={taps > par + 1 ? "warn" : "good"} />
        {wrap && <Stat label="Mode" value="Wrap ↔" />}
      </Hud>

      <div
        className={`grid w-full max-w-[480px] overflow-hidden rounded-3xl border-2 bg-slate-950/70 p-2 ${wrap ? "border-dashed border-lime-300/40" : "border-white/10"}`}
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {base.map((m, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Pipe tile ${i + 1}`}
            onClick={() => tap(i)}
            className="aspect-square rounded-lg transition hover:bg-white/5"
          >
            <span
              className="block h-full w-full transition-transform duration-200 ease-out"
              style={{ transform: `rotate(${rots[i] * 90}deg)` }}
            >
              <Tile mask={m} lit={lit[i]} isSource={i === source} stiff={stiff[i]} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
