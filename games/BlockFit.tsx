"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { levelRng, shuffle, type Rng } from "@/lib/rng";
import { sfx } from "@/lib/sfx";
import { burst, floatText, shake } from "@/lib/fx";
import { GoalBar, Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

const N = 8;
type Cell = [number, number];
const SHAPES: Cell[][] = [
  [[0, 0]],
  [[0, 0], [0, 1]], [[0, 0], [1, 0]],
  [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [1, 0], [1, 1]], [[0, 1], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 0]], [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 1], [1, 1], [2, 1], [2, 0]], [[0, 0], [0, 1], [0, 2], [1, 0]], [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 1]], [[1, 0], [1, 1], [1, 2], [0, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 1], [1, 1], [2, 1], [1, 0]],
  [[0, 0], [0, 1], [1, 1], [1, 2]], [[0, 1], [0, 2], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], [[0, 2], [1, 2], [2, 2], [2, 1], [2, 0]], [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
];
const WEIGHT = SHAPES.map((s) => (s.length <= 2 ? 3 : s.length === 3 ? 4 : s.length === 4 ? 4 : s.length === 5 ? 2 : 1));
const COLORS = ["#f43f5e", "#fb923c", "#facc15", "#4ade80", "#22d3ee", "#818cf8", "#e879f9"];

// [lines goal, piece budget, stones, gems]
const TABLE: [number, number, number, number][] = [
  [3, 14, 0, 0], [4, 15, 0, 0], [5, 16, 0, 0], [6, 18, 0, 0], [7, 19, 0, 0],
  [6, 18, 6, 0], [7, 19, 8, 0], [8, 20, 10, 0], [8, 20, 12, 0], [10, 22, 12, 0], [10, 22, 14, 0],
  [0, 20, 6, 4], [0, 22, 8, 5], [0, 22, 8, 6], [0, 24, 10, 6], [0, 24, 10, 7], [0, 26, 12, 8], [0, 26, 14, 8], [0, 28, 14, 9], [0, 28, 16, 10],
];

interface Block {
  color: string;
  kind: "piece" | "stone" | "gem";
}
type Board = (Block | null)[];
interface TrayPiece {
  id: number;
  shape: number;
  color: string;
}

function pickShape(rng: Rng) {
  const total = WEIGHT.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < WEIGHT.length; i++) {
    r -= WEIGHT[i];
    if (r <= 0) return i;
  }
  return 0;
}
const dims = (s: Cell[]) => [Math.max(...s.map((c) => c[0])) + 1, Math.max(...s.map((c) => c[1])) + 1];
function fits(board: Board, shape: Cell[], r0: number, c0: number) {
  return shape.every(([r, c]) => {
    const rr = r0 + r;
    const cc = c0 + c;
    return rr >= 0 && rr < N && cc >= 0 && cc < N && !board[rr * N + cc];
  });
}
interface Drag {
  slot: number;
  x: number;
  y: number;
  lift: number;
  moved: boolean;
  sx: number;
  sy: number;
  gl: number;
  gt: number;
  cs: number;
}
function anchorFor(d: Drag, shape: Cell[]): [number, number] {
  const [h, w] = dims(shape);
  const left = d.x - (w * d.cs) / 2;
  const top = d.y - (h * d.cs) / 2 - d.lift;
  return [Math.round((top - d.gt) / d.cs), Math.round((left - d.gl) / d.cs)];
}
function fitsAnywhere(board: Board, shape: Cell[]) {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (fits(board, shape, r, c)) return true;
  return false;
}

/** Seeded piece dealer: the first piece of every hand always fits somewhere. */
function makeDealer(level: number) {
  const rng = levelRng("block-fit-deal", level);
  let nextId = 0;
  return (b: Board, count: number): TrayPiece[] => {
    const out: TrayPiece[] = [];
    for (let i = 0; i < count; i++) {
      let shape = pickShape(rng);
      if (i === 0) {
        let tries = 0;
        while (!fitsAnywhere(b, SHAPES[shape]) && tries++ < 25) shape = pickShape(rng);
        if (!fitsAnywhere(b, SHAPES[shape])) shape = 0;
      }
      out.push({ id: nextId++, shape, color: COLORS[shape % COLORS.length] });
    }
    return out;
  };
}

