"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState, type ComponentType } from "react";
import { activeConcepts, conceptAt, getGame, type GameId } from "@/lib/games";
import { gameStats, saveStars, useHydrated, useProgress } from "@/lib/progress";
import type { GameProps } from "@/games/types";
import { GameIcon, StarIcon } from "./GameIcon";

function Loading() {
  return <div className="mx-auto mt-16 h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-white/60" />;
}

const GAME_COMPONENTS: Record<GameId, ComponentType<GameProps>> = {
  "brick-breaker": dynamic(() => import("@/games/BrickBreaker"), { ssr: false, loading: Loading }),
  "arrow-escape": dynamic(() => import("@/games/ArrowEscape"), { ssr: false, loading: Loading }),
  "light-flip": dynamic(() => import("@/games/LightFlip"), { ssr: false, loading: Loading }),
  "slide-puzzle": dynamic(() => import("@/games/SlidePuzzle"), { ssr: false, loading: Loading }),
  "memory-match": dynamic(() => import("@/games/MemoryMatch"), { ssr: false, loading: Loading }),
  "pattern-recall": dynamic(() => import("@/games/PatternRecall"), { ssr: false, loading: Loading }),
  "color-sort": dynamic(() => import("@/games/ColorSort"), { ssr: false, loading: Loading }),
  "pipe-connect": dynamic(() => import("@/games/PipeConnect"), { ssr: false, loading: Loading }),
};

type Result = { type: "win"; stars: number } | { type: "lose"; reason: string } | null;

