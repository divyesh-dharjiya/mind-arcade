"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { levelRng, shuffle } from "@/lib/rng";
import { sfx } from "@/lib/sfx";
import { burstAt, floatTextAt, shake } from "@/lib/fx";
import { formatTime, Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

const FACES = [
  "🍎", "🍋", "🍇", "🍉", "🍓", "🥝", "🍍", "🥥", "🌵", "🌸", "🌻", "🍀", "🐙", "🦊", "🐼",
  "🐸", "🦋", "🐢", "⭐", "🌙", "⚡", "🔥", "❄️", "🎈", "🎲", "🎯", "🚀", "⚓", "🎸", "🍄",
];
const HUES = [0, 45, 270, 140, 330, 90, 50, 30, 120, 320, 48, 130, 280, 25, 200, 110, 190, 160, 55, 240, 52, 15, 195, 350, 300, 0, 220, 210, 260, 10];

// [groups, groupSize, columns, shifting, seconds (0 = untimed)]
const TABLE: [number, 2 | 3, number, boolean, number][] = [
  [3, 2, 3, false, 0], [4, 2, 4, false, 0], [6, 2, 4, false, 0], [8, 2, 4, false, 0], [10, 2, 5, false, 0],
  [6, 2, 4, true, 0], [8, 2, 4, true, 0], [10, 2, 5, true, 0], [12, 2, 6, true, 0], [15, 2, 6, true, 0],
  [4, 3, 4, false, 0], [5, 3, 5, false, 0], [6, 3, 6, true, 0], [8, 3, 6, true, 0],
  [8, 2, 4, true, 70], [10, 2, 5, true, 85], [12, 2, 6, true, 100], [8, 3, 6, true, 130],
];

type CardState = "down" | "up" | "matched";
interface Card {
  uid: number;
  face: number;
  state: CardState;
}

export function setup(level: number) {
  const [groups, size, cols, shifting, seconds] = TABLE[level - 1] ?? TABLE[TABLE.length - 1];
  const rng = levelRng("memory-match", level);
  const faces = shuffle(rng, FACES.map((_, i) => i)).slice(0, groups);
  const deck: Card[] = shuffle(rng, faces.flatMap((f) => Array.from({ length: size }, () => f))).map((face, uid) => ({ uid, face, state: "down" as CardState }));
  return { groups, size, cols, shifting, seconds, deck };
}

export default function MemoryMatch({ level, paused, onWin, onLose }: GameProps) {
  const init = useMemo(() => setup(level), [level]);
  const { groups, size, cols, shifting, seconds } = init;
  const [cards, setCards] = useState<Card[]>(() => init.deck.map((c) => ({ ...c })));
  const [open, setOpen] = useState<number[]>([]);
  const [lock, setLock] = useState(false);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [swapped, setSwapped] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(seconds);
  const doneRef = useRef(false);
  const timers = useRef<number[]>([]);
  const rngRef = useRef(levelRng("memory-match-shift", level));
  const els = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    if (!seconds || paused) return;
    const t = window.setInterval(() => {
      if (!doneRef.current) setTimeLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [seconds, paused]);
  useEffect(() => {
    if (!seconds || doneRef.current) return;
    if (timeLeft === 0) {
      doneRef.current = true;
      onLose("Time ran out before you found every set.");
    } else if (timeLeft <= 10) sfx.tick();
  }, [seconds, timeLeft, onLose]);

  const k = size === 3 ? 1.5 : 1;
  const allowance = shifting ? 2 : 0;
  const threeStar = Math.ceil(groups * 0.8 * k) + allowance;
  const twoStar = Math.ceil(groups * 1.6 * k) + allowance * 2;

  function flip(uid: number) {
    if (lock || doneRef.current || paused) return;
    const idx = cards.findIndex((c) => c.uid === uid);
    if (idx < 0 || cards[idx].state !== "down") return;
    sfx.flip();
    const next = cards.map((c) => ({ ...c }));
    next[idx].state = "up";
    const opened = [...open, uid];
    const firstFace = next.find((c) => c.uid === opened[0])!.face;

    if (next[idx].face !== firstFace) {
      setCards(next);
      setOpen([]);
      setLock(true);
      setMisses((m) => m + 1);
      setCombo(0);
      later(() => {
        sfx.error();
        opened.forEach((u) => shake(els.current.get(u), 6, 360));
      }, 380);
      later(() => {
        let after = next.map((c) => (opened.includes(c.uid) ? { ...c, state: "down" as CardState } : c));
        if (shifting) {
          const down = after.map((c, i) => (c.state === "down" && !opened.includes(c.uid) ? i : -1)).filter((x) => x >= 0);
          if (down.length >= 2) {
            const [a, b] = shuffle(rngRef.current, down).slice(0, 2);
            after = after.slice();
            [after[a], after[b]] = [after[b], after[a]];
            setSwapped([after[a].uid, after[b].uid]);
            sfx.whoosh();
            later(() => setSwapped([]), 1200);
          }
        }
        setCards(after);
        setLock(false);
      }, 950);
      return;
    }

    if (opened.length === size) {
      for (const c of next) if (opened.includes(c.uid)) c.state = "matched";
      const nc = combo + 1;
      const pts = 100 * nc;
      setCards(next);
      setOpen([]);
      setCombo(nc);
      setBestCombo((b) => Math.max(b, nc));
      setScore((s) => s + pts);
      later(() => {
        sfx.match(nc);
        opened.forEach((u) => burstAt(els.current.get(u), { colors: [`hsl(${HUES[firstFace]} 90% 65%)`, "#fff", "#fde047"], count: 14, speed: 220, kind: "star" }));
        floatTextAt(els.current.get(uid), nc >= 2 ? `Combo x${nc}!` : `+${pts}`, nc >= 2 ? "#fde047" : "#fff", nc >= 2 ? 28 : 24);
      }, 260);
      if (next.every((c) => c.state === "matched")) {
        doneRef.current = true;
        const stars = misses <= threeStar ? 3 : misses <= twoStar ? 2 : 1;
        later(() => sfx.clear(), 700);
        later(
          () =>
            onWin(stars, [
              { label: "Misses", value: `${misses} (3★ ≤ ${threeStar})` },
              { label: "Best combo", value: `x${Math.max(bestCombo, nc)}` },
              { label: "Score", value: String(score + pts) },
            ]),
          1100,
        );
      }
      return;
    }
    setCards(next);
    setOpen(opened);
  }

  const found = cards.filter((c) => c.state === "matched").length / size;

  return (
    <div className="flex w-full flex-col items-center">
      <Hud>
        <Stat icon="check" label="Found" value={`${found}/${groups}`} />
        <Stat icon="close" label="Misses" value={misses} tone={misses > threeStar ? "warn" : "default"} />
        <Stat icon="trophy" label="Score" value={score} />
        {seconds > 0 && <Stat icon="clock" label="Time" value={formatTime(timeLeft)} tone={timeLeft <= 10 ? "warn" : "default"} />}
        {combo >= 2 && <Stat icon="bolt" label="Combo" value={`x${combo}`} tone="good" />}
      </Hud>
      {size === 3 && <p className="-mt-2 mb-3 font-display text-sm font-semibold text-pink-300">Triples — find all 3 in one turn</p>}

      <div className="board w-full p-3 sm:p-4" style={{ maxWidth: `min(94vw, ${cols * 112}px)` }}>
        <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {cards.map((c, i) => {
            const shown = c.state !== "down";
            const isSwapped = swapped.includes(c.uid);
            return (
              <motion.div
                key={c.uid}
                layout
                ref={(el) => {
                  if (el) els.current.set(c.uid, el);
                }}
                initial={{ opacity: 0, scale: 0.3, rotate: -25, y: -60 }}
                animate={{ opacity: 1, scale: c.state === "matched" ? [1, 1.12, 1] : 1, rotate: 0, y: 0 }}
                transition={{
                  layout: { type: "spring", stiffness: 260, damping: 22 },
                  default: { type: "spring", stiffness: 300, damping: 20, delay: c.state === "down" && !shown ? Math.min(i * 0.03, 0.6) : 0 },
                  // springs only support two keyframes; the match "pop" uses three
                  scale: { duration: 0.45, ease: "easeOut", delay: c.state === "down" && !shown ? Math.min(i * 0.03, 0.6) : 0 },
                }}
                className="card3d aspect-[3/4] w-full"
              >
                <button type="button" onClick={() => flip(c.uid)} aria-label={shown ? `Card ${FACES[c.face]}` : "Hidden card"} className="block h-full w-full">
                  <span className={`card-inner ${shown ? "is-flipped" : ""}`}>
                    <span
                      className={`card-face rounded-2xl ${isSwapped ? "ring-4 ring-amber-300" : ""}`}
                      style={{
                        background:
                          "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 40%), repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0 7px, transparent 7px 14px), linear-gradient(145deg, #ec4899, #7c3aed)",
                        boxShadow: "inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -4px 0 rgba(0,0,0,0.25), 0 5px 0 #4c1d95, 0 10px 16px -8px rgba(0,0,0,0.7)",
                      }}
                    >
                      <span className="flex h-[46%] w-[46%] items-center justify-center rounded-full border-2 border-white/40 bg-white/15 text-white/90">
                        {isSwapped ? <span className="font-display text-xl font-bold text-amber-200">⇄</span> : <span className="text-xl">✦</span>}
                      </span>
                    </span>
                    <span
                      className="card-face card-front rounded-2xl"
                      style={{
                        background: c.state === "matched" ? `linear-gradient(160deg, #ffffff, hsl(${HUES[c.face]} 90% 88%))` : "linear-gradient(160deg, #ffffff, #e2e8f0)",
                        boxShadow:
                          c.state === "matched"
                            ? `0 0 0 3px hsl(${HUES[c.face]} 90% 60%), 0 0 24px hsl(${HUES[c.face]} 90% 60% / 0.7), 0 5px 0 #94a3b8`
                            : "inset 0 2px 0 #fff, inset 0 -4px 0 rgba(0,0,0,0.08), 0 5px 0 #94a3b8, 0 10px 16px -8px rgba(0,0,0,0.6)",
                      }}
                    >
                      <span className="flex h-[66%] w-[66%] items-center justify-center rounded-full text-[clamp(1.4rem,5.5vw,2.6rem)]" style={{ background: `hsl(${HUES[c.face]} 90% 60% / 0.18)` }}>
                        {FACES[c.face]}
                      </span>
                    </span>
                  </span>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
