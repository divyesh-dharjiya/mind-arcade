"use client";

import Link from "next/link";
import { GAMES, TOTAL_LEVELS } from "@/lib/games";
import { gameStats, resetProgress, useHydrated, useProgress } from "@/lib/progress";
import { GameIcon } from "./GameIcon";

export default function HomeHub() {
  const progress = useProgress();
  const hydrated = useHydrated();
  const all = GAMES.map((g) => ({ game: g, stats: gameStats(progress, g.id, g.levels) }));
  const totalStars = hydrated ? all.reduce((n, x) => n + x.stats.stars, 0) : 0;
  const totalDone = hydrated ? all.reduce((n, x) => n + x.stats.completed, 0) : 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:pt-16">
      <section className="text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          {GAMES.length} brain games · {TOTAL_LEVELS} levels · new concepts as you climb
        </div>
        <h1 className="font-display text-5xl font-bold tracking-tight sm:text-7xl">
          Mind{" "}
          <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 bg-clip-text text-transparent">
            Arcade
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-slate-400 sm:text-lg">
          Puzzles that get smarter as you do. Every few levels a game adds a brand-new rule to master.
        </p>

        <div className="mx-auto mt-8 flex max-w-md justify-center gap-3">
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="font-display text-2xl font-semibold tabular-nums">
              {totalDone}
              <span className="text-base text-slate-500">/{TOTAL_LEVELS}</span>
            </div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Levels cleared</div>
          </div>
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="font-display text-2xl font-semibold tabular-nums">
              <span className="text-amber-300">★</span> {totalStars}
              <span className="text-base text-slate-500">/{TOTAL_LEVELS * 3}</span>
            </div>
            <div className="text-xs uppercase tracking-wider text-slate-400">Stars earned</div>
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {all.map(({ game, stats }, i) => {
          const pct = hydrated ? Math.round((stats.completed / game.levels) * 100) : 0;
          return (
            <Link
              key={game.id}
              href={`/game/${game.id}`}
              className="group relative flex animate-rise flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
                style={{ background: game.accent }}
              />
              <div className="flex items-start justify-between">
                <GameIcon game={game} size={56} />
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                  {game.skill}
                </span>
              </div>
              <h2 className="mt-4 font-display text-xl font-semibold">{game.name}</h2>
              <p className="mt-1 flex-1 text-sm text-slate-400">{game.tagline}</p>

              <div className="mt-4 flex flex-wrap gap-1">
                {game.concepts.slice(1).map((c) => (
                  <span key={c.level} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                    Lv{c.level} {c.title}
                  </span>
                ))}
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-slate-400">
                  <span>
                    {hydrated ? stats.completed : 0}/{game.levels} levels
                  </span>
                  <span>
                    <span className="text-amber-300">★</span> {hydrated ? stats.stars : 0}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${game.accent}, ${game.accent2})` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {hydrated && totalDone > 0 && (
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Reset all progress and stars? This can't be undone.")) resetProgress();
            }}
            className="text-xs text-slate-500 underline-offset-4 transition hover:text-rose-300 hover:underline"
          >
            Reset progress
          </button>
        </div>
      )}
    </div>
  );
}
