"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { levelRng, shuffle, type Rng } from "@/lib/rng";
import { sfx } from "@/lib/sfx";
import { burstAt, shake } from "@/lib/fx";
import { formatTime, GameButton, Hearts, Hud, Stat } from "@/components/Hud";
import { Icon } from "@/components/ui/Icon";
import type { GameProps } from "./types";

// [size, clues]
const TABLE: [number, number][] = [
  [4, 10], [4, 9], [4, 8], [4, 7], [4, 6],
  [6, 22], [6, 20], [6, 19], [6, 18], [6, 17], [6, 16], [6, 15],
  [9, 40], [9, 38], [9, 36], [9, 34], [9, 32], [9, 30], [9, 29], [9, 28],
];

function boxDims(n: number): [number, number] {
  return n === 4 ? [2, 2] : n === 6 ? [2, 3] : [3, 3];
}
function boxOf(i: number, n: number) {
  const [bh, bw] = boxDims(n);
  const r = Math.floor(i / n);
  const c = i % n;
  return Math.floor(r / bh) * (n / bw) + Math.floor(c / bw);
}
function peers(n: number) {
  return Array.from({ length: n * n }, (_, i) => {
    const s = new Set<number>();
    const r = Math.floor(i / n);
    const c = i % n;
    const b = boxOf(i, n);
    for (let j = 0; j < n * n; j++) if (j !== i && (Math.floor(j / n) === r || j % n === c || boxOf(j, n) === b)) s.add(j);
    return [...s];
  });
}

/** Counts solutions up to `limit` (MRV backtracking with bitmasks). */
function countSolutions(grid: number[], n: number, P: number[][], limit: number, rng?: Rng): number {
  const g = grid.slice();
  let count = 0;
  const full = (1 << n) - 1;
  const cand = (i: number) => {
    let used = 0;
    for (const p of P[i]) if (g[p]) used |= 1 << (g[p] - 1);
    return full & ~used;
  };
  const rec = (): boolean => {
    let best = -1;
    let bestMask = 0;
    let bestCount = 99;
    for (let i = 0; i < n * n; i++) {
      if (g[i]) continue;
      const m = cand(i);
      let k = 0;
      for (let x = m; x; x &= x - 1) k++;
      if (k < bestCount) {
        best = i;
        bestMask = m;
        bestCount = k;
        if (k <= 1) break;
      }
    }
    if (best < 0) {
      count++;
      return count >= limit;
    }
    if (!bestCount) return false;
    let digits: number[] = [];
    for (let d = 1; d <= n; d++) if (bestMask & (1 << (d - 1))) digits.push(d);
    if (rng) digits = shuffle(rng, digits);
    for (const d of digits) {
      g[best] = d;
      if (rec()) return true;
      g[best] = 0;
    }
    return false;
  };
  rec();
  if (rng) grid.splice(0, grid.length, ...g);
  return count;
}

export function generate(level: number) {
  const [n, clues] = TABLE[level - 1] ?? TABLE[TABLE.length - 1];
  const rng = levelRng("sudoku", level);
  const P = peers(n);
  const solution = new Array<number>(n * n).fill(0);
  countSolutions(solution, n, P, 1, rng); // fills `solution` randomly
  const puzzle = solution.slice();
  const order = shuffle(rng, Array.from({ length: n * n }, (_, i) => i));
  let filled = n * n;
  for (const i of order) {
    if (filled <= clues) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, n, P, 2) !== 1) puzzle[i] = keep;
    else filled--;
  }
  return { n, solution, puzzle, P };
}

