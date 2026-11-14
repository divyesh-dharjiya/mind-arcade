"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { levelRng } from "@/lib/rng";
import { Hearts, Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

type Dir = 0 | 1 | 2 | 3; // up, right, down, left
const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];
const DIR_NAME = ["up", "right", "down", "left"];
const DIR_COLOR = ["#22d3ee", "#a78bfa", "#f472b6", "#fbbf24"];

interface Piece {
  id: number;
  cells: [number, number][]; // cells[0] is the arrow head
  dir: Dir;
}

const SIZES = [4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9];

function params(level: number) {
  const n = SIZES[level - 1] ?? 9;
  const stones = level >= 7 ? Math.max(1, Math.round(n * n * 0.05)) + (level % 3) : 0;
  const longChance = level >= 13 ? 0.4 : 0;
  const timed = level >= 21;
  return { n, stones, longChance, timed };
}

/**
 * Pieces are placed one by one, each with a clear path to the edge at the
 * moment it is placed. Removing them in reverse placement order always works,
 * so every generated board is solvable.
 */
function generate(level: number) {
  const { n, stones: stoneCount, longChance } = params(level);
  const rng = levelRng("arrow-escape", level);
  const occ = new Array<number>(n * n).fill(-1); // -1 empty, -2 stone, else piece id
  const stones: number[] = [];
  while (stones.length < stoneCount) {
    const i = Math.floor(rng() * n * n);
    if (occ[i] === -1) {
      occ[i] = -2;
      stones.push(i);
    }
  }
  // Arrows pointing across the board (long clear paths) are likely to be
  // blocked by later arrows, which creates deeper "who goes first" chains.
  const inward = Math.min(0.85, 0.45 + level * 0.015);
  const pieces: Piece[] = [];
  const attempts = n * n * 80;
  for (let a = 0; a < attempts; a++) {
    const r = Math.floor(rng() * n);
    const c = Math.floor(rng() * n);
    if (occ[r * n + c] !== -1) continue;
    let len = 1;
    if (longChance && rng() < longChance) len = rng() < 0.6 ? 2 : 3;

    const options: { dir: Dir; cells: [number, number][]; path: number }[] = [];
    for (let d = 0; d < 4; d++) {
      const cells: [number, number][] = [];
      let ok = true;
      for (let k = 0; k < len; k++) {
        const rr = r - DR[d] * k;
        const cc = c - DC[d] * k;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n || occ[rr * n + cc] !== -1) {
          ok = false;
          break;
        }
        cells.push([rr, cc]);
      }
      if (!ok) continue;
      let rr = r + DR[d];
      let cc = c + DC[d];
      let path = 0;
      while (rr >= 0 && rr < n && cc >= 0 && cc < n) {
        if (occ[rr * n + cc] !== -1) {
          ok = false;
          break;
        }
        rr += DR[d];
        cc += DC[d];
        path++;
      }
      if (ok) options.push({ dir: d as Dir, cells, path });
    }
    if (!options.length) continue;

    let choice = options[Math.floor(rng() * options.length)];
    if (rng() < inward) {
      const best = Math.max(...options.map((o) => o.path));
      const top = options.filter((o) => o.path === best);
      choice = top[Math.floor(rng() * top.length)];
    }
    const id = pieces.length;
    pieces.push({ id, cells: choice.cells, dir: choice.dir });
    for (const [pr, pc] of choice.cells) occ[pr * n + pc] = id;
  }
  return { n, pieces, stones };
}

function ArrowShape({ piece, minR, minC }: { piece: Piece; minR: number; minC: number }) {
  const dx = DC[piece.dir];
  const dy = DR[piece.dir];
  const [hr, hc] = piece.cells[0];
  const [tr, tc] = piece.cells[piece.cells.length - 1];
  const hx = (hc - minC) * 100 + 50;
  const hy = (hr - minR) * 100 + 50;
  const tx = (tc - minC) * 100 + 50 - dx * 30;
  const ty = (tr - minR) * 100 + 50 - dy * 30;
  const tipX = hx + dx * 36;
  const tipY = hy + dy * 36;
  const baseX = tipX - dx * 32;
  const baseY = tipY - dy * 32;
  const px = -dy;
  const py = dx;
  const color = DIR_COLOR[piece.dir];
  return (
    <>
      <line
        x1={tx}
        y1={ty}
        x2={baseX + dx * 4}
        y2={baseY + dy * 4}
        stroke={color}
        strokeWidth={16}
        strokeLinecap="round"
      />
      <polygon
        points={`${tipX},${tipY} ${baseX + px * 24},${baseY + py * 24} ${baseX - px * 24},${baseY - py * 24}`}
        fill={color}
        stroke={color}
        strokeWidth={6}
        strokeLinejoin="round"
      />
    </>
  );
}

