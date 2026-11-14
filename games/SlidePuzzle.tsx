"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { levelRng, type Rng } from "@/lib/rng";
import { sfx } from "@/lib/sfx";
import { burstAt } from "@/lib/fx";
import { Hud, Stat } from "@/components/Hud";
import { Icon } from "@/components/ui/Icon";
import type { GameProps } from "./types";

// [size, shuffle steps, show numbers]
const TABLE: [number, number, boolean][] = [
  [3, 12, true], [3, 18, true], [3, 26, true], [3, 34, true],
  [3, 30, false], [3, 40, false], [3, 50, false], [3, 60, false],
  [4, 40, false], [4, 60, false], [4, 80, false], [4, 100, false],
  [5, 80, false], [5, 110, false], [5, 140, false], [5, 170, false],
];

function pal(rng: Rng, list: string[][]) {
  return list[Math.floor(rng() * list.length)];
}

/** Procedural artwork so every level has its own picture. */
export function makePicture(level: number): string {
  const rng = levelRng("slide-art", level);
  const kind = (level - 1) % 6;
  const R = (a: number, b: number) => a + rng() * (b - a);
  let body = "";
  if (kind === 0) {
    const [s1, s2, m1, m2, m3] = pal(rng, [
      ["#ff9a8b", "#ffd36e", "#7c3aed", "#4c1d95", "#2e1065"],
      ["#fbc2eb", "#a6c1ee", "#2563eb", "#1e3a8a", "#172554"],
      ["#f6d365", "#fda085", "#be123c", "#881337", "#4c0519"],
    ]);
    body += `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></linearGradient></defs><rect width="600" height="600" fill="url(#s)"/>`;
    body += `<circle cx="${R(150, 450)}" cy="${R(150, 250)}" r="${R(60, 95)}" fill="#fff7ed" opacity="0.92"/>`;
    for (let i = 0; i < 4; i++) body += `<ellipse cx="${R(0, 600)}" cy="${R(60, 200)}" rx="${R(50, 110)}" ry="${R(14, 26)}" fill="#fff" opacity="0.35"/>`;
    [m1, m2, m3].forEach((c, i) => {
      let d = `M0 600 L0 ${330 + i * 70}`;
      for (let x = 0; x <= 600; x += 75) d += ` L${x} ${R(280, 380) + i * 70 - (x % 150 === 0 ? 60 : 0)}`;
      body += `<path d="${d} L600 600Z" fill="${c}"/>`;
    });
    for (let i = 0; i < 5; i++) {
      const x = R(80, 520);
      const y = R(80, 230);
      body += `<path d="M${x} ${y}q10 -10 20 0q10 -10 20 0" stroke="#3b0764" stroke-width="4" fill="none" opacity="0.6"/>`;
    }
  } else if (kind === 1) {
    body += `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1026"/><stop offset="1" stop-color="#4338ca"/></linearGradient></defs><rect width="600" height="600" fill="url(#s)"/>`;
    for (let i = 0; i < 70; i++) body += `<circle cx="${R(0, 600)}" cy="${R(0, 330)}" r="${R(0.8, 2.6)}" fill="#fff" opacity="${R(0.4, 1)}"/>`;
    body += `<circle cx="${R(380, 520)}" cy="110" r="52" fill="#fef3c7"/><circle cx="${R(400, 540)}" cy="96" r="44" fill="#1e1b4b" opacity="0.35"/>`;
    let x = 0;
    while (x < 600) {
      const w = R(50, 95);
      const h = R(140, 340);
      const hue = Math.floor(R(220, 290));
      body += `<rect x="${x}" y="${600 - h}" width="${w}" height="${h}" fill="hsl(${hue} 45% ${R(12, 22)}%)"/>`;
      for (let wy = 600 - h + 16; wy < 585; wy += 24)
        for (let wx = x + 10; wx < x + w - 12; wx += 18) if (rng() < 0.45) body += `<rect x="${wx}" y="${wy}" width="9" height="12" rx="2" fill="${rng() < 0.7 ? "#fde68a" : "#f9a8d4"}" opacity="0.9"/>`;
      x += w + R(2, 8);
    }
  } else if (kind === 2) {
    body += `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset="0.55" stop-color="#bae6fd"/><stop offset="0.55" stop-color="#0ea5e9"/><stop offset="1" stop-color="#0c4a6e"/></linearGradient></defs><rect width="600" height="600" fill="url(#s)"/>`;
    body += `<circle cx="${R(120, 480)}" cy="${R(120, 200)}" r="70" fill="#fde047"/>`;
    for (let i = 0; i < 6; i++) {
      const y = 340 + i * 45;
      let d = `M0 ${y}`;
      for (let xx = 0; xx <= 600; xx += 50) d += ` Q${xx + 25} ${y - 22} ${xx + 50} ${y}`;
      body += `<path d="${d} L600 600 L0 600Z" fill="hsl(${200 + i * 4} 85% ${48 - i * 5}%)" opacity="0.9"/>`;
    }
    const bx = R(150, 420);
    body += `<path d="M${bx} 330 h120 l-20 34 h-80z" fill="#7c2d12"/><path d="M${bx + 58} 330 V220 l50 100z" fill="#fff"/><path d="M${bx + 52} 330 V240 l-40 80z" fill="#fecaca"/>`;
  } else if (kind === 3) {
    const cols = pal(rng, [
      ["#f43f5e", "#fb923c", "#facc15", "#34d399", "#22d3ee", "#818cf8"],
      ["#a78bfa", "#f472b6", "#fbbf24", "#2dd4bf", "#60a5fa", "#f87171"],
    ]);
    body += `<rect width="600" height="600" fill="#0f172a"/>`;
    for (let i = 9; i > 0; i--) body += `<circle cx="300" cy="300" r="${i * 36}" fill="${cols[i % cols.length]}"/>`;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      body += `<path d="M300 300 L${300 + Math.cos(a) * 420} ${300 + Math.sin(a) * 420} L${300 + Math.cos(a + 0.18) * 420} ${300 + Math.sin(a + 0.18) * 420}Z" fill="#fff" opacity="0.13"/>`;
    }
    for (let i = 0; i < 4; i++) body += `<rect x="${i % 2 ? 0 : 520}" y="${i < 2 ? 0 : 520}" width="80" height="80" fill="${cols[i]}"/>`;
  } else if (kind === 4) {
    body += `<rect width="600" height="600" fill="#0b0723"/>`;
    for (let i = 0; i < 90; i++) body += `<circle cx="${R(0, 600)}" cy="${R(0, 600)}" r="${R(0.6, 2.4)}" fill="#fff" opacity="${R(0.3, 1)}"/>`;
    body += `<defs><radialGradient id="p" cx="35%" cy="30%"><stop offset="0" stop-color="#fda4af"/><stop offset="0.6" stop-color="#e11d48"/><stop offset="1" stop-color="#4c0519"/></radialGradient></defs>`;
    body += `<circle cx="300" cy="300" r="150" fill="url(#p)"/>`;
    body += `<ellipse cx="300" cy="300" rx="260" ry="56" fill="none" stroke="#fde68a" stroke-width="18" opacity="0.85" transform="rotate(-18 300 300)"/>`;
    body += `<path d="M150 300 a150 150 0 0 0 300 0" fill="url(#p)" transform="rotate(-18 300 300)"/>`;
    body += `<circle cx="110" cy="110" r="34" fill="#a5b4fc"/><circle cx="500" cy="490" r="22" fill="#5eead4"/>`;
  } else {
    body += `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bbf7d0"/><stop offset="1" stop-color="#fef9c3"/></linearGradient></defs><rect width="600" height="600" fill="url(#s)"/>`;
    body += `<circle cx="${R(380, 520)}" cy="110" r="60" fill="#fb923c" opacity="0.9"/>`;
    body += `<path d="M0 420 Q150 330 300 410 T600 390 V600 H0z" fill="#22c55e"/><path d="M0 500 Q200 430 400 500 T600 480 V600 H0z" fill="#15803d"/>`;
    for (let i = 0; i < 9; i++) {
      const x = R(20, 580);
      const y = R(380, 520);
      const h = R(90, 170);
      body += `<rect x="${x - 6}" y="${y - 10}" width="12" height="40" fill="#78350f"/><path d="M${x} ${y - h} L${x + h * 0.32} ${y} L${x - h * 0.32} ${y}z" fill="hsl(${R(120, 160)} 60% ${R(22, 34)}%)"/>`;
    }
    for (let i = 0; i < 6; i++) body += `<circle cx="${R(0, 600)}" cy="${R(530, 590)}" r="${R(5, 9)}" fill="${pal(rng, [["#f472b6"], ["#fde047"], ["#fff"]])[0]}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" preserveAspectRatio="none">${body}</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

export function generate(level: number) {
  const [n, steps, numbers] = TABLE[level - 1] ?? TABLE[TABLE.length - 1];
  const target = Array.from({ length: n * n }, (_, i) => (i === n * n - 1 ? 0 : i + 1));
  for (let salt = 0; salt < 20; salt++) {
    const rng = levelRng("slide-puzzle", level, salt);
    const board = target.slice();
    let blank = n * n - 1;
    let prev = -1;
    for (let s = 0; s < steps; s++) {
      const r = Math.floor(blank / n);
      const c = blank % n;
      const opts: number[] = [];
      if (r > 0) opts.push(blank - n);
      if (r < n - 1) opts.push(blank + n);
      if (c > 0) opts.push(blank - 1);
      if (c < n - 1) opts.push(blank + 1);
      const choices = opts.filter((o) => o !== prev);
      const next = choices[Math.floor(rng() * choices.length)];
      board[blank] = board[next];
      board[next] = 0;
      prev = blank;
      blank = next;
    }
    const wrong = board.filter((v, i) => v !== 0 && v !== target[i]).length;
    if (wrong >= Math.min(n * n - 2, 4)) return { n, numbers, target, board, par: steps };
  }
  throw new Error("Could not generate slide puzzle");
}

export default function SlidePuzzle({ level, onWin }: GameProps) {
  const init = useMemo(() => generate(level), [level]);
  const picture = useMemo(() => makePicture(level), [level]);
  const { n, numbers, target, par } = init;
  const [board, setBoard] = useState(() => init.board.slice());
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [peek, setPeek] = useState(false);
  const doneRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const moveTo = useCallback(
    (p: number) => {
      if (doneRef.current) return;
      let b = board.indexOf(0);
      if (p === b || p < 0 || p >= n * n) return;
      const sameRow = Math.floor(p / n) === Math.floor(b / n);
      const sameCol = p % n === b % n;
      if (!sameRow && !sameCol) {
        sfx.bounce(-8);
        return;
      }
      const step = sameRow ? (p > b ? 1 : -1) : p > b ? n : -n;
      const next = board.slice();
      let count = 0;
      while (b !== p) {
        next[b] = next[b + step];
        next[b + step] = 0;
        b += step;
        count++;
      }
      const total = moves + count;
      setBoard(next);
      setMoves(total);
      sfx.flip();
      const right = next.filter((v, i) => v !== 0 && v === target[i]).length;
      if (right > board.filter((v, i) => v !== 0 && v === target[i]).length) sfx.pop(right % 12);
      if (next.every((v, i) => v === target[i])) {
        doneRef.current = true;
        window.setTimeout(() => {
          setSolved(true);
          sfx.clear();
          burstAt(boardRef.current, { colors: ["#fff", "#f9a8d4", "#c4b5fd", "#fde047"], count: 46, speed: 420, kind: "star" });
        }, 260);
        const stars = total <= par * 1.4 ? 3 : total <= par * 2.6 ? 2 : 1;
        window.setTimeout(
          () =>
            onWin(stars, [
              { label: "Moves", value: String(total) },
              { label: "3★ target", value: `≤ ${Math.floor(par * 1.4)}` },
              { label: "Board", value: `${n}×${n}` },
            ]),
          1300,
        );
      }
    },
    [board, moves, n, target, par, onWin],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const b = board.indexOf(0);
      const r = Math.floor(b / n);
      const c = b % n;
      let p = -1;
      if (e.key === "ArrowUp" && r < n - 1) p = b + n;
      else if (e.key === "ArrowDown" && r > 0) p = b - n;
      else if (e.key === "ArrowLeft" && c < n - 1) p = b + 1;
      else if (e.key === "ArrowRight" && c > 0) p = b - 1;
      if (p >= 0) {
        e.preventDefault();
        moveTo(p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [board, n, moveTo]);

  const correct = board.filter((v, i) => v !== 0 && v === target[i]).length;
  const gap = solved ? 0 : n >= 5 ? 3 : 4;

  return (
    <div className="flex w-full flex-col items-center">
      <Hud>
        <Stat icon="moves" label="Moves" value={moves} />
        <Stat icon="target" label="3★ under" value={Math.floor(par * 1.4) + 1} tone={moves > par * 1.4 ? "warn" : "good"} />
        <Stat icon="check" label="In place" value={`${correct}/${n * n - 1}`} />
        <button
          type="button"
          onPointerDown={() => {
            sfx.select();
            setPeek(true);
          }}
          onPointerUp={() => setPeek(false)}
          onPointerLeave={() => setPeek(false)}
          className="btn3d dark h-10 rounded-2xl px-3.5 text-sm"
        >
          <Icon name="eye" className="h-4 w-4" /> Hold to peek
        </button>
      </Hud>

      <div ref={boardRef} className="board w-full max-w-[min(92vw,480px)] p-2.5 sm:p-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-black/40">
          {board.map((tile, pos) => {
            if (tile === 0) return null;
            const goal = tile - 1;
            const gr = Math.floor(goal / n);
            const gc = goal % n;
            const r = Math.floor(pos / n);
            const c = pos % n;
            const inPlace = target[pos] === tile;
            return (
              <motion.button
                key={tile}
                type="button"
                onClick={() => moveTo(pos)}
                aria-label={`Piece ${tile}`}
                className="absolute left-0 top-0"
                style={{ width: `${100 / n}%`, height: `${100 / n}%`, padding: gap / 2 }}
                initial={false}
                animate={{ x: `${c * 100}%`, y: `${r * 100}%` }}
                transition={{ type: "spring", stiffness: 520, damping: 34 }}
                whileTap={{ scale: 0.95 }}
              >
                <span
                  className="relative block h-full w-full overflow-hidden transition-[border-radius,box-shadow] duration-500"
                  style={{
                    backgroundImage: picture,
                    backgroundSize: `${n * 100}% ${n * 100}%`,
                    backgroundPosition: `${(gc / (n - 1)) * 100}% ${(gr / (n - 1)) * 100}%`,
                    borderRadius: solved ? 0 : 10,
                    boxShadow: solved ? "none" : "inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -3px 0 rgba(0,0,0,0.3), 0 3px 8px rgba(0,0,0,0.45)",
                  }}
                >
                  {numbers && !solved && (
                    <span className="absolute left-1.5 top-1 rounded-md bg-black/45 px-1.5 font-display text-sm font-bold text-white backdrop-blur-sm">{tile}</span>
                  )}
                  {inPlace && !solved && <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />}
                </span>
              </motion.button>
            );
          })}
          <AnimatePresence>
            {solved && (
              <motion.div
                key="last"
                className="absolute"
                style={{ left: `${((n - 1) / n) * 100}%`, top: `${((n - 1) / n) * 100}%`, width: `${100 / n}%`, height: `${100 / n}%`, backgroundImage: picture, backgroundSize: `${n * 100}% ${n * 100}%`, backgroundPosition: "100% 100%" }}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
              />
            )}
            {solved && (
              <motion.div
                key="shine"
                className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                initial={{ x: "-120%", skewX: -20 }}
                animate={{ x: "380%" }}
                transition={{ duration: 0.9, delay: 0.25, ease: "easeInOut" }}
              />
            )}
            {peek && (
              <motion.div
                key="peek"
                className="absolute inset-0 z-10"
                style={{ backgroundImage: picture, backgroundSize: "100% 100%" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="mt-5 text-center text-sm text-white/55">Tap a piece in line with the gap — or use the arrow keys.</p>
    </div>
  );
}
