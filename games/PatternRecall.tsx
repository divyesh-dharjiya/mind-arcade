"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { levelRng, shuffle } from "@/lib/rng";
import { Hearts, Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

type Mode = "together" | "sequence" | "reverse";
// [grid size, tiles, mode]
const TABLE: [number, number, Mode][] = [
  [3, 3, "together"], [3, 4, "together"], [4, 4, "together"], [4, 5, "together"],
  [4, 6, "together"], [5, 7, "together"], [5, 8, "together"],
  [3, 3, "sequence"], [3, 4, "sequence"], [3, 5, "sequence"], [4, 5, "sequence"],
  [4, 6, "sequence"], [4, 7, "sequence"], [4, 8, "sequence"],
  [3, 3, "reverse"], [3, 4, "reverse"], [4, 4, "reverse"], [4, 5, "reverse"],
  [4, 6, "reverse"], [5, 7, "reverse"],
];
const ROUNDS = 3;
type Phase = "show" | "input" | "success" | "fail";

export default function PatternRecall({ level, onWin, onLose }: GameProps) {
  const [n, count, mode] = TABLE[level - 1] ?? TABLE[TABLE.length - 1];
  const [round, setRound] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [phase, setPhase] = useState<Phase>("show");
  const [lit, setLit] = useState<number[]>([]);
  const [taps, setTaps] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  const pattern = useMemo(() => {
    const rng = levelRng("pattern-recall", level, `${round}-${attempt}`);
    return shuffle(
      rng,
      Array.from({ length: n * n }, (_, i) => i),
    ).slice(0, count);
  }, [level, round, attempt, n, count]);

  const expected = mode === "reverse" ? [...pattern].reverse() : pattern;

  useEffect(() => {
    const ts: number[] = [];
    const at = (ms: number, fn: () => void) => ts.push(window.setTimeout(fn, ms));
    const lead = 700;
    if (mode === "together") {
      at(lead, () => setLit(pattern));
      at(lead + 900 + count * 200, () => {
        setLit([]);
        setPhase("input");
      });
    } else {
      const step = 640;
      pattern.forEach((cell, k) => {
        at(lead + k * step, () => setLit([cell]));
        at(lead + k * step + 440, () => setLit([]));
      });
      at(lead + count * step, () => setPhase("input"));
    }
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, [pattern, mode, count]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  function tap(i: number) {
    if (phase !== "input") return;
    let ok: boolean;
    if (mode === "together") {
      if (taps.includes(i)) return;
      ok = pattern.includes(i);
    } else {
      ok = expected[taps.length] === i;
    }

    if (ok) {
      const next = [...taps, i];
      setTaps(next);
      if (next.length === count) {
        setPhase("success");
        later(() => {
          if (round + 1 >= ROUNDS) {
            onWin(hearts);
          } else {
            setTaps([]);
            setPhase("show");
            setRound(round + 1);
          }
        }, 800);
      }
      return;
    }

    const h = hearts - 1;
    setHearts(h);
    setWrong(i);
    setPhase("fail");
    later(() => {
      if (h <= 0) {
        onLose("Out of hearts. Watch closely and try again!");
        return;
      }
      setWrong(null);
      setTaps([]);
      setPhase("show");
      setAttempt(attempt + 1);
    }, 1600);
  }

  const status =
    phase === "show"
      ? "Watch closely…"
      : phase === "success"
        ? "Perfect!"
        : phase === "fail"
          ? "Not quite — here's the answer"
          : mode === "together"
            ? `Tap the ${count} tiles`
            : mode === "sequence"
              ? "Repeat the order"
              : "Now tap it in REVERSE";

  return (
    <div className="flex flex-col items-center">
      <Hud>
        <Hearts left={hearts} />
        <Stat label="Round" value={`${Math.min(round + 1, ROUNDS)}/${ROUNDS}`} />
        <Stat label="Tiles" value={count} />
      </Hud>

      <div
        className={`mb-4 rounded-full px-4 py-1.5 text-sm font-semibold ${
          phase === "fail"
            ? "bg-rose-500/15 text-rose-200"
            : phase === "success"
              ? "bg-emerald-500/20 text-emerald-200"
              : phase === "input"
                ? "bg-cyan-500/15 text-cyan-200"
                : "bg-white/5 text-slate-300"
        }`}
      >
        {status}
      </div>

      <div
        className="grid w-full max-w-[420px] gap-2 rounded-3xl border border-white/10 bg-slate-950/60 p-3 sm:gap-3 sm:p-4"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: n * n }, (_, i) => {
          const isLit = lit.includes(i);
          const tapIdx = taps.indexOf(i);
          const isTapped = tapIdx >= 0;
          const isWrong = wrong === i;
          const reveal = phase === "fail" && expected.includes(i);
          let cls = "bg-slate-800/80 border-white/5 hover:bg-slate-700/80";
          if (isLit) cls = "bg-gradient-to-br from-emerald-300 to-teal-500 border-emerald-200 shadow-[0_0_28px_rgba(52,211,153,0.6)] scale-[1.03]";
          else if (isWrong) cls = "bg-rose-500/80 border-rose-300 animate-shake";
          else if (isTapped) cls = "bg-emerald-500/40 border-emerald-300/70";
          else if (reveal) cls = "bg-emerald-500/15 border-emerald-300/70 border-dashed";
          return (
            <button
              key={i}
              type="button"
              aria-label={`Tile ${i + 1}`}
              onClick={() => tap(i)}
              className={`relative flex aspect-square items-center justify-center rounded-2xl border text-lg font-bold text-white transition-all duration-150 active:scale-95 ${cls}`}
            >
              {mode !== "together" && isTapped && <span>{tapIdx + 1}</span>}
              {mode !== "together" && reveal && !isTapped && (
                <span className="text-emerald-200/80">{expected.indexOf(i) + 1}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