export default function Sudoku({ level, paused, onWin, onLose }: GameProps) {
  const lv = useMemo(() => generate(level), [level]);
  const { n, solution, puzzle } = lv;
  const [bh, bw] = boxDims(n);
  const [vals, setVals] = useState<number[]>(() => puzzle.slice());
  const [notes, setNotes] = useState<number[]>(() => new Array(n * n).fill(0));
  const [sel, setSel] = useState<number>(() => puzzle.findIndex((v) => v === 0));
  const [noteMode, setNoteMode] = useState(false);
  const [hearts, setHearts] = useState(3);
  const [hinted, setHinted] = useState(false);
  const [wrong, setWrong] = useState<{ i: number; d: number; k: number } | null>(null);
  const [wave, setWave] = useState<{ cells: number[]; origin: number; k: number }>({ cells: [], origin: 0, k: 0 });
  const [elapsed, setElapsed] = useState(0);
  const doneRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const cellEls = useRef<(HTMLButtonElement | null)[]>([]);
  const wrongKey = useRef(0);

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => !doneRef.current && setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [paused]);

  function placeAt(at: number, d: number, fromHint = false) {
    if (doneRef.current || paused || at < 0 || puzzle[at] || vals[at] === solution[at]) return;
    if (noteMode && !fromHint) {
      sfx.click(d);
      setNotes((ns) => ns.map((m, i) => (i === at ? m ^ (1 << (d - 1)) : m)));
      return;
    }
    if (d !== solution[at]) {
      sfx.error();
      shake(cellEls.current[at], 5, 300);
      setWrong({ i: at, d, k: ++wrongKey.current });
      window.setTimeout(() => setWrong((w) => (w && w.i === at ? null : w)), 700);
      const h = hearts - 1;
      setHearts(h);
      if (h <= 0) {
        doneRef.current = true;
        window.setTimeout(() => onLose("Three mistakes — the grid wins this time."), 600);
      }
      return;
    }
    const next = vals.slice();
    next[at] = d;
    setVals(next);
    // clear this digit from peer notes
    setNotes((ns) => ns.map((m, i) => (i === at ? 0 : lv.P[at].includes(i) ? m & ~(1 << (d - 1)) : m)));
    sfx.pop(d);
    const r = Math.floor(at / n);
    const c = at % n;
    const b = boxOf(at, n);
    const groups = [
      Array.from({ length: n }, (_, k) => r * n + k),
      Array.from({ length: n }, (_, k) => k * n + c),
      Array.from({ length: n * n }, (_, k) => k).filter((k) => boxOf(k, n) === b),
    ].filter((g) => g.every((k) => next[k]));
    if (groups.length) {
      const cells = [...new Set(groups.flat())];
      setWave((w) => ({ cells, origin: at, k: w.k + 1 }));
      sfx.match(groups.length * 2);
    }
    if (next.every((v, i) => v === solution[i])) {
      doneRef.current = true;
      window.setTimeout(() => {
        setWave((w) => ({ cells: next.map((_, i) => i), origin: at, k: w.k + 1 }));
        sfx.clear();
        burstAt(boardRef.current, { colors: ["#38bdf8", "#818cf8", "#fff", "#fde047"], count: 50, speed: 420, kind: "star" });
      }, 250);
      const usedHint = hinted || fromHint;
      const mistakes = 3 - hearts;
      let stars = 3 - mistakes;
      if (usedHint) stars = Math.min(stars, 2);
      window.setTimeout(
        () =>
          onWin(Math.max(1, stars), [
            { label: "Time", value: formatTime(elapsed) },
            { label: "Mistakes", value: String(mistakes) },
            { label: "Hint used", value: usedHint ? "Yes" : "No" },
          ]),
        1300,
      );
      return;
    }
    // jump to the next empty cell in reading order
    for (let k = 1; k < n * n; k++) {
      const j = (at + k) % (n * n);
      if (!next[j]) {
        setSel(j);
        break;
      }
    }
  }
  const place = (d: number) => placeAt(sel, d);

  const erase = () => {
    if (sel < 0 || puzzle[sel] || vals[sel]) return;
    sfx.click(-4);
    setNotes((ns) => ns.map((m, i) => (i === sel ? 0 : m)));
  };
  const hint = () => {
    if (hinted || doneRef.current) return;
    const target = sel >= 0 && !vals[sel] ? sel : vals.findIndex((v) => !v);
    if (target < 0) return;
    setHinted(true);
    setSel(target);
    burstAt(cellEls.current[target], { colors: ["#fde047", "#fff"], count: 12, speed: 160 });
    placeAt(target, solution[target], true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paused) return;
      const d = Number(e.key);
      if (d >= 1 && d <= n) {
        place(d);
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") erase();
      else if (e.key.toLowerCase() === "n") setNoteMode((m) => !m);
      else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const r = Math.floor(Math.max(0, sel) / n);
        const c = Math.max(0, sel) % n;
        const [nr, nc] = e.key === "ArrowUp" ? [r - 1, c] : e.key === "ArrowDown" ? [r + 1, c] : e.key === "ArrowLeft" ? [r, c - 1] : [r, c + 1];
        if (nr >= 0 && nr < n && nc >= 0 && nc < n) setSel(nr * n + nc);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const selVal = sel >= 0 ? vals[sel] : 0;
  const remaining = Array.from({ length: n }, (_, k) => n - vals.filter((v) => v === k + 1).length);

  return (
    <div className="flex w-full flex-col items-center">
      <Hud>
        <Hearts left={hearts} />
        <Stat icon="clock" label="Time" value={formatTime(elapsed)} />
        <Stat icon="grid" label="Empty" value={vals.filter((v) => !v).length} />
      </Hud>

      <div ref={boardRef} className="board w-full max-w-[min(94vw,520px)] p-2 sm:p-3">
        <div className="relative grid overflow-hidden rounded-[14px] bg-slate-300" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap: 1 }}>
          <div className="pointer-events-none absolute inset-0 z-10">
            {Array.from({ length: n / bw - 1 }, (_, k) => (
              <span key={`v${k}`} className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-slate-700" style={{ left: `${((k + 1) * bw * 100) / n}%` }} />
            ))}
            {Array.from({ length: n / bh - 1 }, (_, k) => (
              <span key={`h${k}`} className="absolute inset-x-0 h-[3px] -translate-y-1/2 bg-slate-700" style={{ top: `${((k + 1) * bh * 100) / n}%` }} />
            ))}
          </div>
          {vals.map((v, i) => {
            const r = Math.floor(i / n);
            const c = i % n;
            const given = puzzle[i] !== 0;
            const isSel = i === sel;
            const related = sel >= 0 && (Math.floor(sel / n) === r || sel % n === c || boxOf(sel, n) === boxOf(i, n));
            const same = !!selVal && v === selVal;
            const isWrong = wrong?.i === i;
            const inWave = wave.cells.includes(i);
            const dist = Math.abs(r - Math.floor(wave.origin / n)) + Math.abs(c - (wave.origin % n));
            let bg = "#f8fafc";
            if (related) bg = "#e0f2fe";
            if (same) bg = "#bae6fd";
            if (isSel) bg = "#7dd3fc";
            return (
              <button
                key={i}
                ref={(el) => {
                  cellEls.current[i] = el;
                }}
                type="button"
                onClick={() => {
                  sfx.click(2);
                  setSel(i);
                }}
                aria-label={`Row ${r + 1} column ${c + 1}${v ? `, ${v}` : ", empty"}`}
                className="relative flex aspect-square items-center justify-center font-display transition-colors duration-100"
                style={{
                  background: bg,
                  fontSize: n === 9 ? "clamp(1rem, 4.6vw, 1.6rem)" : n === 6 ? "clamp(1.2rem, 6vw, 2rem)" : "clamp(1.6rem, 8vw, 2.6rem)",
                }}
              >
                {inWave && (
                  <motion.span
                    key={wave.k}
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(135deg,#38bdf8,#818cf8)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.85, 0] }}
                    transition={{ duration: 0.6, delay: dist * 0.04 }}
                  />
                )}
                {v ? (
                  <motion.span
                    key={given ? "g" : `u${v}`}
                    initial={given ? false : { scale: 0.2 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className={`relative font-bold ${given ? "text-slate-800" : "text-sky-600"}`}
                  >
                    {v}
                  </motion.span>
                ) : notes[i] ? (
                  <span className="relative grid h-full w-full p-[6%] text-slate-500" style={{ gridTemplateColumns: `repeat(${bw}, 1fr)`, fontSize: n === 9 ? "clamp(0.45rem,1.8vw,0.7rem)" : "clamp(0.6rem,2.6vw,0.9rem)" }}>
                    {Array.from({ length: n }, (_, k) => (
                      <span key={k} className="flex items-center justify-center leading-none">
                        {notes[i] & (1 << k) ? k + 1 : ""}
                      </span>
                    ))}
                  </span>
                ) : null}
                <AnimatePresence>
                  {isWrong && (
                    <motion.span
                      key={wrong!.k}
                      className="absolute inset-0 flex items-center justify-center bg-rose-200 font-bold text-rose-600"
                      initial={{ opacity: 0, scale: 1.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {wrong!.d}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex w-full max-w-[min(94vw,520px)] flex-wrap justify-center gap-2">
        {Array.from({ length: n }, (_, k) => k + 1).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => place(d)}
            disabled={remaining[d - 1] === 0}
            className={`btn3d ${noteMode ? "purple" : "blue"} relative h-14 rounded-2xl text-2xl`}
            style={{ width: n === 9 ? "calc((100% - 4 * 0.5rem) / 5)" : `calc((100% - ${n - 1} * 0.5rem) / ${n})`, maxWidth: 72 }}
          >
            {d}
            {remaining[d - 1] > 0 && <span className="absolute right-1.5 top-1 text-[10px] font-bold opacity-75">{remaining[d - 1]}</span>}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <GameButton onClick={() => setNoteMode((m) => !m)} icon="pencil" active={noteMode}>
          Notes {noteMode ? "on" : "off"}
        </GameButton>
        <GameButton onClick={erase} icon="eraser">
          Erase
        </GameButton>
        <GameButton onClick={hint} icon="hint" disabled={hinted}>
          Hint{hinted ? " used" : " · 2★ max"}
        </GameButton>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-white/45">
        <Icon name="grid" className="h-3.5 w-3.5" /> Keyboard: 1–{n}, arrows, N for notes, Backspace to erase
      </p>
    </div>
  );
}
