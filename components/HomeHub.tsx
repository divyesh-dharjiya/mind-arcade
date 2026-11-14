"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { CATEGORIES, GAMES, TOTAL_LEVELS, getGame, type Category, type GameMeta } from "@/lib/games";
import { gameStats, resetProgress, useHydrated, useProgress, type Progress } from "@/lib/progress";
import { parseLast, setSetting, useLastRaw, useSettings } from "@/lib/settings";
import { sfx } from "@/lib/sfx";
import { GameArt, GameIcon } from "./GameArt";
import { BrandMark } from "./Logo";
import { WorldBg } from "./PlayScreen";
import { Btn } from "./ui/Btn";
import { Icon } from "./ui/Icon";

export default function HomeHub() {
  const progress = useProgress();
  const hydrated = useHydrated();
  const settings = useSettings();
  const last = parseLast(useLastRaw());
  const [tab, setTab] = useState<"All" | Category>("All");

  const totals = useMemo(() => {
    let stars = 0;
    let done = 0;
    for (const g of GAMES) {
      const s = gameStats(progress, g.id, g.levels);
      stars += s.stars;
      done += s.completed;
    }
    return { stars, done };
  }, [progress]);

  const lastGame = last ? getGame(last.gameId) : undefined;
  const continueLevel = lastGame && hydrated ? Math.min(lastGame.levels, Math.max(last!.level, gameStats(progress, lastGame.id, lastGame.levels).unlocked)) : 1;
  const shown = tab === "All" ? GAMES : GAMES.filter((g) => g.category === tab);

  return (
    <div className="relative min-h-dvh overflow-x-hidden" style={{ ["--accent" as string]: "#7c5cff", ["--accent2" as string]: "#ff4fb3" }}>
      <WorldBg />
      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#060818]/50 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <Logo />
            <div className="flex-1" />
            <div className="panel flex items-center gap-1.5 rounded-2xl px-3 py-2 font-display font-bold">
              <Icon name="star" className="h-5 w-5 text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.7)]" />
              <span className="tabular-nums">{hydrated ? totals.stars : 0}</span>
            </div>
            <Btn variant="dark" size="icon" ariaLabel={settings.sound ? "Mute" : "Sound on"} onClick={() => setSetting("sound", !settings.sound)}>
              <Icon name={settings.sound ? "sound" : "mute"} />
            </Btn>
          </div>
        </header>

        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-6 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="panel mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-white/80 lg:mx-0"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              {GAMES.length} games · {TOTAL_LEVELS} levels · 4 new
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.05 }}
              className="title-pop mt-5 text-6xl leading-[0.95] sm:text-7xl lg:text-8xl"
            >
              Mind
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent [text-shadow:none] drop-shadow-[0_4px_0_rgba(80,30,140,0.9)]">
                Arcade
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mx-auto mt-5 max-w-md text-lg text-white/70 lg:mx-0"
            >
              Brain games that look and play like the real thing. Every world adds a new rule — and the puzzles get properly hard.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
            >
              {hydrated && lastGame ? (
                <Btn variant="green" size="lg" href={`/game/${lastGame.id}/${continueLevel}`} className="shine">
                  <Icon name="play" className="h-6 w-6" /> CONTINUE
                  <span className="text-sm font-semibold opacity-80">
                    {lastGame.name} · {continueLevel}
                  </span>
                </Btn>
              ) : (
                <Btn variant="green" size="lg" href="/game/arrow-escape" className="shine">
                  <Icon name="play" className="h-6 w-6" /> START PLAYING
                </Btn>
              )}
              <Btn variant="purple" size="lg" href="#games">
                <Icon name="grid" className="h-6 w-6" /> All games
              </Btn>
            </motion.div>
            <div className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-3 lg:mx-0">
              {[
                ["Levels cleared", `${hydrated ? totals.done : 0}`, `/${TOTAL_LEVELS}`],
                ["Stars", `${hydrated ? totals.stars : 0}`, `/${TOTAL_LEVELS * 3}`],
                ["Games", `${GAMES.length}`, ""],
              ].map(([label, v, of]) => (
                <div key={label} className="panel rounded-2xl px-3 py-3 text-center">
                  <div className="font-display text-2xl font-bold tabular-nums text-white">
                    {v}
                    <span className="text-sm text-white/35">{of}</span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <IconCloud />
        </section>

        <section id="games" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 pt-8">
          <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
            {(["All", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  sfx.click(4);
                  setTab(c);
                }}
                className="relative shrink-0 rounded-2xl px-5 py-2.5 font-display text-sm font-bold text-white/70 transition hover:text-white"
              >
                {tab === c && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-2xl bg-white/12 ring-1 ring-white/20"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <span className={`relative ${tab === c ? "text-white" : ""}`}>{c}</span>
              </button>
            ))}
          </div>

          <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((g, i) => (
              <GameCard key={g.id} game={g} index={i} progress={progress} hydrated={hydrated} />
            ))}
          </motion.div>

          {hydrated && totals.done > 0 && (
            <div className="mt-14 text-center">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Reset all progress and stars? This can't be undone.")) resetProgress();
                }}
                className="text-xs text-white/35 underline-offset-4 transition hover:text-rose-300 hover:underline"
              >
                Reset progress
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <BrandMark size={42} className="transition-transform hover:rotate-[-6deg] hover:scale-105" />
      <span className="font-display text-xl font-bold tracking-tight text-white">
        Mind<span className="text-fuchsia-300">Arcade</span>
      </span>
    </Link>
  );
}

