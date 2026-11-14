"use client";

import { animate, AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { levelRng, shuffle } from "@/lib/rng";
import { sfx } from "@/lib/sfx";
import { burstAt, shake } from "@/lib/fx";
import { GameButton, Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

const PALETTE = ["#ef4444", "#f97316", "#facc15", "#84cc16", "#16a34a", "#14b8a6", "#38bdf8", "#2563eb", "#8b5cf6", "#ec4899", "#f1f5f9", "#92400e"];

// [colours, capacity, mystery]
const TABLE: [number, number, boolean][] = [
  [3, 4, false], [3, 4, false], [4, 4, false], [4, 4, false], [5, 4, false], [5, 4, false], [6, 4, false], [7, 4, false],
  [5, 4, true], [6, 4, true], [6, 4, true], [7, 4, true], [7, 4, true], [8, 4, true], [9, 4, true],
  [6, 5, false], [7, 5, false], [8, 5, false], [8, 5, false], [9, 5, true], [9, 5, true], [10, 5, true], [11, 5, true], [12, 5, true],
];
const EMPTY_TUBES = 2;

/** Waits for an animation, but never longer than `ms` (e.g. when the tab is hidden and frames pause). */
const settle = (p: { then: (done: () => void) => unknown }, ms: number) =>
  new Promise<void>((resolve) => {
    p.then(() => resolve());
    window.setTimeout(resolve, ms);
  });

type Tubes = number[][];

const isDone = (tube: number[], cap: number) => tube.length === 0 || (tube.length === cap && tube.every((v) => v === tube[0]));
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
export function solve(start: Tubes, cap: number, budget = 120000): number | null {
  const seen = new Set<string>();
  let nodes = 0;
  let aborted = false;
  const t = start.map((x) => x.slice());
  const key = () => t.map((x) => x.join(".")).sort().join("|");
  function dfs(depth: number): number | null {
    if (t.every((x) => isDone(x, cap))) return depth;
    if (aborted || depth > 300) return null;
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
      if (run === src.length && src.length === cap) continue;
      let usedEmpty = false;
      for (let j = 0; j < t.length; j++) {
        if (!canPour(t, i, j, cap)) continue;
        const dst = t[j];
        if (!dst.length) {
          if (run === src.length || usedEmpty) continue;
          usedEmpty = true;
        }
        moves.push([i, j, Math.min(run, cap - dst.length), dst.length ? 0 : 1]);
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

export function generate(level: number) {
  const [colors, cap, mystery] = TABLE[level - 1] ?? TABLE[TABLE.length - 1];
  for (let salt = 0; salt < 60; salt++) {
    const rng = levelRng("color-sort", level, salt);
    const palette = shuffle(rng, PALETTE.map((_, i) => i)).slice(0, colors);
    const units = shuffle(rng, Array.from({ length: colors * cap }, (_, i) => palette[Math.floor(i / cap)]));
    const tubes: Tubes = [];
    for (let c = 0; c < colors; c++) tubes.push(units.slice(c * cap, c * cap + cap));
    if (tubes.some((x) => isDone(x, cap) || topRun(x) >= cap - 1)) continue;
    for (let e = 0; e < EMPTY_TUBES; e++) tubes.push([]);
    const len = solve(tubes, cap);
    if (len === null) continue;
    const runs = tubes.reduce((n, x) => n + x.filter((v, i) => i === 0 || x[i - 1] !== v).length, 0);
    const lower = runs - colors;
    const par = Math.max(lower, Math.min(len, Math.ceil(lower * 1.3) + 2));
    const hidden = tubes.map((x) => x.map((_, i) => mystery && i < x.length - 1));
    return { tubes, hidden, cap, par, colors };
  }
  throw new Error("Could not generate Color Sort level");
}

function Tube({
  tube,
  hidden,
  cap,
  layerH,
  selected,
  complete,
}: {
  tube: number[];
  hidden: boolean[];
  cap: number;
  layerH: number;
  selected: boolean;
  complete: boolean;
}) {
  return (
    <motion.div
      animate={{ y: selected ? -26 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className="relative"
    >
      <AnimatePresence>
        {complete && (
          <motion.span
            key="cork"
            className="absolute -top-4 left-1/2 z-10 h-5 w-[78%] -translate-x-1/2 rounded-md"
            style={{ background: "linear-gradient(180deg,#d6a35c,#8a5a24)", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.4), 0 3px 0 #5b3a14" }}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 14 }}
          />
        )}
      </AnimatePresence>
      <div
        className="relative flex w-11 flex-col-reverse overflow-hidden rounded-b-[24px] rounded-t-[8px] px-[5px] pb-[5px] sm:w-[52px]"
        style={{
          height: cap * layerH + 20,
          background: "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.03) 70%, rgba(255,255,255,0.1))",
          border: `2px solid ${selected ? "rgba(125,211,252,0.95)" : complete ? "rgba(110,231,183,0.8)" : "rgba(255,255,255,0.38)"}`,
          boxShadow: selected ? "0 0 26px rgba(56,189,248,0.6)" : complete ? "0 0 20px rgba(52,211,153,0.4)" : "0 10px 20px -10px rgba(0,0,0,0.8)",
        }}
      >
        <AnimatePresence initial={false}>
          {tube.map((c, li) => {
            const isHidden = hidden[li];
            const isTop = li === tube.length - 1;
            return (
              <motion.div
                key={li}
                initial={{ height: 0 }}
                animate={{ height: layerH }}
                exit={{ height: 0 }}
                transition={{ duration: 0.42, ease: "easeInOut" }}
                className={`relative w-full shrink-0 ${li === 0 ? "rounded-b-[19px]" : ""}`}
                style={{
                  background: isHidden ? "linear-gradient(90deg,#3f4566,#272c47 60%,#1c2038)" : `linear-gradient(90deg, color-mix(in oklab, ${PALETTE[c]} 70%, white), ${PALETTE[c]} 40%, color-mix(in oklab, ${PALETTE[c]} 75%, black))`,
                }}
              >
                {isTop && !isHidden && (
                  <span className="absolute -top-[3px] left-0 h-[6px] w-full rounded-[50%]" style={{ background: `color-mix(in oklab, ${PALETTE[c]} 55%, white)` }} />
                )}
                {isHidden && <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-white/40">?</span>}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <span className="pointer-events-none absolute left-[6px] top-[10px] h-[70%] w-[5px] rounded-full bg-white/35" />
      </div>
    </motion.div>
  );
}

export default function ColorSort({ level, onWin }: GameProps) {
  const init = useMemo(() => generate(level), [level]);
  const { cap, par } = init;
  const [tubes, setTubes] = useState<Tubes>(() => init.tubes.map((x) => x.slice()));
  const [hidden, setHidden] = useState<boolean[][]>(() => init.hidden.map((x) => x.slice()));
  const [history, setHistory] = useState<{ tubes: Tubes; hidden: boolean[][] }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [stream, setStream] = useState<{ x: number; y: number; h: number; color: string } | null>(null);
  const busy = useRef(false);
  const doneRef = useRef(false);
  const wraps = useRef<(HTMLDivElement | null)[]>([]);

  const layerH = cap === 5 ? 30 : 36;
  const wasComplete = (t: number[]) => t.length === cap && isDone(t, cap);

  async function pour(from: number, to: number) {
    busy.current = true;
    setSelected(null);
    const srcEl = wraps.current[from];
    const dstEl = wraps.current[to];
    const amount = Math.min(topRun(tubes[from]), cap - tubes[to].length);
    const color = PALETTE[tubes[from][tubes[from].length - 1]];
    const next = tubes.map((x) => x.slice());
    const nextHidden = hidden.map((x) => x.slice());
    for (let a = 0; a < amount; a++) {
      next[to].push(next[from].pop()!);
      nextHidden[from].pop();
      nextHidden[to].push(false);
    }
    if (nextHidden[from].length) nextHidden[from][nextHidden[from].length - 1] = false;

    if (srcEl && dstEl) {
      const s = srcEl.getBoundingClientRect();
      const d = dstEl.getBoundingClientRect();
      const side = s.left < d.left ? 1 : -1;
      const pivotX = d.left + d.width / 2 - side * 8;
      const pivotY = d.top - 22;
      const dx = pivotX - (s.left + s.width / 2);
      const dy = pivotY - s.top;
      srcEl.style.zIndex = "30";
      await settle(animate(srcEl, { x: dx, y: dy, rotate: side * 72 }, { duration: 0.34, ease: [0.3, 0.7, 0.4, 1] }), 600);
      const surface = d.bottom - 7 - (tubes[to].length + amount) * layerH;
      setStream({ x: pivotX, y: pivotY + 4, h: Math.max(10, surface - pivotY), color });
      sfx.pour();
      setTubes(next);
      setHidden(nextHidden);
      await new Promise((r) => window.setTimeout(r, 480));
      setStream(null);
      await settle(animate(srcEl, { x: 0, y: 0, rotate: 0 }, { duration: 0.3, ease: "easeOut" }), 550);
      srcEl.style.zIndex = "";
    } else {
      setTubes(next);
      setHidden(nextHidden);
    }
    setHistory((h) => [...h, { tubes, hidden }]);
    const m = moves + 1;
    setMoves(m);
    if (!wasComplete(tubes[to]) && wasComplete(next[to])) {
      sfx.coin();
      burstAt(dstEl, { colors: [color, "#fff"], count: 18, speed: 240, kind: "star" });
    }
    busy.current = false;
    if (next.every((x) => isDone(x, cap))) {
      doneRef.current = true;
      sfx.clear();
      const stars = m <= par ? 3 : m <= Math.ceil(par * 1.4) ? 2 : 1;
      window.setTimeout(
        () =>
          onWin(stars, [
            { label: "Moves", value: String(m) },
            { label: "Par", value: String(par) },
            { label: "Colours", value: String(init.colors) },
          ]),
        600,
      );
    }
  }

  function tapTube(i: number) {
    if (doneRef.current || busy.current) return;
    if (selected === null) {
      if (tubes[i].length && !wasComplete(tubes[i])) {
        sfx.select();
        setSelected(i);
      }
      return;
    }
    if (selected === i) {
      sfx.click(-4);
      setSelected(null);
      return;
    }
    if (!canPour(tubes, selected, i, cap)) {
      sfx.error();
      shake(wraps.current[i], 6, 320);
      setSelected(tubes[i].length && !wasComplete(tubes[i]) ? i : null);
      return;
    }
    void pour(selected, i);
  }

  function undo() {
    if (!history.length || doneRef.current || busy.current) return;
    const prev = history[history.length - 1];
    setTubes(prev.tubes);
    setHidden((h) => prev.tubes.map((tube, ti) => tube.map((_, li) => (li < tube.length - 1 ? Boolean(h[ti]?.[li]) && prev.hidden[ti][li] : false))));
    setHistory(history.slice(0, -1));
    setSelected(null);
    setMoves(moves + 1);
  }

  const perRow = tubes.length > 9 ? Math.ceil(tubes.length / 2) : tubes.length;

  return (
    <div className="flex w-full flex-col items-center">
      <Hud>
        <Stat icon="moves" label="Moves" value={moves} />
        <Stat icon="target" label="Par" value={par} tone={moves > par ? "warn" : "good"} />
        <GameButton onClick={undo} disabled={!history.length} icon="undo">
          Undo
        </GameButton>
      </Hud>
      <p className="-mt-2 mb-6 text-xs text-white/45">Undo counts as a move</p>

      <div className="board w-full max-w-[min(94vw,720px)] px-3 pb-6 pt-10 sm:px-6">
        <div className="mx-auto flex flex-wrap items-end justify-center gap-x-3 gap-y-12 sm:gap-x-5" style={{ maxWidth: perRow * 76 }}>
          {tubes.map((tube, i) => (
            <div
              key={i}
              ref={(el) => {
                wraps.current[i] = el;
              }}
              className="relative"
              style={{ transformOrigin: "50% 0%" }}
            >
              <button type="button" aria-label={`Tube ${i + 1}`} onClick={() => tapTube(i)} className="block focus:outline-none">
                <Tube tube={tube} hidden={hidden[i]} cap={cap} layerH={layerH} selected={selected === i} complete={wasComplete(tube)} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {stream && (
          <motion.span
            key="stream"
            className="pointer-events-none fixed z-40 w-[7px] rounded-full"
            style={{ left: stream.x - 3.5, top: stream.y, height: stream.h, background: `linear-gradient(180deg, ${stream.color}, color-mix(in oklab, ${stream.color} 70%, white))`, transformOrigin: "50% 0%", boxShadow: `0 0 10px ${stream.color}` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            exit={{ scaleY: 0, y: stream.h, opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
