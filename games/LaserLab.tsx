"use client";

import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { levelRng, shuffle, type Rng } from "@/lib/rng";
import { sfx } from "@/lib/sfx";
import { burstAt } from "@/lib/fx";
import { Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];
// incoming direction -> outgoing direction, for "/" (0) and "\" (1)
const REFLECT = [
  [1, 0, 3, 2],
  [3, 2, 1, 0],
];
const BEAM = ["#fb7185", "#22d3ee"];

// [size, turn chance, crystals per laser, decoy mirrors, walls, twin]
const TABLE: [number, number, number, number, number, boolean][] = [
  [5, 0.45, 2, 1, 0, false], [5, 0.45, 2, 2, 0, false], [5, 0.5, 3, 2, 0, false], [6, 0.45, 3, 3, 0, false], [6, 0.5, 3, 3, 0, false],
  [6, 0.5, 4, 4, 0, false], [7, 0.45, 4, 4, 0, false],
  [6, 0.5, 3, 3, 3, false], [6, 0.5, 4, 4, 4, false], [7, 0.5, 4, 4, 4, false], [7, 0.5, 4, 5, 5, false], [7, 0.55, 5, 5, 5, false],
  [8, 0.5, 5, 6, 6, false], [8, 0.55, 5, 6, 7, false],
  [6, 0.45, 2, 2, 2, true], [6, 0.5, 2, 3, 2, true], [7, 0.45, 3, 3, 3, true], [7, 0.5, 3, 4, 3, true], [7, 0.5, 3, 4, 4, true],
  [8, 0.45, 3, 5, 4, true], [8, 0.5, 3, 5, 5, true], [8, 0.5, 4, 5, 5, true], [8, 0.55, 4, 6, 6, true], [8, 0.55, 4, 6, 7, true],
];

interface Emitter {
  side: number; // 0 top, 1 right, 2 bottom, 3 left
  idx: number;
  color: number;
}
interface Level {
  n: number;
  emitters: Emitter[];
  mirrors: Map<number, number>; // cell -> solution state
  start: Map<number, number>; // cell -> scrambled state
  crystals: Map<number, number>; // cell -> colour
  walls: Set<number>;
  par: number;
}

function entry(e: Emitter, n: number): [number, number, number] {
  if (e.side === 0) return [0, e.idx, 2];
  if (e.side === 1) return [e.idx, n - 1, 3];
  if (e.side === 2) return [n - 1, e.idx, 0];
  return [e.idx, 0, 1];
}

export function trace(n: number, e: Emitter, state: Map<number, number>, walls: Set<number>) {
  let [r, c, d] = entry(e, n);
  const cells: number[] = [];
  const pts: [number, number][] = [];
  const seen = new Set<string>();
  // start point just outside the board
  pts.push([c + 0.5 - DC[d] * 0.75, r + 0.5 - DR[d] * 0.75]);
  let blocked = false;
  while (r >= 0 && r < n && c >= 0 && c < n) {
    const i = r * n + c;
    const k = `${i}:${d}`;
    if (seen.has(k)) break;
    seen.add(k);
    if (walls.has(i)) {
      pts.push([c + 0.5 - DC[d] * 0.5, r + 0.5 - DR[d] * 0.5]);
      blocked = true;
      break;
    }
    cells.push(i);
    const m = state.get(i);
    if (m !== undefined) {
      pts.push([c + 0.5, r + 0.5]);
      d = REFLECT[m][d];
    }
    r += DR[d];
    c += DC[d];
  }
  if (!blocked) pts.push([c + 0.5 - DC[d] * 0.25, r + 0.5 - DR[d] * 0.25]);
  return { cells, pts };
}

function buildPath(n: number, e: Emitter, rng: Rng, turn: number, noMirror: Set<number>, blocked: Set<number>) {
  let [r, c, d] = entry(e, n);
  const cells: number[] = [];
  const mirrors = new Map<number, number>();
  const visited = new Set<number>();
  // a direction is usable if it leaves the board or reaches a fresh, unblocked cell
  const ok = (rr: number, cc: number, dir: number) => {
    const nr = rr + DR[dir];
    const nc = cc + DC[dir];
    if (nr < 0 || nr >= n || nc < 0 || nc >= n) return true;
    const j = nr * n + nc;
    return !visited.has(j) && !blocked.has(j);
  };
  while (r >= 0 && r < n && c >= 0 && c < n) {
    const i = r * n + c;
    if (visited.has(i) || blocked.has(i)) return null;
    visited.add(i);
    cells.push(i);
    if (cells.length > 1 && !noMirror.has(i)) {
      const turns = [(d + 1) % 4, (d + 3) % 4].filter((nd) => ok(r, c, nd));
      const straight = ok(r, c, d);
      if (turns.length && (rng() < turn || !straight)) {
        const nd = turns[Math.floor(rng() * turns.length)];
        mirrors.set(i, REFLECT[0][d] === nd ? 0 : 1);
        d = nd;
      } else if (!straight) return null;
    }
    r += DR[d];
    c += DC[d];
  }
  return { cells, mirrors };
}