function IconCloud() {
  const spots = [
    [12, 10], [52, 2], [80, 18], [6, 48], [40, 36], [74, 52], [20, 80], [55, 72], [86, 84], [32, 62], [62, 30], [90, 40],
  ];
  return (
    <div className="relative mx-auto hidden aspect-square w-full max-w-[460px] sm:block">
      <div className="absolute inset-[18%] rounded-full bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 blur-3xl" />
      {GAMES.map((g, i) => {
        const [x, y] = spots[i % spots.length];
        const size = i % 3 === 0 ? 86 : i % 3 === 1 ? 68 : 58;
        return (
          <motion.div
            key={g.id}
            className="absolute"
            style={{ left: `${x}%`, top: `${y}%` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
            transition={{
              opacity: { delay: 0.1 + i * 0.05 },
              scale: { type: "spring", stiffness: 260, damping: 14, delay: 0.1 + i * 0.05 },
              y: { duration: 3 + (i % 4) * 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 },
            }}
          >
            <Link href={`/game/${g.id}`} aria-label={g.name} className="block -rotate-6 transition-transform hover:rotate-0 hover:scale-110">
              <GameIcon game={g} size={size} />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

function GameCard({ game, index, progress, hydrated }: { game: GameMeta; index: number; progress: Progress; hydrated: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const s = gameStats(progress, game.id, game.levels);
  const pct = hydrated ? (s.completed / game.levels) * 100 : 0;

  const onMove = (e: RPointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateY(-6px)`;
    el.style.setProperty("--mx", `${(px + 0.5) * 100}%`);
    el.style.setProperty("--my", `${(py + 0.5) * 100}%`);
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), type: "spring", stiffness: 260, damping: 24 }}
    >
      <Link
        ref={ref}
        href={`/game/${game.id}`}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onClick={() => sfx.tap()}
        className="group relative block overflow-hidden rounded-[26px] border border-white/10 bg-[#0d1230]/80 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] transition-[transform,box-shadow] duration-200 ease-out will-change-transform hover:shadow-[0_30px_60px_-20px_var(--glow)]"
        style={{ ["--glow" as string]: game.accent }}
      >
        <div className="relative overflow-hidden">
          <GameArt game={game} className="block aspect-[200/130] w-full transition-transform duration-500 group-hover:scale-[1.06]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: "radial-gradient(400px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.18), transparent 45%)" }}
          />
          <div className="absolute left-3 top-3 flex gap-2">
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/85 backdrop-blur">
              {game.category}
            </span>
          </div>
          {game.isNew && (
            <span className="absolute right-3 top-3 animate-wiggle rounded-full bg-gradient-to-b from-yellow-300 to-amber-500 px-2.5 py-1 font-display text-xs font-bold text-amber-950 shadow-[0_3px_0_#92400e]">
              NEW
            </span>
          )}
          <span className="btn3d green absolute bottom-3 right-3 h-11 w-11 translate-y-3 rounded-2xl opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <Icon name="play" className="h-5 w-5" />
          </span>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <GameIcon game={game} size={38} />
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg font-bold text-white">{game.name}</h3>
              <p className="truncate text-xs text-white/55">{game.tagline}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/40">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${game.accent}, ${game.accent2})` }} />
            </div>
            <span className="flex items-center gap-1 font-display text-sm font-bold text-white/80">
              <Icon name="star" className="h-4 w-4 text-amber-300" />
              {hydrated ? s.stars : 0}
              <span className="text-xs text-white/35">/{s.maxStars}</span>
            </span>
          </div>
          <div className="mt-1.5 text-[11px] font-semibold text-white/40">
            {hydrated ? s.completed : 0}/{game.levels} levels
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
