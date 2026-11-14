"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { conceptAt, getGame, worldOf, type GameId, type GameMeta } from "@/lib/games";
import { gameStats, saveStars, useHydrated, useProgress } from "@/lib/progress";
import { rememberLast, setSetting, useSettings } from "@/lib/settings";
import { sfx } from "@/lib/sfx";
import { burstAt, confetti } from "@/lib/fx";
import type { GameProps, ResultStat } from "@/games/types";
import FxLayer from "./FxLayer";
import { GameIcon } from "./GameArt";
import { Btn } from "./ui/Btn";
import { Icon } from "./ui/Icon";

function Loading() {
  return (
    <div className="mt-24 flex flex-col items-center gap-3 text-white/60">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-white/70" />
      <span className="font-display text-sm tracking-wider">LOADING</span>
    </div>
  );
}

const GAME_COMPONENTS: Record<GameId, ComponentType<GameProps>> = {
  "arrow-escape": dynamic(() => import("@/games/ArrowEscape"), { ssr: false, loading: Loading }),
  "brick-breaker": dynamic(() => import("@/games/BrickBreaker"), { ssr: false, loading: Loading }),
  "light-flip": dynamic(() => import("@/games/LightFlip"), { ssr: false, loading: Loading }),
  "slide-puzzle": dynamic(() => import("@/games/SlidePuzzle"), { ssr: false, loading: Loading }),
  "memory-match": dynamic(() => import("@/games/MemoryMatch"), { ssr: false, loading: Loading }),
  "pattern-recall": dynamic(() => import("@/games/PatternRecall"), { ssr: false, loading: Loading }),
  "color-sort": dynamic(() => import("@/games/ColorSort"), { ssr: false, loading: Loading }),
  "pipe-connect": dynamic(() => import("@/games/PipeConnect"), { ssr: false, loading: Loading }),
  "block-fit": dynamic(() => import("@/games/BlockFit"), { ssr: false, loading: Loading }),
  "gem-swap": dynamic(() => import("@/games/GemSwap"), { ssr: false, loading: Loading }),
  "laser-lab": dynamic(() => import("@/games/LaserLab"), { ssr: false, loading: Loading }),
  sudoku: dynamic(() => import("@/games/Sudoku"), { ssr: false, loading: Loading }),
};

type Phase = "intro" | "play" | "won" | "lost";

export function themeVars(game: GameMeta): CSSProperties {
  return {
    ["--accent" as string]: game.accent,
    ["--accent2" as string]: game.accent2,
    ["--bg1" as string]: game.bg[0],
    ["--bg2" as string]: game.bg[1],
  };
}

export function WorldBg() {
  return (
    <div className="game-bg" aria-hidden>
      <div className="grid" />
      <div className="stars" />
    </div>
  );
}