export function generate(level: number): Level {
  const [n, turn, crystalsPer, decoys, wallCount, twin] = TABLE[level - 1] ?? TABLE[TABLE.length - 1];
  for (let salt = 0; salt < 400; salt++) {
    const rng = levelRng("laser-lab", level, salt);
    const emitters: Emitter[] = [];
    const mirrors = new Map<number, number>();
    const crystals = new Map<number, number>();
    const pathCells = new Set<number>();
    let ok = true;
    for (let k = 0; k < (twin ? 2 : 1); k++) {
      const e: Emitter = { side: Math.floor(rng() * 4), idx: Math.floor(rng() * n), color: k };
      if (emitters.some((o) => o.side === e.side && o.idx === e.idx)) {
        ok = false;
        break;
      }
      const p = buildPath(n, e, rng, turn, pathCells, new Set(mirrors.keys()));
      const minM = n >= 7 ? 3 : 2;
      if (!p || p.cells.length < n + 2 || p.mirrors.size < minM) {
        ok = false;
        break;
      }
      const free = p.cells.filter((i, j) => j > 0 && !p.mirrors.has(i) && !crystals.has(i) && !mirrors.has(i));
      if (free.length < crystalsPer) {
        ok = false;
        break;
      }
      const picks = shuffle(rng, free).slice(0, crystalsPer);
      picks.forEach((i) => crystals.set(i, k));
      p.mirrors.forEach((v, i) => mirrors.set(i, v));
      p.cells.forEach((i) => pathCells.add(i));
      emitters.push(e);
    }
    if (!ok) continue;
    // crystals of one colour must not sit on the other laser's path
    if (twin) {
      const lit = emitters.map((e) => new Set(trace(n, e, mirrors, new Set()).cells));
      if ([...crystals].some(([i, col]) => lit[1 - col].has(i))) continue;
    }
    const empty = shuffle(rng, Array.from({ length: n * n }, (_, i) => i).filter((i) => !pathCells.has(i)));
    const walls = new Set(empty.slice(0, wallCount));
    empty.slice(wallCount, wallCount + decoys).forEach((i) => mirrors.set(i, rng() < 0.5 ? 0 : 1));
    // confirm the intended setup works
    const solved = emitters.every((e) => {
      const lit = new Set(trace(n, e, mirrors, walls).cells);
      return [...crystals].filter(([, col]) => col === e.color).every(([i]) => lit.has(i));
    });
    if (!solved) continue;
    const start = new Map<number, number>();
    let par = 0;
    mirrors.forEach((v, i) => {
      const flip = pathCells.has(i) ? rng() < 0.65 : rng() < 0.5;
      start.set(i, flip ? 1 - v : v);
      if (flip && pathCells.has(i)) par++;
    });
    if (par < 2) continue;
    const startsSolved = emitters.every((e) => {
      const lit = new Set(trace(n, e, start, walls).cells);
      return [...crystals].filter(([, col]) => col === e.color).every(([i]) => lit.has(i));
    });
    if (startsSolved) continue;
    return { n, emitters, mirrors, start, crystals, walls, par };
  }
  throw new Error("Could not generate Laser Lab level");
}

