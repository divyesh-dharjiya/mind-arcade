"use client";

import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { levelRng, randInt } from "@/lib/rng";
import { sfx } from "@/lib/sfx";
import { burstAt } from "@/lib/fx";
import { Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];
const EDGE: [number, number][] = [[50, 0], [100, 50], [50, 100], [0, 50]];

// [size, wrap, stiff chance]
const TABLE: [number, boolean, number][] = [
  [3, false, 0], [4, false, 0], [4, false, 0], [5, false, 0], [5, false, 0], [6, false, 0], [6, false, 0], [7, false, 0],
  [4, true, 0], [5, true, 0], [5, true, 0], [6, true, 0], [6, true, 0], [7, true, 0], [7, true, 0], [8, true, 0],
  [5, false, 0.3], [6, false, 0.3], [6, false, 0.35], [7, false, 0.35], [7, true, 0.3], [8, false, 0.35], [8, true, 0.3], [8, true, 0.4],
];

export const rot = (m: number, k: number) => {
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

export function analyse(masks: number[], n: number, wrap: boolean, source: number) {
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
  for (let i = 0; i < n * n; i++)
    for (let d = 0; d < 4; d++) {
      if (!(masks[i] & (1 << d))) continue;
      const j = neighbor(i, d, n, wrap);
      if (j < 0 || !(masks[j] & (1 << ((d + 2) % 4)))) loose++;
    }
  return { lit, solved: loose === 0 && lit.every(Boolean) };
}

export function generate(level: number) {
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
    // avoid 4-way crosses: they never need rotating
    const deg = (m: number) => [0, 1, 2, 3].filter((b) => m & (1 << b)).length;
    if (deg(base[i]) >= 3 && rng() < 0.85) continue;
    base[i] |= 1 << d;
    base[j] |= 1 << ((d + 2) % 4);
    inTree[j] = true;
    addEdges(j);
  }
  // Any cell skipped by the degree rule: attach it to a neighbour in the tree.
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < n * n; i++) {
      if (inTree[i]) continue;
      for (let d = 0; d < 4; d++) {
        const j = neighbor(i, d, n, wrap);
        if (j >= 0 && inTree[j]) {
          base[i] |= 1 << d;
          base[j] |= 1 << ((d + 2) % 4);
          inTree[i] = true;
          changed = true;
          break;
        }
      }
    }
  }
  const stiff = base.map((_, i) => stiffChance > 0 && i !== source && rng() < stiffChance);
  const rots = base.map((_, i) => (stiff[i] ? (rng() < 0.5 ? 0 : 2) : randInt(rng, 0, 3)));
  let guard = 0;
  while (analyse(base.map((m, i) => rot(m, rots[i])), n, wrap, source).solved && guard++ < 50) {
    const i = Math.floor(rng() * n * n);
    rots[i] += stiff[i] ? 2 : 1;
  }
  let par = 0;
  base.forEach((m, i) => {
    const step = stiff[i] ? 2 : 1;
    for (let t = 0; t < 4; t++)
      if (rot(m, rots[i] + t * step) === m) {
        par += t;
        break;
      }
  });
  return { n, wrap, source, base, stiff, rots, par };
}

function Tile({ mask, lit, isSource, stiff, win }: { mask: number; lit: boolean; isSource: boolean; stiff: boolean; win: boolean }) {
  const deg = [0, 1, 2, 3].filter((d) => mask & (1 << d)).length;
  const body = lit ? "#84cc16" : "#475569";
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
      {[0, 1, 2, 3].map((d) =>
        mask & (1 << d) ? (
          <g key={d}>
            <line x1={50} y1={50} x2={EDGE[d][0]} y2={EDGE[d][1]} stroke="#070b18" strokeWidth={32} />
            <line x1={50} y1={50} x2={EDGE[d][0]} y2={EDGE[d][1]} stroke={body} strokeWidth={22} />
            <line x1={50} y1={50} x2={EDGE[d][0]} y2={EDGE[d][1]} stroke="rgba(255,255,255,0.22)" strokeWidth={4} transform={d % 2 === 0 ? "translate(-5 0)" : "translate(0 -5)"} />
            {lit && (
              <line
                x1={50}
                y1={50}
                x2={EDGE[d][0]}
                y2={EDGE[d][1]}
                stroke="#ecfccb"
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray="8 8"
                style={{ animation: "dash 0.9s linear infinite", filter: "drop-shadow(0 0 4px #bef264)" }}
              />
            )}
          </g>
        ) : null,
      )}
      {!isSource && <circle cx={50} cy={50} r={deg === 1 ? 0 : 15} fill={body} stroke="#070b18" strokeWidth={5} />}
      {isSource && (
        <g>
          <circle cx={50} cy={50} r={34} fill="#070b18" />
          <circle cx={50} cy={50} r={27} fill="url(#core)" style={{ filter: "drop-shadow(0 0 10px #a3e635)" }} />
          <circle cx={50} cy={50} r={31} fill="none" stroke="#d9f99d" strokeWidth={3} strokeDasharray="10 9" style={{ animation: "spin 3s linear infinite", transformOrigin: "50px 50px" }} />
          <path d="M54 30 L40 54 H50 L45 71 L61 46 H51 Z" fill="#14532d" />
        </g>
      )}
      {!isSource && deg === 1 && (
        <g>
          <circle cx={50} cy={50} r={26} fill="#070b18" />
          <circle
            cx={50}
            cy={50}
            r={20}
            fill={lit ? "url(#bulbOn)" : "url(#bulbOff)"}
            style={lit ? { filter: `drop-shadow(0 0 ${win ? 16 : 9}px #fde047)` } : undefined}
          />
          <circle cx={43} cy={43} r={5} fill="#fff" opacity={lit ? 0.85 : 0.2} />
        </g>
      )}
      {stiff && <rect x={5} y={5} width={90} height={90} rx={16} fill="none" stroke="#fb923c" strokeWidth={5} strokeDasharray="14 8" />}
    </svg>
  );
}