export default function PlayScreen({ gameId, level }: { gameId: GameId; level: number }) {
  const game = getGame(gameId)!;
  const progress = useProgress();
  const hydrated = useHydrated();
  const { unlocked } = gameStats(progress, gameId, game.levels);
  const concept = conceptAt(game, level);

  const [attempt, setAttempt] = useState(0);
  const [started, setStarted] = useState(!concept);
  const [result, setResult] = useState<Result>(null);
  const [help, setHelp] = useState(false);

  const onWin = useCallback(
    (stars: number) => {
      saveStars(gameId, level, stars);
      setResult({ type: "win", stars });
    },
    [gameId, level],
  );
  const onLose = useCallback((reason: string) => setResult({ type: "lose", reason }), []);

  const restart = () => {
    setResult(null);
    setStarted(true);
    setAttempt((a) => a + 1);
  };

  const Game = GAME_COMPONENTS[gameId];
  const hasNext = level < game.levels;
  const levelsHref = `/game/${gameId}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-10">
      <header className="sticky top-0 z-20 -mx-4 mb-4 flex items-center gap-3 border-b border-white/5 bg-[#070b1a]/80 px-4 py-3 backdrop-blur">
        <Link
          href={levelsHref}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg transition hover:bg-white/10"
          aria-label="Back to levels"
        >
          ←
        </Link>
        <GameIcon game={game} size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-semibold leading-tight">{game.name}</h1>
          <p className="text-xs text-slate-400">
            Level {level} of {game.levels}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHelp(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 font-semibold transition hover:bg-white/10"
          aria-label="How to play"
        >
          ?
        </button>
        <button
          type="button"
          onClick={restart}
          className="flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium transition hover:bg-white/10"
        >
          ↻ <span className="hidden sm:inline">Restart</span>
        </button>
      </header>

      {!hydrated ? (
        <Loading />
      ) : level > unlocked ? (
        <div className="mx-auto mt-16 max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mb-3 text-4xl">🔒</div>
          <h2 className="font-display text-xl font-semibold">Level {level} is locked</h2>
          <p className="mt-2 text-sm text-slate-400">Clear level {unlocked} first to unlock it.</p>
          <Link
            href={`/game/${gameId}/${unlocked}`}
            className="mt-6 inline-block rounded-full px-6 py-2.5 font-semibold text-slate-950"
            style={{ background: `linear-gradient(135deg, ${game.accent}, ${game.accent2})` }}
          >
            Play level {unlocked}
          </Link>
        </div>
      ) : !started && concept ? (
        <ConceptCard
          accent={game.accent}
          accent2={game.accent2}
          title={concept.title}
          text={concept.text}
          isNew={level > 1}
          onStart={() => setStarted(true)}
        />
      ) : (
        <div className="animate-rise">
          <Game key={attempt} level={level} onWin={onWin} onLose={onLose} />
        </div>
      )}

      {result && (
        <Modal>
          {result.type === "win" ? (
            <>
              <div className="mb-2 text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: game.accent }}>
                Level {level} clear
              </div>
              <h2 className="font-display text-3xl font-bold">
                {result.stars === 3 ? "Brilliant!" : result.stars === 2 ? "Great job!" : "Solved!"}
              </h2>
              <div className="my-5 flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="animate-star" style={{ animationDelay: `${150 + i * 180}ms` }}>
                    <StarIcon on={i < result.stars} size={44} />
                  </span>
                ))}
              </div>
              {result.stars < 3 && <p className="mb-5 text-sm text-slate-400">Replay to earn all 3 stars.</p>}
              <div className="flex flex-col gap-2">
                {hasNext ? (
                  <Link
                    href={`/game/${gameId}/${level + 1}`}
                    className="rounded-full px-6 py-3 font-semibold text-slate-950 transition hover:brightness-110"
                    style={{ background: `linear-gradient(135deg, ${game.accent}, ${game.accent2})` }}
                  >
                    Next level →
                  </Link>
                ) : (
                  <Link
                    href="/"
                    className="rounded-full px-6 py-3 font-semibold text-slate-950"
                    style={{ background: `linear-gradient(135deg, ${game.accent}, ${game.accent2})` }}
                  >
                    🏆 All levels done — pick another game
                  </Link>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={restart} className="flex-1 rounded-full border border-white/15 bg-white/5 py-2.5 text-sm font-medium hover:bg-white/10">
                    Replay
                  </button>
                  <Link href={levelsHref} className="flex-1 rounded-full border border-white/15 bg-white/5 py-2.5 text-sm font-medium hover:bg-white/10">
                    Levels
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-2 text-4xl">😵‍💫</div>
              <h2 className="font-display text-3xl font-bold">Level failed</h2>
              <p className="mb-6 mt-2 text-sm text-slate-400">{result.reason}</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={restart}
                  className="rounded-full px-6 py-3 font-semibold text-slate-950 hover:brightness-110"
                  style={{ background: `linear-gradient(135deg, ${game.accent}, ${game.accent2})` }}
                >
                  Try again
                </button>
                <Link href={levelsHref} className="rounded-full border border-white/15 bg-white/5 py-2.5 text-sm font-medium hover:bg-white/10">
                  Levels
                </Link>
              </div>
            </>
          )}
        </Modal>
      )}

      {help && (
        <Modal onClose={() => setHelp(false)}>
          <h2 className="mb-4 font-display text-2xl font-bold">How to play</h2>
          <ul className="space-y-3 text-left">
            {activeConcepts(game, level).map((c) => (
              <li key={c.level} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-semibold" style={{ color: game.accent }}>
                  {c.title} <span className="text-xs font-normal text-slate-500">· from level {c.level}</span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{c.text}</p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setHelp(false)}
            className="mt-5 w-full rounded-full border border-white/15 bg-white/5 py-2.5 text-sm font-medium hover:bg-white/10"
          >
            Back to game
          </button>
        </Modal>
      )}
    </div>
  );
}

function ConceptCard({
  accent,
  accent2,
  title,
  text,
  isNew,
  onStart,
}: {
  accent: string;
  accent2: string;
  title: string;
  text: string;
  isNew: boolean;
  onStart: () => void;
}) {
  return (
    <div className="mx-auto mt-10 w-full max-w-md animate-rise rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-8 text-center shadow-2xl">
      <div
        className="mx-auto mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-950"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent2})` }}
      >
        {isNew ? "New concept" : "How to play"}
      </div>
      <h2 className="font-display text-3xl font-bold">{title}</h2>
      <p className="mt-3 text-slate-300">{text}</p>
      <button
        type="button"
        onClick={onStart}
        autoFocus
        className="mt-7 w-full rounded-full px-6 py-3 font-semibold text-slate-950 transition hover:brightness-110"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent2})` }}
      >
        Got it — let&apos;s play
      </button>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-sm animate-rise overflow-y-auto rounded-3xl border border-white/10 bg-[#0d1328] p-7 text-center shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}
