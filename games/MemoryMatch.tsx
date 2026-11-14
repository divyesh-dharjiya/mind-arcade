"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { levelRng, shuffle } from "@/lib/rng";
import { Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

const FACES = [
  "🍎", "🍋", "🍇", "🍉", "🍓", "🥝", "🍍", "🥥", "🌵", "🌸", "🌻", "🍀", "🐙", "🦊", "🐼",
  "🐸", "🦋", "🐢", "⭐", "🌙", "⚡", "🔥", "❄️", "🎈", "🎲", "🎯", "🚀", "⚓", "🎸", "🍄",
];

// [groups, groupSize, columns, shifting]
const TABLE: [number, 2 | 3, number, boolean][] = [
  [3, 2, 3, false], [4, 2, 4, false], [6, 2, 4, false], [8, 2, 4, false], [10, 2, 5, false],
  [6, 2, 4, true], [8, 2, 4, true], [10, 2, 5, true], [12, 2, 6, true], [15, 2, 6, true],
  [4, 3, 4, false], [5, 3, 5, false], [6, 3, 6, true], [8, 3, 6, true], [10, 3, 6, true],
];

type CardState = "down" | "up" | "matched";
interface Card {
  uid: number;
  face: number;
  state: CardState;
}

function setup(level: number) {
  const [groups, size, cols, shifting] = TABLE[level - 1] ?? TABLE[TABLE.length - 1];
  const rng = levelRng("memory-match", level);
  const faces = shuffle(rng, FACES.map((_, i) => i)).slice(0, groups);
  const deck: Card[] = shuffle(
    rng,
    faces.flatMap((f) => Array.from({ length: size }, () => f)),
  ).map((face, uid) => ({ uid, face, state: "down" as CardState }));
  return { groups, size, cols, shifting, deck };
}

export default function MemoryMatch({ level, onWin }: GameProps) {
  const init = useMemo(() => setup(level), [level]);
  const { groups, size, cols, shifting } = init;
  const [cards, setCards] = useState<Card[]>(() => init.deck.map((c) => ({ ...c })));
  const [open, setOpen] = useState<number[]>([]);
  const [lock, setLock] = useState(false);
  const [turns, setTurns] = useState(0);
  const [misses, setMisses] = useState(0);
  const [swapFx, setSwapFx] = useState<[number, number] | null>(null);
  const doneRef = useRef(false);
  const timers = useRef<number[]>([]);
  const rngRef = useRef(levelRng("memory-match-shift", level));

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const allowance = shifting ? 2 : 0;
  const k = size === 3 ? 1.5 : 1;
  const threeStar = Math.ceil(groups * 0.8 * k) + allowance;
  const twoStar = Math.ceil(groups * 1.6 * k) + allowance * 2;

  function flip(i: number) {
    if (lock || doneRef.current || cards[i].state !== "down") return;
    const next = cards.map((c) => ({ ...c }));
    next[i].state = "up";
    const opened = [...open, i];
    const first = next[opened[0]].face;

    if (next[i].face !== first) {
      setCards(next);
      setOpen([]);
      setLock(true);
      setTurns((t) => t + 1);
      setMisses((m) => m + 1);
      // Board is locked until this fires, so `next` is still the current state.
      later(() => {
        const after = next.map((c, idx) => (opened.includes(idx) ? { ...c, state: "down" as CardState } : c));
        if (shifting) {
          // Skip the cards that are mid flip-back so their new faces never show.
          const down = after
            .map((c, idx) => (c.state === "down" && !opened.includes(idx) ? idx : -1))
            .filter((x) => x >= 0);
          if (down.length >= 2) {
            const [a, b] = shuffle(rngRef.current, down).slice(0, 2);
            const tmp = after[a];
            after[a] = after[b];
            after[b] = tmp;
            setSwapFx([a, b]);
            later(() => setSwapFx(null), 1300);
          }
        }
        setCards(after);
        setLock(false);
      }, 850);
      return;
    }

    if (opened.length === size) {
      opened.forEach((idx) => (next[idx].state = "matched"));
      setCards(next);
      setOpen([]);
      setTurns((t) => t + 1);
      if (next.every((c) => c.state === "matched")) {
        doneRef.current = true;
        const stars = misses <= threeStar ? 3 : misses <= twoStar ? 2 : 1;
        later(() => onWin(stars), 600);
      }
      return;
    }

    setCards(next);
    setOpen(opened);
  }

  const matchedGroups = cards.filter((c) => c.state === "matched").length / size;

  return (
    <div className="flex flex-col items-center">
      <Hud>
        <Stat label="Found" value={`${matchedGroups}/${groups}`} />
        <Stat label="Turns" value={turns} />
        <Stat label="Misses" value={misses} tone={misses > threeStar ? "warn" : "default"} />
        <Stat label="3★ if misses ≤" value={threeStar} />
      </Hud>
      {size === 3 && (
        <p className="-mt-2 mb-3 text-xs text-pink-300">Triples: find all 3 matching cards in one turn.</p>
      )}

      <div
        className="grid w-full gap-2 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, maxWidth: cols * 100 }}
      >
        {cards.map((c, i) => {
          const shown = c.state !== "down";
          const swapped = swapFx?.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => flip(i)}
              aria-label={shown ? `Card ${FACES[c.face]}` : "Hidden card"}
              className="card3d aspect-[3/4] w-full"
            >
              <span className={`card-inner ${shown ? "is-flipped" : ""}`}>
                <span
                  className={`card-face card-back rounded-2xl border ${swapped ? "border-amber-300 animate-blink" : "border-white/10"}`}
                >
                  {swapped && <span className="text-xl text-amber-200">⇄</span>}
                </span>
                <span
                  className={`card-face card-front rounded-2xl border text-3xl sm:text-4xl ${
                    c.state === "matched"
                      ? "border-emerald-300/60 bg-emerald-400/15"
                      : "border-pink-300/50 bg-slate-800"
                  }`}
                >
                  {FACES[c.face]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