export function setup(level: number) {
  const [lines, budget, stones, gems] = TABLE[level - 1] ?? TABLE[TABLE.length - 1];
  const rng = levelRng("block-fit", level);
  const board: Board = new Array(N * N).fill(null);
  const cells = shuffle(rng, Array.from({ length: N * N }, (_, i) => i));
  let k = 0;
  // keep at least one free cell per row and column so lines stay clearable
  const rowCount = new Array(N).fill(0);
  const colCount = new Array(N).fill(0);
  const place = (kind: "stone" | "gem") => {
    while (k < cells.length) {
      const i = cells[k++];
      const r = Math.floor(i / N);
      const c = i % N;
      if (rowCount[r] >= 4 || colCount[c] >= 4) continue;
      rowCount[r]++;
      colCount[c]++;
      board[i] = kind === "stone" ? { color: "#64748b", kind } : { color: "#22d3ee", kind };
      return;
    }
  };
  for (let s = 0; s < stones; s++) place("stone");
  for (let g = 0; g < gems; g++) place("gem");
  return { lines, budget, gems, board };
}

export default function BlockFit({ level, paused, onWin, onLose }: GameProps) {
  const init = useMemo(() => setup(level), [level]);
  const [deal] = useState(() => makeDealer(level));
  const [board, setBoard] = useState<Board>(() => init.board.slice());
  const [tray, setTray] = useState<(TrayPiece | null)[]>(() => deal(init.board, Math.min(3, init.budget)));
  const [dealt, setDealt] = useState(Math.min(3, init.budget));
  const [linesCleared, setLinesCleared] = useState(0);
  const [gemsGot, setGemsGot] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [vanish, setVanish] = useState<{ key: string; i: number; color: string; gem: boolean; delay: number }[]>([]);
  const [placedFlash, setPlacedFlash] = useState<{ cells: number[]; k: number }>({ cells: [], k: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  const piecesLeft = init.budget - dealt + tray.filter(Boolean).length;
  const goalDone = (l: number, g: number) => (init.gems ? g >= init.gems : l >= init.lines);

  function commit(slot: number, r0: number, c0: number) {
    const piece = tray[slot];
    if (!piece || doneRef.current) return false;
    const shape = SHAPES[piece.shape];
    if (!fits(board, shape, r0, c0)) return false;
    const b = board.slice();
    const placed: number[] = [];
    for (const [r, c] of shape) {
      const i = (r0 + r) * N + (c0 + c);
      b[i] = { color: piece.color, kind: "piece" };
      placed.push(i);
    }
    sfx.thud();
    setPlacedFlash((p) => ({ cells: placed, k: p.k + 1 }));

    const fullRows: number[] = [];
    const fullCols: number[] = [];
    for (let r = 0; r < N; r++) if (Array.from({ length: N }, (_, c) => b[r * N + c]).every(Boolean)) fullRows.push(r);
    for (let c = 0; c < N; c++) if (Array.from({ length: N }, (_, r) => b[r * N + c]).every(Boolean)) fullCols.push(c);
    const clear = new Set<number>();
    fullRows.forEach((r) => {
      for (let c = 0; c < N; c++) clear.add(r * N + c);
    });
    fullCols.forEach((c) => {
      for (let r = 0; r < N; r++) clear.add(r * N + c);
    });
    const nLines = fullRows.length + fullCols.length;
    let gained = shape.length;
    let gemsNow = gemsGot;
    let newCombo = combo;
    if (nLines) {
      newCombo = combo + 1;
      gained += nLines * 20 * newCombo + (nLines > 1 ? nLines * 15 : 0);
      const g = gridRef.current?.getBoundingClientRect();
      const cs = g ? g.width / N : 48;
      const centerR = r0 + dims(shape)[0] / 2;
      const centerC = c0 + dims(shape)[1] / 2;
      const fxs: typeof vanish = [];
      let gemsHere = 0;
      clear.forEach((i) => {
        const blk = b[i]!;
        if (blk.kind === "gem") gemsHere++;
        const d = Math.abs(Math.floor(i / N) - centerR) + Math.abs((i % N) - centerC);
        fxs.push({ key: `${i}-${placedFlash.k}`, i, color: blk.color, gem: blk.kind === "gem", delay: d * 0.03 });
        if (g) {
          window.setTimeout(
            () => burst(g.left + ((i % N) + 0.5) * cs, g.top + (Math.floor(i / N) + 0.5) * cs, { colors: [blk.color, "#fff"], count: 5, speed: 160, size: 3.5, ring: false }),
            d * 30,
          );
        }
        b[i] = null;
      });
      gemsNow += gemsHere;
      setVanish(fxs);
      window.setTimeout(() => setVanish([]), 700);
      sfx.clear();
      if (nLines > 1 || newCombo > 1) sfx.match(newCombo + nLines);
      if (g) {
        const label = nLines >= 3 ? "AMAZING!" : nLines === 2 ? "DOUBLE!" : newCombo > 1 ? `COMBO x${newCombo}` : "CLEAR!";
        floatText(g.left + g.width / 2, g.top + g.height / 2, label, nLines >= 2 ? "#fde047" : "#fff", nLines >= 2 ? 40 : 32);
        if (gemsHere) window.setTimeout(() => floatText(g.left + g.width / 2, g.top + g.height / 2 + 44, `+${gemsHere} 💎`, "#67e8f9", 28), 200);
      }
      if (nLines >= 2) shake(gridRef.current, 5);
    } else newCombo = 0;

    const newLines = linesCleared + nLines;
    setBoard(b);
    setLinesCleared(newLines);
    setGemsGot(gemsNow);
    setScore((s) => s + gained);
    setCombo(newCombo);
    let t = tray.slice();
    t[slot] = null;
    let d = dealt;
    if (t.every((x) => !x) && d < init.budget) {
      const count = Math.min(3, init.budget - d);
      t = deal(b, count);
      while (t.length < 3) t.push(null);
      d += count;
      window.setTimeout(() => sfx.select(), 150);
    }
    setTray(t);
    setDealt(d);
    setSelected(null);

    if (goalDone(newLines, gemsNow)) {
      doneRef.current = true;
      const left = init.budget - d + t.filter(Boolean).length;
      const ratio = left / init.budget;
      const stars = ratio >= 0.25 ? 3 : ratio >= 0.1 ? 2 : 1;
      window.setTimeout(
        () =>
          onWin(stars, [
            { label: init.gems ? "Gems" : "Lines", value: init.gems ? `${gemsNow}/${init.gems}` : `${newLines}/${init.lines}` },
            { label: "Pieces left", value: String(left) },
            { label: "Score", value: String(score + gained) },
          ]),
        900,
      );
    } else {
      const remaining = t.filter((x): x is TrayPiece => !!x);
      if (!remaining.length && d >= init.budget) {
        doneRef.current = true;
        window.setTimeout(() => onLose("Out of pieces before the goal was reached."), 700);
      } else if (remaining.length && !remaining.some((p) => fitsAnywhere(b, SHAPES[p.shape]))) {
        doneRef.current = true;
        window.setTimeout(() => {
          sfx.error();
          onLose("No room left for any of your pieces.");
        }, 700);
      }
    }
    return true;
  }

  const onDown = (slot: number) => (e: RPointerEvent<HTMLDivElement>) => {
    if (doneRef.current || paused || !tray[slot]) return;
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    const g = gridRef.current?.getBoundingClientRect();
    if (!g) return;
    const cs = g.width / N;
    const lift = e.pointerType === "touch" ? cs * 1.6 : 0;
    setDrag({ slot, x: e.clientX, y: e.clientY, lift, moved: false, sx: e.clientX, sy: e.clientY, gl: g.left, gt: g.top, cs });
    sfx.select();
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
  };
  const onUp = () => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    const piece = tray[d.slot];
    if (!piece) return;
    if (!d.moved) {
      setSelected((s) => (s === d.slot ? null : d.slot));
      return;
    }
    const a = anchorFor(d, SHAPES[piece.shape]);
    if (!commit(d.slot, a[0], a[1])) sfx.bounce(-10);
  };

  const dragPiece = drag ? tray[drag.slot] : null;
  const ghost = useMemo(() => {
    if (!drag || !dragPiece || !drag.moved) return null;
    const shape = SHAPES[dragPiece.shape];
    const a = anchorFor(drag, shape);
    if (!fits(board, shape, a[0], a[1])) return null;
    const cells = shape.map(([r, c]) => (a[0] + r) * N + (a[1] + c));
    const b = board.slice();
    cells.forEach((i) => (b[i] = { color: dragPiece.color, kind: "piece" }));
    const lines = new Set<number>();
    for (let r = 0; r < N; r++) if (Array.from({ length: N }, (_, c) => b[r * N + c]).every(Boolean)) for (let c = 0; c < N; c++) lines.add(r * N + c);
    for (let c = 0; c < N; c++) if (Array.from({ length: N }, (_, r) => b[r * N + c]).every(Boolean)) for (let r = 0; r < N; r++) lines.add(r * N + c);
    return { cells: new Set(cells), lines, color: dragPiece.color };
  }, [drag, dragPiece, board]);

  const cs = drag ? drag.cs : 0;

  return (
    <div className="flex w-full select-none flex-col items-center">
      <Hud>
        {init.gems ? (
          <GoalBar label="Gems" value={gemsGot} max={init.gems} color="#22d3ee" />
        ) : (
          <GoalBar label="Lines" value={Math.min(linesCleared, init.lines)} max={init.lines} color="#fbbf24" />
        )}
        <Stat icon="grid" label="Pieces" value={piecesLeft} tone={piecesLeft <= 3 ? "warn" : "default"} />
        <Stat icon="trophy" label="Score" value={score} />
      </Hud>

      <div className="board w-full max-w-[min(92vw,440px)] p-2.5 sm:p-3">
        <div ref={gridRef} className="relative grid aspect-square w-full" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
          {board.map((blk, i) => {
            const isGhost = ghost?.cells.has(i);
            const inLine = ghost?.lines.has(i);
            const flash = placedFlash.cells.includes(i);
            return (
              <div
                key={i}
                className="relative p-[2px]"
                onClick={() => {
                  if (selected === null || doneRef.current) return;
                  const piece = tray[selected];
                  if (piece && !commit(selected, Math.floor(i / N), i % N)) sfx.bounce(-10);
                }}
              >
                <div className="slot absolute inset-[2px]" />
                {blk && (
                  <motion.div
                    key={flash ? `f${placedFlash.k}` : "s"}
                    initial={flash ? { scale: 0.5 } : false}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 600, damping: 16 }}
                    className="tile3d relative h-full w-full"
                    style={{
                      borderRadius: 8,
                      background:
                        blk.kind === "stone"
                          ? "linear-gradient(160deg,#94a3b8,#475569)"
                          : blk.kind === "gem"
                            ? "linear-gradient(160deg,#1e3a5f,#0f2440)"
                            : `linear-gradient(160deg, color-mix(in oklab, ${blk.color} 75%, white), ${blk.color} 55%, color-mix(in oklab, ${blk.color} 70%, black))`,
                      ["--edge" as string]: "rgba(0,0,0,0.35)",
                      boxShadow: inLine ? `0 0 0 2px #fff, 0 0 16px ${ghost?.color}` : undefined,
                    }}
                  >
                    {blk.kind === "gem" && (
                      <svg viewBox="0 0 24 24" className="absolute inset-[16%] drop-shadow-[0_0_6px_#22d3ee]">
                        <path d="M6 3h12l4 6-10 12L2 9z" fill="#67e8f9" />
                        <path d="M6 3l6 6 6-6M2 9h20M12 9v12" stroke="#0e7490" strokeWidth={1.2} fill="none" />
                      </svg>
                    )}
                  </motion.div>
                )}
                {!blk && isGhost && <div className="absolute inset-[2px] rounded-lg opacity-50" style={{ background: ghost!.color }} />}
                {!blk && inLine && !isGhost && <div className="absolute inset-[2px] rounded-lg bg-white/15" />}
              </div>
            );
          })}
          <AnimatePresence>
            {vanish.map((v) => (
              <motion.div
                key={v.key}
                className="pointer-events-none absolute p-[2px]"
                style={{ left: `${(v.i % N) * 12.5}%`, top: `${Math.floor(v.i / N) * 12.5}%`, width: "12.5%", height: "12.5%" }}
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: [1, 1.15, 0], opacity: [1, 1, 0], rotate: [0, 0, 45] }}
                transition={{ duration: 0.45, delay: v.delay }}
              >
                <div className="h-full w-full rounded-lg" style={{ background: v.gem ? "#67e8f9" : "#fff", boxShadow: `0 0 18px ${v.color}` }} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-6 grid w-full max-w-[min(92vw,440px)] grid-cols-3 gap-3">
        {tray.map((p, slot) => {
          if (!p) return <div key={`e${slot}`} className="panel aspect-square rounded-3xl opacity-40" />;
          const shape = SHAPES[p.shape];
          const [h, w] = dims(shape);
          const size = Math.max(h, w);
          const fitsNow = fitsAnywhere(board, shape);
          const hidden = drag?.slot === slot && drag.moved;
          return (
            <motion.div
              key={p.id}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: hidden ? 0.6 : 1, rotate: 0, opacity: hidden ? 0.25 : fitsNow ? 1 : 0.35 }}
              transition={{ type: "spring", stiffness: 400, damping: 18, delay: slot * 0.06 }}
              onPointerDown={onDown(slot)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={() => setDrag(null)}
              className={`panel relative flex aspect-square touch-none cursor-grab items-center justify-center rounded-3xl active:cursor-grabbing ${selected === slot ? "ring-4 ring-amber-300" : ""}`}
            >
              <div className="relative" style={{ width: `${(w / size) * 74}%`, height: `${(h / size) * 74}%` }}>
                {shape.map(([r, c], k) => (
                  <div
                    key={k}
                    className="tile3d absolute"
                    style={{
                      left: `${(c / w) * 100}%`,
                      top: `${(r / h) * 100}%`,
                      width: `calc(${100 / w}% - 3px)`,
                      height: `calc(${100 / h}% - 3px)`,
                      borderRadius: 6,
                      background: `linear-gradient(160deg, color-mix(in oklab, ${p.color} 75%, white), ${p.color} 55%, color-mix(in oklab, ${p.color} 70%, black))`,
                      ["--edge" as string]: "rgba(0,0,0,0.35)",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-white/55">Drag pieces onto the board — or tap a piece, then tap a cell.</p>

      {drag && dragPiece && drag.moved && (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: drag.x - (dims(SHAPES[dragPiece.shape])[1] * cs) / 2,
            top: drag.y - (dims(SHAPES[dragPiece.shape])[0] * cs) / 2 - drag.lift,
          }}
        >
          {SHAPES[dragPiece.shape].map(([r, c], k) => (
            <div
              key={k}
              className="tile3d absolute"
              style={{
                left: c * cs + 2,
                top: r * cs + 2,
                width: cs - 4,
                height: cs - 4,
                borderRadius: 8,
                background: `linear-gradient(160deg, color-mix(in oklab, ${dragPiece.color} 75%, white), ${dragPiece.color} 55%, color-mix(in oklab, ${dragPiece.color} 70%, black))`,
                ["--edge" as string]: "rgba(0,0,0,0.35)",
                transform: "scale(1.04)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