export default function PlayScreen({ gameId, level }: { gameId: GameId; level: number }) {
  const game = getGame(gameId)!;
  const progress = useProgress();
  const hydrated = useHydrated();
  const { unlocked } = gameStats(progress, gameId, game.levels);
  const concept = conceptAt(game, level);
  const settings = useSettings();

  const [phase, setPhase] = useState<Phase>("intro");
  const [attempt, setAttempt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [win, setWin] = useState<{ stars: number; best: number; stats: ResultStat[] } | null>(null);
  const [loseReason, setLoseReason] = useState("");

  useEffect(() => {
    rememberLast(gameId, level);
  }, [gameId, level]);

  const onWin = useCallback(
    (stars: number, stats: ResultStat[] = []) => {
      const prev = progress[gameId]?.[level] ?? 0;
      saveStars(gameId, level, stars);
      setWin({ stars, best: Math.max(prev, stars), stats });
      window.setTimeout(() => setPhase("won"), 350);
    },
    [gameId, level, progress],
  );
  const onLose = useCallback((reason: string) => {
    setLoseReason(reason);
    window.setTimeout(() => setPhase("lost"), 450);
  }, []);

  const start = () => {
    sfx.start();
    setPhase("play");
  };
  const restart = () => {
    setPaused(false);
    setWin(null);
    setAttempt((a) => a + 1);
    sfx.start();
    setPhase("play");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase === "play") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const Game = GAME_COMPONENTS[gameId];
  const mapHref = `/game/${gameId}`;
  const locked = hydrated && level > unlocked;

  return (
    <div className="relative min-h-dvh overflow-x-hidden" style={themeVars(game)}>
      <WorldBg />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-3 py-3 sm:px-5">
          <Btn href={mapHref} variant="dark" size="icon" ariaLabel="Back to level map">
            <Icon name="back" />
          </Btn>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <GameIcon game={game} size={40} />
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-bold leading-tight text-white">{game.name}</div>
              <div className="font-display text-xs font-semibold tracking-wider" style={{ color: game.accent }}>
                LEVEL {level} <span className="text-white/40">/ {game.levels}</span>
              </div>
            </div>
          </div>
          <Btn
            variant="dark"
            size="icon"
            ariaLabel={settings.sound ? "Mute sound" : "Turn sound on"}
            onClick={() => setSetting("sound", !settings.sound)}
            className="hidden sm:inline-flex"
          >
            <Icon name={settings.sound ? "sound" : "mute"} />
          </Btn>
          <Btn variant="yellow" size="icon" ariaLabel="Pause" onClick={() => phase === "play" && setPaused(true)} disabled={phase !== "play"}>
            <Icon name="pause" />
          </Btn>
        </header>

        <main className="flex flex-1 flex-col items-center px-3 pb-10 pt-1 sm:px-5">
          {!hydrated ? (
            <Loading />
          ) : locked ? (
            <LockedCard game={game} unlocked={unlocked} />
          ) : phase === "intro" ? null : (
            <motion.div
              key={attempt}
              className="flex w-full flex-col items-center"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            >
              <Game level={level} paused={paused || phase !== "play"} onWin={onWin} onLose={onLose} />
            </motion.div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {hydrated && !locked && phase === "intro" && (
          <Overlay key="intro">
            <LevelIntro game={game} level={level} concept={concept} onStart={start} />
          </Overlay>
        )}
        {paused && (
          <Overlay key="pause" onBackdrop={() => setPaused(false)}>
            <PauseMenu game={game} onResume={() => setPaused(false)} onRestart={restart} mapHref={mapHref} />
          </Overlay>
        )}
        {phase === "won" && win && (
          <Overlay key="won">
            <WinCard game={game} level={level} result={win} onReplay={restart} mapHref={mapHref} />
          </Overlay>
        )}
        {phase === "lost" && (
          <Overlay key="lost">
            <LoseCard reason={loseReason} onRetry={restart} mapHref={mapHref} />
          </Overlay>
        )}
      </AnimatePresence>
      <FxLayer />
    </div>
  );
}

function Overlay({ children, onBackdrop }: { children: ReactNode; onBackdrop?: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#050816]/70 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onBackdrop}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm"
        initial={{ scale: 0.6, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 24 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function CardShell({ title, tone = "accent", children }: { title: string; tone?: "accent" | "red"; children: ReactNode }) {
  return (
    <div className="panel relative mt-8 rounded-[32px] px-6 pb-7 pt-12 text-center">
      <div
        className="ribbon absolute -top-7 left-1/2 flex h-14 min-w-[78%] -translate-x-1/2 items-center justify-center rounded-2xl px-6 font-display text-2xl font-bold tracking-wide text-white"
        style={tone === "red" ? { background: "linear-gradient(180deg,#fb7185,#be123c)" } : undefined}
      >
        <span className="drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]">{title}</span>
      </div>
      {children}
    </div>
  );
}

function LevelIntro({
  game,
  level,
  concept,
  onStart,
}: {
  game: GameMeta;
  level: number;
  concept?: { title: string; text: string };
  onStart: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);

  return (
    <CardShell title={`LEVEL ${level}`}>
      <div className="mb-1 font-display text-xs font-bold uppercase tracking-[0.25em] text-white/50">
        World {worldOf(game, level)} · {game.name}
      </div>
      {concept && level > 1 ? (
        <>
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: -6 }}
            transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.15 }}
            className="mx-auto my-3 inline-block rounded-full bg-gradient-to-b from-yellow-300 to-amber-500 px-4 py-1 font-display text-sm font-bold text-amber-950 shadow-[0_4px_0_#92400e]"
          >
            NEW RULE!
          </motion.div>
          <h2 className="title-pop text-3xl">{concept.title}</h2>
          <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-white/80">{concept.text}</p>
        </>
      ) : concept ? (
        <>
          <h2 className="title-pop mt-3 text-3xl">{concept.title}</h2>
          <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-white/80">{concept.text}</p>
        </>
      ) : (
        <>
          <div className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10" style={{ color: game.accent }}>
            <Icon name="target" className="h-9 w-9" />
          </div>
          <p className="mt-3 font-display text-xl font-semibold text-white">{game.goal}</p>
          <p className="mt-1 text-sm text-white/55">Earn up to 3 stars.</p>
        </>
      )}
      <Btn variant="green" size="lg" className="mt-7 w-full" onClick={onStart} silent autoFocus>
        <Icon name="play" className="h-6 w-6" /> PLAY
      </Btn>
    </CardShell>
  );
}

function PauseMenu({ game, onResume, onRestart, mapHref }: { game: GameMeta; onResume: () => void; onRestart: () => void; mapHref: string }) {
  const s = useSettings();
  return (
    <CardShell title="PAUSED">
      <div className="mb-5 text-sm text-white/60">{game.name}</div>
      <div className="flex flex-col gap-3">
        <Btn variant="green" size="lg" onClick={onResume} autoFocus>
          <Icon name="play" className="h-6 w-6" /> Resume
        </Btn>
        <Btn variant="yellow" size="md" onClick={onRestart}>
          <Icon name="restart" /> Restart level
        </Btn>
        <div className="grid grid-cols-2 gap-3">
          <Btn variant="dark" size="md" onClick={() => setSetting("sound", !s.sound)}>
            <Icon name={s.sound ? "sound" : "mute"} /> {s.sound ? "Sound on" : "Muted"}
          </Btn>
          <Btn variant="dark" size="md" onClick={() => setSetting("haptics", !s.haptics)}>
            <Icon name="vibrate" /> {s.haptics ? "Buzz on" : "Buzz off"}
          </Btn>
        </div>
        <Btn variant="red" size="md" href={mapHref}>
          <Icon name="map" /> Level map
        </Btn>
      </div>
    </CardShell>
  );
}

function WinCard({
  game,
  level,
  result,
  onReplay,
  mapHref,
}: {
  game: GameMeta;
  level: number;
  result: { stars: number; best: number; stats: ResultStat[] };
  onReplay: () => void;
  mapHref: string;
}) {
  const starRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [shown, setShown] = useState(0);
  const hasNext = level < game.levels;

  useEffect(() => {
    sfx.win();
    confetti([game.accent, game.accent2, "#fde047", "#ffffff", "#f472b6"]);
    const timers: number[] = [];
    for (let i = 0; i < result.stars; i++) {
      timers.push(
        window.setTimeout(() => {
          setShown(i + 1);
          sfx.star(i);
          burstAt(starRefs.current[i], { colors: ["#fde047", "#fbbf24", "#fff"], count: 22, kind: "star", speed: 260, size: 5 });
        }, 550 + i * 380),
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [result.stars, game.accent, game.accent2]);

  const word = result.stars === 3 ? "PERFECT!" : result.stars === 2 ? "GREAT!" : "CLEARED!";

  return (
    <CardShell title={word}>
      <div className="font-display text-sm font-bold tracking-[0.25em] text-white/55">LEVEL {level} COMPLETE</div>
      <div className="my-5 flex items-end justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} ref={(el) => { starRefs.current[i] = el; }} className={`relative ${i === 1 ? "-translate-y-4" : ""}`}>
            <svg viewBox="0 0 24 24" className={i === 1 ? "h-20 w-20" : "h-16 w-16"}>
              <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.3l-5.6 2.9 1.1-6.3L2.9 9.5l6.3-.9z" fill="#0b1026" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
            </svg>
            <AnimatePresence>
              {i < shown && (
                <motion.svg
                  viewBox="0 0 24 24"
                  className={`absolute inset-0 ${i === 1 ? "h-20 w-20" : "h-16 w-16"} drop-shadow-[0_0_14px_rgba(253,224,71,0.8)]`}
                  initial={{ scale: 2.6, rotate: -90, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 13 }}
                >
                  <defs>
                    <linearGradient id={`win-star-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#fff7ad" />
                      <stop offset="0.5" stopColor="#fde047" />
                      <stop offset="1" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.3l-5.6 2.9 1.1-6.3L2.9 9.5l6.3-.9z" fill={`url(#win-star-${i})`} stroke="#b45309" strokeWidth={0.8} />
                </motion.svg>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {result.stats.length > 0 && (
        <div className="mx-auto mb-5 grid max-w-[260px] gap-1.5">
          {result.stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + i * 0.12 }}
              className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-1.5 text-sm"
            >
              <span className="text-white/60">{s.label}</span>
              <span className="font-display font-bold text-white">{s.value}</span>
            </motion.div>
          ))}
        </div>
      )}
      {result.stars < 3 && <p className="mb-4 text-xs text-white/50">Replay for all 3 stars{result.best > result.stars ? ` · best ${result.best}★` : ""}.</p>}

      <div className="flex flex-col gap-3">
        {hasNext ? (
          <Btn variant="green" size="lg" href={`/game/${game.id}/${level + 1}`} className="shine">
            NEXT LEVEL <Icon name="play" className="h-5 w-5" />
          </Btn>
        ) : (
          <Btn variant="yellow" size="lg" href="/">
            <Icon name="trophy" className="h-6 w-6" /> ALL CLEAR!
          </Btn>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Btn variant="dark" onClick={onReplay}>
            <Icon name="restart" /> Replay
          </Btn>
          <Btn variant="dark" href={mapHref}>
            <Icon name="map" /> Map
          </Btn>
        </div>
      </div>
    </CardShell>
  );
}

function LoseCard({ reason, onRetry, mapHref }: { reason: string; onRetry: () => void; mapHref: string }) {
  useEffect(() => {
    sfx.lose();
  }, []);
  return (
    <CardShell title="OUT OF LUCK" tone="red">
      <motion.div
        className="mx-auto mt-2 flex h-20 w-20 items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1, rotate: [0, -12, 10, -6, 0] }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <svg viewBox="0 0 24 24" className="h-20 w-20 drop-shadow-[0_0_14px_rgba(244,63,94,0.6)]">
          <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 2.9 4.5 6.7 4.5c2.2 0 3.6 1.2 4.3 2.4.7-1.2 2.1-2.4 4.3-2.4 3.8 0 5.8 4 4.3 7.3C19.5 16.4 12 21 12 21z" fill="#f43f5e" />
          <path d="M12 7l-1.8 4 2.6 1.6L11 17" stroke="#0b1026" strokeWidth={1.6} fill="none" strokeLinejoin="round" />
        </svg>
      </motion.div>
      <p className="mx-auto mb-6 mt-3 max-w-xs text-white/75">{reason}</p>
      <div className="flex flex-col gap-3">
        <Btn variant="green" size="lg" onClick={onRetry} autoFocus>
          <Icon name="restart" className="h-6 w-6" /> TRY AGAIN
        </Btn>
        <Btn variant="dark" href={mapHref}>
          <Icon name="map" /> Level map
        </Btn>
      </div>
    </CardShell>
  );
}

function LockedCard({ game, unlocked }: { game: GameMeta; unlocked: number }) {
  return (
    <div className="mt-16 w-full max-w-sm">
      <CardShell title="LOCKED">
        <div className="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white/70">
          <Icon name="lock" className="h-9 w-9" />
        </div>
        <p className="mt-4 text-white/70">Clear level {unlocked} first to unlock this one.</p>
        <Btn variant="green" size="lg" className="mt-6 w-full" href={`/game/${game.id}/${unlocked}`}>
          PLAY LEVEL {unlocked}
        </Btn>
        <Link href={`/game/${game.id}`} className="mt-4 inline-block text-sm text-white/50 hover:text-white">
          Back to map
        </Link>
      </CardShell>
    </div>
  );
}