export default function ArrowEscape({ level, onWin, onLose }: GameProps) {
  const { n, pieces, stones } = useMemo(() => generate(level), [level]);
  const { timed } = params(level);
  const totalTime = Math.ceil(pieces.length * 1.6) + 8;

  const [gone, setGone] = useState<boolean[]>(() => pieces.map(() => false));
  const [hearts, setHearts] = useState(3);
  const [shake, setShake] = useState<{ id: number; key: number } | null>(null);
  const [blocker, setBlocker] = useState<{ id: number | "stone"; cell: number; key: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const doneRef = useRef(false);
  const tick = useRef(0);

  const left = gone.filter((g) => !g).length;
  const stoneSet = useMemo(() => new Set(stones), [stones]);

  useEffect(() => {
    if (!timed) return;
    const t = window.setInterval(() => {
      if (doneRef.current) return;
      setTimeLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [timed]);

  useEffect(() => {
    if (timed && timeLeft === 0 && !doneRef.current) {
      doneRef.current = true;
      onLose("Time's up!");
    }
  }, [timed, timeLeft, onLose]);

  function tap(p: Piece) {
    if (doneRef.current || gone[p.id]) return;
    const occ = new Array<number>(n * n).fill(-1);
    pieces.forEach((q) => {
      if (!gone[q.id]) for (const [r, c] of q.cells) occ[r * n + c] = q.id;
    });
    let [r, c] = p.cells[0];
    r += DR[p.dir];
    c += DC[p.dir];
    let hit: { id: number | "stone"; cell: number } | null = null;
    while (r >= 0 && r < n && c >= 0 && c < n) {
      const i = r * n + c;
      if (stoneSet.has(i)) {
        hit = { id: "stone", cell: i };
        break;
      }
      if (occ[i] !== -1) {
        hit = { id: occ[i], cell: i };
        break;
      }
      r += DR[p.dir];
      c += DC[p.dir];
    }
    if (hit) {
      const k = ++tick.current;
      setShake({ id: p.id, key: k });
      setBlocker({ ...hit, key: k });
      const h = hearts - 1;
      setHearts(h);
      if (h <= 0) {
        doneRef.current = true;
        window.setTimeout(() => onLose("Out of hearts — that arrow was blocked."), 600);
      }
      return;
    }
    const next = gone.slice();
    next[p.id] = true;
    setGone(next);
    if (next.every(Boolean)) {
      doneRef.current = true;
      window.setTimeout(() => onWin(hearts), 650);
    }
  }

  const cellPct = 100 / n;

  return (
    <div className="flex flex-col items-center">
      <Hud>
        <Hearts left={hearts} />
        <Stat label="Arrows" value={left} />
        {timed && <Stat label="Time" value={`${timeLeft}s`} tone={timeLeft <= 10 ? "warn" : "default"} />}
      </Hud>

      <div
        className="relative aspect-square w-full max-w-[520px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 shadow-2xl shadow-cyan-950/40"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.18) 2px, transparent 2.5px)",
          backgroundSize: `${cellPct}% ${cellPct}%`,
          backgroundPosition: `${cellPct / 2}% ${cellPct / 2}%`,
        }}
      >
        {stones.map((i) => {
          const r = Math.floor(i / n);
          const c = i % n;
          const flash = blocker?.id === "stone" && blocker.cell === i;
          return (
            <div
              key={`s${i}`}
              className="absolute"
              style={{ left: `${c * cellPct}%`, top: `${r * cellPct}%`, width: `${cellPct}%`, height: `${cellPct}%` }}
            >
              <div
                key={flash ? blocker.key : undefined}
                className={`absolute inset-[9%] rounded-xl border border-slate-500/50 bg-gradient-to-br from-slate-500 to-slate-700 shadow-inner ${flash ? "animate-blink" : ""}`}
              />
            </div>
          );
        })}

        {pieces.map((p) => {
          const rows = p.cells.map((x) => x[0]);
          const cols = p.cells.map((x) => x[1]);
          const minR = Math.min(...rows);
          const maxR = Math.max(...rows);
          const minC = Math.min(...cols);
          const maxC = Math.max(...cols);
          const h = maxR - minR + 1;
          const w = maxC - minC + 1;
          const isGone = gone[p.id];
          const isShaking = shake?.id === p.id;
          const isBlocker = blocker?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-label={`Arrow pointing ${DIR_NAME[p.dir]}`}
              onClick={() => tap(p)}
              disabled={isGone}
              className="absolute transition-[transform,opacity] duration-700 ease-in focus:outline-none"
              style={{
                left: `${minC * cellPct}%`,
                top: `${minR * cellPct}%`,
                width: `${w * cellPct}%`,
                height: `${h * cellPct}%`,
                transform: isGone ? `translate(${DC[p.dir] * 110}vmax, ${DR[p.dir] * 110}vmax)` : undefined,
                opacity: isGone ? 0 : 1,
                pointerEvents: isGone ? "none" : undefined,
              }}
            >
              <span
                key={isShaking ? shake.key : isBlocker ? blocker.key : "idle"}
                className={`block h-full w-full rounded-2xl transition hover:bg-white/5 ${isShaking ? "animate-shake bg-rose-500/15" : ""} ${isBlocker ? "animate-blink" : ""}`}
              >
                <svg viewBox={`0 0 ${w * 100} ${h * 100}`} className="h-full w-full drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]">
                  <ArrowShape piece={p} minR={minR} minC={minC} />
                </svg>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 max-w-md text-center text-sm text-slate-400">
        Tap an arrow whose path to the edge is clear. Blocked taps cost a heart.
      </p>
    </div>
  );
}