export default function LaserLab({ level, onWin }: GameProps) {
  const lv = useMemo(() => generate(level), [level]);
  const { n } = lv;
  const [turns, setTurns] = useState<Map<number, number>>(() => new Map([...lv.start.keys()].map((i) => [i, 0])));
  const [taps, setTaps] = useState(0);
  const [won, setWon] = useState(false);
  const doneRef = useRef(false);
  const crystalEls = useRef<Map<number, SVGGElement>>(new Map());
  const boardRef = useRef<HTMLDivElement>(null);

  const state = useMemo(() => {
    const m = new Map<number, number>();
    lv.start.forEach((v, i) => m.set(i, (v + (turns.get(i) ?? 0)) % 2));
    return m;
  }, [lv, turns]);
  const beams = useMemo(() => lv.emitters.map((e) => ({ e, ...trace(n, e, state, lv.walls) })), [lv, n, state]);
  const litBy = useMemo(() => {
    const m = new Map<number, Set<number>>();
    beams.forEach((b) => b.cells.forEach((i) => m.set(i, (m.get(i) ?? new Set()).add(b.e.color))));
    return m;
  }, [beams]);
  const isLit = (i: number, col: number) => litBy.get(i)?.has(col) ?? false;
  const litCount = [...lv.crystals].filter(([i, col]) => isLit(i, col)).length;
  const sig = beams.map((b) => b.pts.map((p) => p.join(",")).join(" ")).join("|");

  function flip(i: number) {
    if (doneRef.current) return;
    const next = new Map(turns);
    next.set(i, (next.get(i) ?? 0) + 1);
    setTurns(next);
    const t = taps + 1;
    setTaps(t);
    sfx.rotate();
    const st = new Map<number, number>();
    lv.start.forEach((v, k) => st.set(k, (v + (next.get(k) ?? 0)) % 2));
    const lit = lv.emitters.map((e) => new Set(trace(n, e, st, lv.walls).cells));
    const nowLit = [...lv.crystals].filter(([k, col]) => lit[col].has(k));
    if (nowLit.length > litCount) {
      sfx.pop(nowLit.length * 2);
      nowLit.filter(([k, col]) => !isLit(k, col)).forEach(([k]) => burstAt(crystalEls.current.get(k), { colors: [BEAM[lv.crystals.get(k)!], "#fff"], count: 12, speed: 180 }));
    }
    if (nowLit.length === lv.crystals.size) {
      doneRef.current = true;
      window.setTimeout(() => {
        setWon(true);
        sfx.clear();
        burstAt(boardRef.current, { colors: [...BEAM, "#fff", "#fde047"], count: 46, speed: 420, kind: "star" });
      }, 250);
      const stars = t <= lv.par + 2 ? 3 : t <= lv.par * 2 + 3 ? 2 : 1;
      window.setTimeout(
        () =>
          onWin(stars, [
            { label: "Taps", value: String(t) },
            { label: "Par", value: String(lv.par) },
            { label: "Crystals", value: `${lv.crystals.size}/${lv.crystals.size}` },
          ]),
        1200,
      );
    }
  }

  const V = n + 2; // one cell of margin on every side for the emitters
  return (
    <div className="flex w-full flex-col items-center">
      <Hud>
        <Stat icon="target" label="Crystals" value={`${litCount}/${lv.crystals.size}`} tone={litCount === lv.crystals.size ? "good" : "default"} />
        <Stat icon="restart" label="Taps" value={taps} />
        <Stat icon="check" label="Par" value={lv.par} tone={taps > lv.par + 2 ? "warn" : "good"} />
      </Hud>

      <div ref={boardRef} className="board w-full max-w-[min(94vw,540px)] p-2 sm:p-3">
        <svg viewBox={`0 0 ${V} ${V}`} className="block w-full select-none" style={{ aspectRatio: "1 / 1" }}>
          <defs>
            <filter id="beamGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.09" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="mirrorG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f8fafc" />
              <stop offset="0.5" stopColor="#94a3b8" />
              <stop offset="1" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>
          <rect x={1} y={1} width={n} height={n} rx={0.25} fill="#0a0f24" />
          {Array.from({ length: n * n }, (_, i) => (
            <rect key={`c${i}`} x={1 + (i % n) + 0.05} y={1 + Math.floor(i / n) + 0.05} width={0.9} height={0.9} rx={0.14} fill="rgba(255,255,255,0.035)" />
          ))}

          {[...lv.walls].map((i) => (
            <g key={`w${i}`} transform={`translate(${1 + (i % n)} ${1 + Math.floor(i / n)})`}>
              <rect x={0.06} y={0.1} width={0.88} height={0.88} rx={0.14} fill="#0b0f1f" />
              <rect x={0.06} y={0.04} width={0.88} height={0.86} rx={0.14} fill="#475569" />
              <path d="M0.2 0.3h0.6M0.2 0.5h0.6M0.2 0.7h0.6" stroke="#334155" strokeWidth={0.05} />
            </g>
          ))}

          {beams.map((b, k) => {
            const d = b.pts.map(([x, y], j) => `${j ? "L" : "M"}${x + 1} ${y + 1}`).join(" ");
            return (
              <g key={`beam${k}-${sig}`}>
                <motion.path d={d} fill="none" stroke={BEAM[b.e.color]} strokeWidth={0.2} strokeLinecap="round" strokeLinejoin="round" filter="url(#beamGlow)" opacity={0.9} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.28, ease: "easeOut" }} />
                <motion.path d={d} fill="none" stroke="#fff" strokeWidth={0.06} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.28, ease: "easeOut" }} />
                <path d={d} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={0.06} strokeDasharray="0.12 0.3" style={{ animation: "laserflow 0.6s linear infinite" }} />
              </g>
            );
          })}

          {[...lv.crystals].map(([i, col]) => {
            const lit = isLit(i, col);
            return (
              <g
                key={`k${i}`}
                ref={(el) => {
                  if (el) crystalEls.current.set(i, el);
                }}
                transform={`translate(${1 + (i % n) + 0.5} ${1 + Math.floor(i / n) + 0.5})`}
              >
                {lit && <circle r={0.42} fill={BEAM[col]} opacity={0.35} style={{ animation: "pulse 1.2s ease-in-out infinite" }} />}
                <motion.g animate={{ scale: lit ? 1.1 : 0.9, rotate: lit ? 45 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
                  <path d="M0 -0.34 L0.24 0 L0 0.34 L-0.24 0Z" fill={lit ? BEAM[col] : `color-mix(in oklab, ${BEAM[col]} 35%, #1e293b)`} stroke={BEAM[col]} strokeWidth={0.04} style={lit ? { filter: `drop-shadow(0 0 0.12px ${BEAM[col]})` } : undefined} />
                  <path d="M0 -0.34 L0.24 0 L0 -0.05Z" fill="#fff" opacity={lit ? 0.75 : 0.25} />
                </motion.g>
              </g>
            );
          })}

          {[...lv.start.keys()].map((i) => {
            const t = turns.get(i) ?? 0;
            const base = lv.start.get(i)!;
            const angle = (base === 0 ? -45 : 45) + t * 90;
            const hit = litBy.has(i);
            return (
              <g key={`m${i}`} transform={`translate(${1 + (i % n) + 0.5} ${1 + Math.floor(i / n) + 0.5})`} onClick={() => flip(i)} className="cursor-pointer">
                <circle r={0.44} fill={hit ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"} stroke="rgba(255,255,255,0.18)" strokeWidth={0.03} />
                <motion.g initial={false} animate={{ rotate: angle }} transition={{ type: "spring", stiffness: 380, damping: 18 }}>
                  <rect x={-0.4} y={-0.07} width={0.8} height={0.14} rx={0.07} fill="url(#mirrorG)" stroke="#475569" strokeWidth={0.02} />
                  <rect x={-0.34} y={-0.045} width={0.68} height={0.03} rx={0.015} fill="#fff" opacity={0.8} />
                </motion.g>
                <circle r={0.06} fill="#334155" />
              </g>
            );
          })}

          {lv.emitters.map((e, k) => {
            const [r, c, d] = entry(e, n);
            const x = 1 + c + 0.5 - DC[d] * 1;
            const y = 1 + r + 0.5 - DR[d] * 1;
            const angle = [270, 0, 90, 180][d];
            return (
              <g key={`e${k}`} transform={`translate(${x} ${y}) rotate(${angle})`}>
                <rect x={-0.42} y={-0.3} width={0.62} height={0.6} rx={0.12} fill="#334155" stroke="#64748b" strokeWidth={0.04} />
                <rect x={0.18} y={-0.14} width={0.26} height={0.28} rx={0.05} fill="#1e293b" />
                <circle cx={-0.1} cy={0} r={0.13} fill={BEAM[e.color]} style={{ filter: `drop-shadow(0 0 0.1px ${BEAM[e.color]})` }} />
              </g>
            );
          })}
          {won && <rect x={1} y={1} width={n} height={n} rx={0.25} fill="none" stroke="#fde047" strokeWidth={0.06} style={{ filter: "drop-shadow(0 0 0.2px #fde047)" }} />}
        </svg>
      </div>
      <p className="mt-5 text-center text-sm text-white/55">Tap a mirror to flip it. Light up every crystal{lv.emitters.length > 1 ? " with the laser of its own colour" : ""}.</p>
    </div>
  );
}
