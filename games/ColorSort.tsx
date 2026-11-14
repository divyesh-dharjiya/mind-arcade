"use client";

import { useMemo, useRef, useState } from "react";
import { levelRng, shuffle } from "@/lib/rng";
import { GameButton, Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

const PALETTE = [
  "#ef4444", "#f97316", "#facc15", "#84cc16", "#14b8a6",
  "#38bdf8", "#3b82f6", "#8b5cf6", "#ec4899", "#f5f5f4",
];

// [colours, capacity, mystery]
const TABLE: [number, number, boolean][] = [
  [3, 4, false], [3, 4, false], [4, 4, false], [4, 4, false], [5, 4, false], [5, 4, false], [6, 4, false],
  [4, 4, true], [5, 4, true], [6, 4, true], [6, 4, true], [7, 4, true], [8, 4, true],
  [5, 5, false], [6, 5, false], [7, 5, false], [7, 5, false], [8, 5, true], [9, 5, true], [10, 5, true],
];
const EMPTY_TUBES = 2;

type Tubes = number[][];

function isDone(tube: number[], cap: number) {
  return tube.length === 0 || (tube.length === cap && tube.every((v) => v === tube[0]));
}

function topRun(tube: number[]) {
  if (!tube.length) return 0;
  const top = tube[tube.length - 1];
  let run = 1;
  while (run < tube.length && tube[tube.length - 1 - run] === top) run++;
  return run;
}

function canPour(t: Tubes, i: number, j: number, cap: number) {
  if (i === j) return false;
  const src = t[i];
  const dst = t[j];
  if (!src.length || dst.length >= cap) return false;
  return !dst.length || dst[dst.length - 1] === src[src.length - 1];
}

/** Depth-first search with a node budget. Returns a solution length or null. */
function solve(start: Tubes, cap: number, budget = 80000): number | null {
  const seen = new Set<string>();
  let nodes = 0;
  let aborted = false;
  const t = start.map((x) => x.slice());
  const key = () => t.map((x) => x.join(".")).sort().join("|");

  function dfs(depth: number): number | null {
    if (t.every((x) => isDone(x, cap))) return depth;
    if (aborted || depth > 250) return null;
    if (++nodes > budget) {
      aborted = true;
      return null;
    }
    const k = key();
    if (seen.has(k)) return null;
    seen.add(k);

    const moves: [number, number, number, number][] = [];
    for (let i = 0; i < t.length; i++) {
      const src = t[i];
      if (!src.length) continue;
      const run = topRun(src);
      if (run === src.length && src.length === cap) continue; // finished tube
      let usedEmpty = false;
      for (let j = 0; j < t.length; j++) {
        if (!canPour(t, i, j, cap)) continue;
        const dst = t[j];
        if (!dst.length) {
          if (run === src.length || usedEmpty) continue; // pointless or duplicate
          usedEmpty = true;
        }
        const amount = Math.min(run, cap - dst.length);
        moves.push([i, j, amount, dst.length ? 0 : 1]);
      }
    }
    moves.sort((a, b) => a[3] - b[3]);
    for (const [i, j, amount] of moves) {
      for (let a = 0; a < amount; a++) t[j].push(t[i].pop()!);
      const res = dfs(depth + 1);
      for (let a = 0; a < amount; a++) t[i].push(t[j].pop()!);
      if (res !== null) return res;
      if (aborted) return null;
    }
    return null;
  }
  return dfs(0);
}

function generate(level: number) {
  const [colors, cap, mystery] = TABLE[level - 1] ?? TABLE[TABLE.length - 1];
  for (let salt = 0; salt < 40; salt++) {
    const rng = levelRng("color-sort", level, salt);
    const units = shuffle(
      rng,
      Array.from({ length: colors * cap }, (_, i) => Math.floor(i / cap)),
    );
    const tubes: Tubes = [];
    for (let c = 0; c < colors; c++) tubes.push(units.slice(c * cap, c * cap + cap));
    if (tubes.some((x) => isDone(x, cap))) continue;
    for (let e = 0; e < EMPTY_TUBES; e++) tubes.push([]);
    const len = solve(tubes, cap);
    if (len === null) continue;
    const runs = tubes.reduce((n, x) => {
      let r = 0;
      x.forEach((v, i) => {
        if (i === 0 || x[i - 1] !== v) r++;
      });
      return n + r;
    }, 0);
    const lower = runs - colors;
    const par = Math.max(lower, Math.min(len, Math.ceil(lower * 1.35) + 2));
    const hidden = tubes.map((x) => x.map((_, i) => mystery && i < x.length - 1));
    return { tubes, hidden, cap, par, colors, mystery };
  }
  throw new Error("Could not generate Color Sort level");
}

export default function ColorSort({ level, onWin }: GameProps) {
  const init = useMemo(() => generate(level), [level]);
  const { cap, par } = init;
  const [tubes, setTubes] = useState<Tubes>(() => init.tubes.map((x) => x.slice()));
  const [hidden, setHidden] = useState<boolean[][]>(() => init.hidden.map((x) => x.slice()));
  const [history, setHistory] = useState<Tubes[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [shake, setShake] = useState<{ i: number; k: number } | null>(null);
  const doneRef = useRef(false);
  const tick = useRef(0);

  function tapTube(i: number) {
    if (doneRef.current) return;
    if (selected === null) {
      if (tubes[i].length && !(tubes[i].length === cap && isDone(tubes[i], cap))) setSelected(i);
      return;
    }
    if (selected === i) {
      setSelected(null);
      return;
    }
    if (!canPour(tubes, selected, i, cap)) {
      setShake({ i, k: ++tick.current });
      setSelected(tubes[i].length ? i : null);
      return;
    }
    const next = tubes.map((x) => x.slice());
    const nextHidden = hidden.map((x) => x.slice());
    const amount = Math.min(topRun(next[selected]), cap - next[i].length);
    for (let a = 0; a < amount; a++) {
      next[i].push(next[selected].pop()!);
      nextHidden[selected].pop();
      nextHidden[i].push(false);
    }
    const src = nextHidden[selected];
    if (src.length) src[src.length - 1] = false; // reveal new top
    setHistory([...history, tubes]);
    setTubes(next);
    setHidden(nextHidden);
    setSelected(null);
    const m = moves + 1;
    setMoves(m);
    if (next.every((x) => isDone(x, cap))) {
      doneRef.current = true;
      const stars = m <= par ? 3 : m <= Math.ceil(par * 1.4) ? 2 : 1;
      window.setTimeout(() => onWin(stars), 600);
    }
  }

  function undo() {
    if (!history.length || doneRef.current) return;
    const prev = history[history.length - 1];
    setTubes(prev);
    // Revealed layers stay revealed; keep hidden flags aligned with tube lengths.
    setHidden((h) =>
      prev.map((tube, ti) => tube.map((_, li) => (li < tube.length - 1 ? (h[ti][li] ?? false) : false))),
    );
    setHistory(history.slice(0, -1));
    setSelected(null);
    setMoves(moves + 1);
  }

  const layerH = cap === 5 ? 30 : 34;

  return (
    <div className="flex flex-col items-center">
      <Hud>
        <Stat label="Moves" value={moves} />
        <Stat label="Par" value={par} tone={moves > par ? "warn" : "good"} />
        <GameButton onClick={undo} disabled={!history.length}>
          ↶ Undo
        </GameButton>
      </Hud>
      <p className="-mt-1 mb-5 text-xs text-slate-400">Undo counts as a move.</p>

      <div className="flex max-w-[640px] flex-wrap items-end justify-center gap-x-3 gap-y-8 sm:gap-x-5">
        {tubes.map((tube, i) => {
          const complete = tube.length === cap && isDone(tube, cap);
          const isSel = selected === i;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Tube ${i + 1}`}
              onClick={() => tapTube(i)}
              className="group focus:outline-none"
            >
              <span
                key={shake?.i === i ? shake.k : "s"}
                className={`flex w-12 flex-col-reverse overflow-hidden rounded-b-[22px] rounded-t-md border-2 bg-white/5 p-1 transition-transform duration-200 sm:w-14 ${
                  isSel ? "-translate-y-4 border-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.45)]" : complete ? "border-emerald-300/70" : "border-white/25 group-hover:border-white/40"
                } ${shake?.i === i ? "animate-shake" : ""}`}
                style={{ height: cap * layerH + 14 }}
              >
                {tube.map((c, li) => {
                  const isHidden = hidden[i]?.[li];
                  const bottom = li === 0;
                  return (
                    <span
                      key={li}
                      className={`flex w-full shrink-0 items-center justify-center text-sm font-bold ${bottom ? "rounded-b-[18px]" : ""} ${isHidden ? "bg-slate-700 text-slate-400" : ""}`}
                      style={{
                        height: layerH,
                        background: isHidden ? undefined : `linear-gradient(90deg, ${PALETTE[c]}, ${PALETTE[c]}cc)`,
                        boxShadow: isHidden ? "inset 0 0 0 1px rgba(255,255,255,0.06)" : "inset -6px 0 8px rgba(0,0,0,0.15)",
                      }}
                    >
                      {isHidden ? "?" : ""}
                    </span>
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
