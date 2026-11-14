"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { levelRng, shuffle } from "@/lib/rng";
import { sfx } from "@/lib/sfx";
import { burstAt, shake } from "@/lib/fx";
import { Hearts, Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

type Mode = "together" | "sequence" | "reverse";
const TABLE: [number, number, Mode][] = [
  [3, 3, "together"], [3, 4, "together"], [4, 4, "together"], [4, 5, "together"], [4, 6, "together"], [5, 7, "together"], [5, 8, "together"],
  [3, 4, "sequence"], [3, 5, "sequence"], [3, 6, "sequence"], [4, 6, "sequence"], [4, 7, "sequence"], [4, 8, "sequence"], [4, 9, "sequence"],
  [3, 4, "reverse"], [3, 5, "reverse"], [4, 5, "reverse"], [4, 6, "reverse"], [4, 7, "reverse"], [5, 8, "reverse"],
];
const ROUNDS = 3;
type Phase = "show" | "input" | "success" | "fail";

export default function PatternRecall({ level, paused, onWin, onLose }: GameProps) {
  const [n, count, mode] = TABLE[level - 1] ?? TABLE[TABLE.length - 1];
  const [round, setRound] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [phase, setPhase] = useState<Phase>("show");
  const [lit, setLit] = useState<number[]>([]);
  const [taps, setTaps] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const pads = useRef<(HTMLButtonElement | null)[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  const pattern = useMemo(() => {
    const rng = levelRng("pattern-recall", level, `${round}-${attempt}`);
    return shuffle(rng, Array.from({ length: n * n }, (_, i) => i)).slice(0, count);
  }, [level, round, attempt, n, count]);
  const expected = mode === "reverse" ? [...pattern].reverse() : pattern;

  useEffect(() => {
    if (paused || phase !== "show") return;
    const ts: number[] = [];
    const at = (ms: number, fn: () => void) => ts.push(window.setTimeout(fn, ms));
    const lead = 800;
    if (mode === "together") {
      const hold = Math.max(650, 900 + count * 170 - level * 25);
      at(lead, () => {
        setLit(pattern);
        pattern.forEach((p, i) => window.setTimeout(() => sfx.note(p % 11), i * 40));
      });
      at(lead + hold, () => {
        setLit([]);
        setPhase("input");
      });
    } else {
      const step = Math.max(400, 680 - level * 12);
      pattern.forEach((cell, k) => {
        at(lead + k * step, () => {
          setLit([cell]);
          sfx.note(cell % 11);
        });
        at(lead + k * step + step * 0.65, () => setLit([]));
      });
      at(lead + count * step, () => setPhase("input"));
    }
    return () => ts.forEach((t) => window.clearTimeout(t));
  }, [pattern, mode, count, level, paused, phase]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  function tap(i: number) {
    if (phase !== "input" || paused) return;
    let ok: boolean;
    if (mode === "together") {
      if (taps.includes(i)) return;
      ok = pattern.includes(i);
    } else ok = expected[taps.length] === i;

    if (ok) {
      sfx.note(i % 11);
      const next = [...taps, i];
      setTaps(next);
      setLit([i]);
      later(() => setLit((l) => (l.length === 1 && l[0] === i ? [] : l)), 180);
      if (next.length === count) {
        setPhase("success");
        later(() => {
          sfx.match(round * 3);
          burstAt(boardRef.current, { colors: ["#34d399", "#22d3ee", "#fff"], count: 26, speed: 320, kind: "star" });
        }, 150);
        later(() => {
          if (round + 1 >= ROUNDS) {
            onWin(hearts, [
              { label: "Rounds", value: `${ROUNDS}/${ROUNDS}` },
              { label: "Hearts left", value: String(hearts) },
              { label: "Pattern length", value: String(count) },
            ]);
          } else {
            setTaps([]);
            setPhase("show");
            setRound(round + 1);
          }
        }, 1000);
      }
      return;
    }

    sfx.error();
    shake(boardRef.current, 7);
    const h = hearts - 1;
    setHearts(h);
    setWrong(i);
    setPhase("fail");
    later(() => {
      if (h <= 0) {
        onLose("Out of hearts. Watch the pads closely and try again!");
        return;
      }
      setWrong(null);
      setTaps([]);
      setPhase("show");
      setAttempt(attempt + 1);
    }, 1700);
  }

  const status =
    phase === "show" ? "WATCH" : phase === "success" ? "PERFECT!" : phase === "fail" ? "OOPS!" : mode === "together" ? `TAP ALL ${count}` : mode === "sequence" ? "YOUR TURN" : "REVERSE IT!";

  return (
    <div className="flex w-full flex-col items-center">
      <Hud>
        <Hearts left={hearts} />
        <div className="panel flex h-10 items-center gap-2 rounded-2xl px-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Round</span>
          {Array.from({ length: ROUNDS }, (_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full transition-all ${i < round || (i === round && phase === "success") ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : i === round ? "bg-white/70" : "bg-white/15"}`}
            />
          ))}
        </div>
        <Stat icon="grid" label="Pads" value={count} />
      </Hud>

      <div className="mb-4 h-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ scale: 0.4, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.6, opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className={`title-pop rounded-2xl px-5 py-1.5 text-2xl tracking-wide ${phase === "fail" ? "text-rose-300" : phase === "input" ? "text-cyan-200" : ""}`}
          >
            {status}
          </motion.div>
        </AnimatePresence>
      </div>

      <div ref={boardRef} className="board w-full max-w-[min(92vw,460px)] p-3 sm:p-4">
        <div className="grid gap-2.5 sm:gap-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {Array.from({ length: n * n }, (_, i) => {
            const hue = (i * 137) % 360;
            const isLit = lit.includes(i);
            const tapIdx = taps.indexOf(i);
            const isWrong = wrong === i;
            const reveal = phase === "fail" && expected.includes(i) && tapIdx < 0;
            return (
              <motion.button
                key={i}
                ref={(el) => {
                  pads.current[i] = el;
                }}
                type="button"
                aria-label={`Pad ${i + 1}`}
                onClick={() => tap(i)}
                animate={{ scale: isLit ? 1.06 : 1 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 600, damping: 20 }}
                className="relative flex aspect-square items-center justify-center rounded-2xl font-display text-lg font-bold text-white"
                style={{
                  background: isWrong
                    ? "linear-gradient(160deg,#fb7185,#be123c)"
                    : isLit
                      ? `radial-gradient(circle at 35% 30%, #fff 0 10%, hsl(${hue} 95% 70%) 45%, hsl(${hue} 90% 45%))`
                      : `linear-gradient(160deg, hsl(${hue} 45% 26%), hsl(${hue} 50% 14%))`,
                  boxShadow: isLit
                    ? `0 0 30px 6px hsl(${hue} 95% 60% / 0.7), inset 0 2px 0 rgba(255,255,255,0.6), 0 4px 0 hsl(${hue} 80% 25%)`
                    : `inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -4px 0 rgba(0,0,0,0.3), 0 5px 0 hsl(${hue} 50% 8%), 0 10px 16px -8px rgba(0,0,0,0.7)`,
                  transition: "background 120ms, box-shadow 120ms",
                }}
              >
                {tapIdx >= 0 && !isLit && <span className="absolute inset-0 rounded-2xl ring-2 ring-emerald-300/80" />}
                {mode !== "together" && tapIdx >= 0 && <span className="relative drop-shadow">{tapIdx + 1}</span>}
                {reveal && (
                  <span className="absolute inset-1 flex items-center justify-center rounded-xl border-2 border-dashed border-emerald-300/80 text-emerald-200">
                    {mode !== "together" ? expected.indexOf(i) + 1 : "•"}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