export default function PipeConnect({ level, onWin }: GameProps) {
  const init = useMemo(() => generate(level), [level]);
  const { n, wrap, source, base, stiff, par } = init;
  const [rots, setRots] = useState<number[]>(() => init.rots.slice());
  const [taps, setTaps] = useState(0);
  const [won, setWon] = useState(false);
  const doneRef = useRef(false);
  const tileEls = useRef<(HTMLButtonElement | null)[]>([]);

  const masks = useMemo(() => base.map((m, i) => rot(m, rots[i])), [base, rots]);
  const { lit } = useMemo(() => analyse(masks, n, wrap, source), [masks, n, wrap, source]);
  const isLamp = (m: number, i: number) => i !== source && [0, 1, 2, 3].filter((d) => m & (1 << d)).length === 1;
  const lamps = base.filter(isLamp).length;
  const litLamps = base.filter((m, i) => isLamp(m, i) && lit[i]).length;

  function tap(i: number) {
    if (doneRef.current) return;
    const next = rots.slice();
    next[i] += stiff[i] ? 2 : 1;
    setRots(next);
    const t = taps + 1;
    setTaps(t);
    sfx.rotate();
    const after = base.map((m, k) => rot(m, next[k]));
    const res = analyse(after, n, wrap, source);
    const newLit = base.filter((m, k) => isLamp(m, k) && res.lit[k]).length;
    if (newLit > litLamps) sfx.pop(Math.min(12, newLit));
    if (res.solved) {
      doneRef.current = true;
      window.setTimeout(() => {
        setWon(true);
        sfx.clear();
        base.forEach((m, k) => {
          if (isLamp(m, k)) window.setTimeout(() => burstAt(tileEls.current[k], { colors: ["#fde047", "#bef264", "#fff"], count: 10, speed: 180 }), 60 * ((k % n) + Math.floor(k / n)));
        });
      }, 300);
      const stars = t <= par + 1 ? 3 : t <= Math.ceil(par * 1.5) + 2 ? 2 : 1;
      window.setTimeout(
        () =>
          onWin(stars, [
            { label: "Taps", value: String(t) },
            { label: "Par", value: String(par) },
            { label: "Lamps lit", value: `${lamps}/${lamps}` },
          ]),
        1300,
      );
    }
  }

  return (
    <div className="flex w-full flex-col items-center">
      <svg width="0" height="0" className="absolute">
        <defs>
          <radialGradient id="core" cx="40%" cy="35%">
            <stop offset="0" stopColor="#f7fee7" />
            <stop offset="0.5" stopColor="#bef264" />
            <stop offset="1" stopColor="#4d7c0f" />
          </radialGradient>
          <radialGradient id="bulbOn" cx="40%" cy="35%">
            <stop offset="0" stopColor="#fffbea" />
            <stop offset="0.5" stopColor="#fde047" />
            <stop offset="1" stopColor="#d97706" />
          </radialGradient>
          <radialGradient id="bulbOff" cx="40%" cy="35%">
            <stop offset="0" stopColor="#64748b" />
            <stop offset="1" stopColor="#1e293b" />
          </radialGradient>
        </defs>
      </svg>
      <Hud>
        <Stat icon="hint" label="Lamps" value={`${litLamps}/${lamps}`} tone={litLamps === lamps ? "good" : "default"} />
        <Stat icon="restart" label="Taps" value={taps} />
        <Stat icon="target" label="Par" value={par} tone={taps > par + 1 ? "warn" : "good"} />
        {wrap && <Stat icon="moves" label="Mode" value="Wrap" />}
      </Hud>

      <div className={`board w-full max-w-[min(92vw,520px)] p-2.5 sm:p-3 ${wrap ? "outline-dashed outline-2 outline-offset-4 outline-lime-300/30" : ""}`}>
        <div className="grid overflow-hidden rounded-[18px] bg-[#0a1020]" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {base.map((m, i) => (
            <button
              key={i}
              ref={(el) => {
                tileEls.current[i] = el;
              }}
              type="button"
              aria-label={`Pipe tile ${i + 1}`}
              onClick={() => tap(i)}
              className="relative aspect-square transition-colors hover:bg-white/[0.04]"
              style={{ background: (Math.floor(i / n) + (i % n)) % 2 ? "rgba(255,255,255,0.025)" : "transparent" }}
            >
              <motion.span
                className="absolute inset-0 block"
                initial={false}
                animate={{ rotate: rots[i] * 90 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
              >
                <Tile mask={m} lit={lit[i]} isSource={i === source} stiff={stiff[i]} win={won} />
              </motion.span>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-5 text-center text-sm text-white/55">Tap to rotate. Every pipe must connect — no loose ends.</p>
    </div>
  );
}
