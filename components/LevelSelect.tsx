"use client";

import Link from "next/link";
import { getGame, type GameId } from "@/lib/games";
import { gameStats, useHydrated, useProgress } from "@/lib/progress";
import { GameIcon, Stars } from "./GameIcon";

export default function LevelSelect({ gameId }: { gameId: GameId }) {
  const game = getGame(gameId)!;
  const progress = useProgress();
  const hydrated = useHydrated();
  const stats = gameStats(progress, gameId, game.levels);
  const stars = progress[gameId] ?? {};
  const conceptLevels = new Map(game.concepts.map((c) => [c.level, c]));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
        ← All games
      </Link>

      <section className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
        <GameIcon game={game} size={84} />
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: game.accent }}>
            {game.skill}
          </div>
          <h1 className="font-display text-4xl font-bold">{game.name}</h1>
          <p className="mt-1 text-slate-400">{game.tagline}</p>
        </div>
        <div className="flex gap-3 sm:flex-col sm:items-end">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm">
            <span className="font-semibold tabular-nums">{hydrated ? stats.completed : 0}</span>
            <span className="text-slate-400"> / {game.levels} levels</span>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm">
            <span className="text-amber-300">★</span>{" "}
            <span className="font-semibold tabular-nums">{hydrated ? stats.stars : 0}</span>
            <span className="text-slate-400"> / {stats.maxStars}</span>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Concept roadmap</h2>
        <ol className="grid gap-2 sm:grid-cols-2">
          {game.concepts.map((c) => {
            const reached = hydrated && stats.unlocked >= c.level;
            return (
              <li
                key={c.level}
                className={`flex gap-3 rounded-2xl border p-3 ${reached ? "border-white/10 bg-white/5" : "border-dashed border-white/10 bg-transparent opacity-60"}`}
              >
                <span
                  className="flex h-9 w-12 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-slate-950"
                  style={{ background: reached ? `linear-gradient(135deg, ${game.accent}, ${game.accent2})` : "#334155" }}
                >
                  Lv {c.level}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {c.title} {!reached && <span className="text-xs font-normal text-slate-500">🔒</span>}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400">{c.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Levels</h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
          {Array.from({ length: game.levels }, (_, i) => {
            const lvl = i + 1;
            const s = stars[lvl] ?? 0;
            const locked = !hydrated || lvl > stats.unlocked;
            const current = hydrated && lvl === stats.unlocked && s === 0;
            const isConcept = conceptLevels.has(lvl) && lvl > 1;
            const inner = (
              <>
                {isConcept && (
                  <span
                    className="absolute -right-1.5 -top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-950"
                    style={{ background: game.accent }}
                  >
                    New
                  </span>
                )}
                <span className="font-display text-xl font-semibold">{locked ? "🔒" : lvl}</span>
                <Stars count={s} size={11} />
              </>
            );
            const base =
              "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border text-center transition";
            return locked ? (
              <div key={lvl} className={`${base} border-white/5 bg-white/[0.02] text-slate-600`} aria-label={`Level ${lvl}, locked`}>
                {inner}
              </div>
            ) : (
              <Link
                key={lvl}
                href={`/game/${gameId}/${lvl}`}
                className={`${base} hover:-translate-y-0.5 hover:bg-white/10 ${current ? "border-transparent bg-white/10 ring-2 animate-glow" : "border-white/10 bg-white/5"}`}
                style={current ? ({ "--tw-ring-color": game.accent } as React.CSSProperties) : undefined}
                aria-label={`Level ${lvl}`}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
