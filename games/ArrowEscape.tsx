"use client";

import { animate, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { levelRng } from "@/lib/rng";
import { burst, burstAt, center, shake } from "@/lib/fx";
import { sfx } from "@/lib/sfx";
import { formatTime, Hearts, Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

type Dir = 0 | 1 | 2 | 3; // up, right, down, left
const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];
const DIR_NAME = ["up", "right", "down", "left"];
const DIR_COLOR = ["#22d3ee", "#a78bfa", "#f472b6", "#fbbf24"];
const DIR_DARK = ["#0e7490", "#6d28d9", "#be185d", "#b45309"];

interface Piece {
  id: number;
  cells: [number, number][]; // cells[0] is the head
  dir: Dir;
}

const SIZES = [4, 4, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 10, 10];

export function params(level: number) {
  const n = SIZES[level - 1] ?? 10;
  const stones = level >= 6 ? Math.round(n * n * 0.06) + (level % 3) : 0;
  const longChance = level >= 12 ? (level >= 20 ? 0.5 : 0.4) : 0;
  const timed = level >= 20;
  const inward = Math.min(0.95, 0.6 + level * 0.012);
  return { n, stones, longChance, timed, inward };
}

/**
 * Each arrow is placed with a clear path to the edge at that moment, so removing
 * them in reverse placement order always works: every board is solvable.
 * Arrows prefer the longest open direction, which builds deep dependency chains.
 */
export function generate(level: number) {
  const { n, stones: stoneCount, longChance, inward } = params(level);
  const rng = levelRng("arrow-escape", level);
  const occ = new Array<number>(n * n).fill(-1);
  const stones: number[] = [];
  while (stones.length < stoneCount) {
    const i = Math.floor(rng() * n * n);
    if (occ[i] === -1) {
      occ[i] = -2;
      stones.push(i);
    }
  }
  const pieces: Piece[] = [];
  for (let a = 0; a < n * n * 90; a++) {
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

function ArrowGlyph({ piece, minR, minC }: { piece: Piece; minR: number; minC: number }) {
  const dx = DC[piece.dir];
  const dy = DR[piece.dir];
  const [hr, hc] = piece.cells[0];
  const [tr, tc] = piece.cells[piece.cells.length - 1];
  const hx = (hc - minC) * 100 + 50;
  const hy = (hr - minR) * 100 + 50;
  const long = piece.cells.length > 1;
  const tx = (tc - minC) * 100 + 50 - dx * (long ? 22 : 24);
  const ty = (tr - minR) * 100 + 50 - dy * (long ? 22 : 24);
  const tipX = hx + dx * 26;
  const tipY = hy + dy * 26;
  const baseX = tipX - dx * 22;
  const baseY = tipY - dy * 22;
  const px = -dy;
  const py = dx;
  return (
    <g stroke="#fff" strokeLinecap="round" strokeLinejoin="round" fill="#fff">
      <line x1={tx} y1={ty} x2={baseX} y2={baseY} strokeWidth={13} />
      <polygon points={`${tipX},${tipY} ${baseX + px * 19},${baseY + py * 19} ${baseX - px * 19},${baseY - py * 19}`} strokeWidth={7} />
    </g>
  );
}

export default function ArrowEscape({ level, paused, onWin, onLose }: GameProps) {
  const { n, pieces, stones } = useMemo(() => generate(level), [level]);
  const { timed } = params(level);
  const totalTime = Math.ceil(pieces.length * 1.35) + 10;

  const [gone, setGone] = useState<boolean[]>(() => pieces.map(() => false));
  const [hearts, setHearts] = useState(3);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [elapsed, setElapsed] = useState(0);
  const doneRef = useRef(false);
  const busy = useRef(new Set<number>());
  const wraps = useRef<(HTMLDivElement | null)[]>([]);
  const stoneEls = useRef<Map<number, HTMLDivElement>>(new Map());
  const boardRef = useRef<HTMLDivElement>(null);

  const left = gone.filter((g) => !g).length;
  const stoneSet = useMemo(() => new Set(stones), [stones]);

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => {
      if (doneRef.current) return;
      setElapsed((e) => e + 1);
      if (timed) setTimeLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [timed, paused]);

  useEffect(() => {
    if (!timed || doneRef.current) return;
    if (timeLeft === 0) {
      doneRef.current = true;
      onLose("Time's up! The clock beat you this round.");
    } else if (timeLeft <= 10) sfx.tick();
  }, [timed, timeLeft, onLose]);

  function tap(p: Piece) {
    if (doneRef.current || paused || gone[p.id] || busy.current.has(p.id)) return;
    const occ = new Array<number>(n * n).fill(-1);
    pieces.forEach((q) => {
      if (!gone[q.id]) for (const [r, c] of q.cells) occ[r * n + c] = q.id;
    });
    let [r, c] = p.cells[0];
    let free = 0;
    let hit: { id: number | "stone"; cell: number } | null = null;
    r += DR[p.dir];
    c += DC[p.dir];
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
      free++;
      r += DR[p.dir];
      c += DC[p.dir];
    }
    const el = wraps.current[p.id];
    const L = p.cells.length;
    const axis = p.dir === 1 || p.dir === 3 ? "x" : "y";
    const sign = p.dir === 1 || p.dir === 2 ? 1 : -1;

    if (hit) {
      busy.current.add(p.id);
      sfx.whoosh();
      const pct = ((free + 0.22) / L) * 100;
      const dur = 0.2 + free * 0.045 + 0.22;
      if (el) void animate(el, { [axis]: ["0%", `${sign * pct}%`, "0%"] }, { duration: dur, times: [0, 0.5, 1], ease: ["easeIn", "easeOut"] });
      // unlock on a timer rather than the animation promise, which never settles if frames are paused
      window.setTimeout(() => busy.current.delete(p.id), dur * 1000 + 50);
      window.setTimeout(() => {
        sfx.thud();
        sfx.error();
        const target = hit!.id === "stone" ? stoneEls.current.get(hit!.cell) : wraps.current[hit!.id as number];
        shake(target ?? null, 5, 300);
        const pt = center(target ?? null);
        if (pt) burst(pt[0], pt[1], { colors: ["#fb7185", "#fda4af", "#fff"], count: 14, speed: 220, size: 4 });
        shake(boardRef.current, 4, 260);
      }, (0.2 + free * 0.045) * 1000);
      const h = hearts - 1;
      setHearts(h);
      if (h <= 0) {
        doneRef.current = true;
        window.setTimeout(() => onLose("Out of hearts — that arrow was blocked."), 700);
      }
      return;
    }

    const next = gone.slice();
    next[p.id] = true;
    setGone(next);
    sfx.whoosh();
    sfx.pop(Math.min(12, Math.floor((pieces.length - left) / 2)));
    burstAt(el, { colors: [DIR_COLOR[p.dir], "#fff"], count: 10, speed: 160, size: 4, ring: false });
    if (el) {
      const dist = ((free + 1 + n) / L) * 100;
      void animate(el, { [axis]: `${sign * dist}%` }, { duration: 0.5 + free * 0.02, ease: [0.55, 0, 0.9, 0.5] });
      void animate(el, { opacity: 0 }, { delay: 0.28, duration: 0.25 });
    }
    if (next.every(Boolean)) {
      doneRef.current = true;
      window.setTimeout(() => {
        sfx.clear();
        burstAt(boardRef.current, { colors: [...DIR_COLOR, "#fff"], count: 40, speed: 420, size: 6, kind: "star" });
      }, 350);
      const mistakes = 3 - hearts;
      window.setTimeout(
        () =>
          onWin(hearts, [
            { label: "Arrows freed", value: String(pieces.length) },
            { label: "Mistakes", value: String(mistakes) },
            { label: "Time", value: formatTime(elapsed) },
          ]),
        900,
      );
    }
  }

  const cellPct = 100 / n;

  return (
    <div className="flex w-full flex-col items-center">
      <Hud>
        <Hearts left={hearts} />
        <Stat icon="target" label="Arrows" value={left} />
        {timed ? (
          <Stat icon="clock" label="Time" value={formatTime(timeLeft)} tone={timeLeft <= 10 ? "warn" : "default"} />
        ) : (
          <Stat icon="clock" label="Time" value={formatTime(elapsed)} />
        )}
      </Hud>

      <div ref={boardRef} className="board w-full max-w-[min(92vw,560px)] p-2.5 sm:p-3.5">
        <div className="relative aspect-square w-full overflow-hidden rounded-[18px]">
          {Array.from({ length: n * n }, (_, i) => (
            <div
              key={`slot${i}`}
              className="slot absolute"
              style={{
                left: `calc(${(i % n) * cellPct}% + 2px)`,
                top: `calc(${Math.floor(i / n) * cellPct}% + 2px)`,
                width: `calc(${cellPct}% - 4px)`,
                height: `calc(${cellPct}% - 4px)`,
              }}
            />
          ))}

          {stones.map((i) => (
            <div
              key={`s${i}`}
              ref={(el) => {
                if (el) stoneEls.current.set(i, el);
              }}
              className="absolute"
              style={{ left: `${(i % n) * cellPct}%`, top: `${Math.floor(i / n) * cellPct}%`, width: `${cellPct}%`, height: `${cellPct}%` }}
            >
              <div
                className="tile3d absolute inset-[3px] overflow-hidden"
                style={{ background: "linear-gradient(160deg,#94a3b8,#475569 60%,#334155)", ["--edge" as string]: "#1e293b", borderRadius: 12 }}
              >
                <svg viewBox="0 0 40 40" className="h-full w-full opacity-40">
                  <path d="M8 12l7 4-2 7 8 3M28 8l-3 8 6 5M14 30l6-3 8 5" stroke="#1e293b" strokeWidth={1.6} fill="none" />
                </svg>
              </div>
            </div>
          ))}

          {pieces.map((p) => {
            const rows = p.cells.map((x) => x[0]);
            const cols = p.cells.map((x) => x[1]);
            const minR = Math.min(...rows);
            const minC = Math.min(...cols);
            const h = Math.max(...rows) - minR + 1;
            const w = Math.max(...cols) - minC + 1;
            const isGone = gone[p.id];
            return (
              <div
                key={p.id}
                ref={(el) => {
                  wraps.current[p.id] = el;
                }}
                className="absolute"
                style={{
                  left: `${minC * cellPct}%`,
                  top: `${minR * cellPct}%`,
                  width: `${w * cellPct}%`,
                  height: `${h * cellPct}%`,
                  pointerEvents: isGone ? "none" : undefined,
                  zIndex: isGone ? 5 : 1,
                }}
              >
                <motion.button
                  type="button"
                  aria-label={`Arrow pointing ${DIR_NAME[p.dir]}`}
                  onClick={() => tap(p)}
                  disabled={isGone}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 20, delay: Math.min(0.6, (minR + minC) * 0.025) }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  className="absolute inset-[3px] focus:outline-none"
                >
                  <span
                    className="tile3d block h-full w-full"
                    style={{
                      background: `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 45%), linear-gradient(160deg, ${DIR_COLOR[p.dir]}, ${DIR_DARK[p.dir]})`,
                      ["--edge" as string]: `color-mix(in oklab, ${DIR_DARK[p.dir]} 70%, black)`,
                      borderRadius: 14,
                    }}
                  >
                    <svg viewBox={`0 0 ${w * 100} ${h * 100}`} className="h-full w-full drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">
                      <ArrowGlyph piece={p} minR={minR} minC={minC} />
                    </svg>
                  </span>
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-5 max-w-md text-center text-sm text-white/55">Tap an arrow whose path is clear. Crashes cost a heart.</p>
    </div>
  );
}
