"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import { getGame, type GameId } from "@/lib/games";
import { gameStats, useHydrated, useProgress } from "@/lib/progress";
import { sfx } from "@/lib/sfx";
import { GameArt, GameIcon } from "./GameArt";
import { themeVars, WorldBg } from "./PlayScreen";
import { Btn } from "./ui/Btn";
import { Icon } from "./ui/Icon";

const STEP = 96;
const BANNER = 176;
const TOP = 70;

export default function LevelMap({ gameId }: { gameId: GameId }) {
  const game = getGame(gameId)!;
  const progress = useProgress();
  const hydrated = useHydrated();
  const stats = gameStats(progress, gameId, game.levels);
  const stars = progress[gameId] ?? {};
  const currentRef = useRef<HTMLAnchorElement>(null);
  const unlocked = hydrated ? stats.unlocked : 1;
  const current = hydrated && !(stars[unlocked] > 0) ? unlocked : -1;

  const layout = useMemo(() => {
    const items: ({ kind: "node"; level: number; x: number; y: number } | { kind: "banner"; idx: number; y: number })[] = [];
    let y = TOP;
    for (let l = 1; l <= game.levels; l++) {
      const ci = game.concepts.findIndex((c) => c.level === l);
      if (ci >= 0) {
        items.push({ kind: "banner", idx: ci, y: y - 18 });
        y += BANNER;
      }
      // rounded so server and browser serialise identical numbers (no hydration mismatch)
      const x = Math.round((50 + Math.sin((l - 1) * 0.95) * 30) * 100) / 100;
      items.push({ kind: "node", level: l, x, y });
      y += STEP;
    }
    return { items, height: y };
  }, [game]);

  const nodes = layout.items.filter((i): i is { kind: "node"; level: number; x: number; y: number } => i.kind === "node");
  const pathFor = (upto: number) => {
    const pts = nodes.filter((n) => n.level <= upto);
    if (!pts.length) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const my = (a.y + b.y) / 2;
      d += ` C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
    }
    return d;
  };

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 350);
    return () => window.clearTimeout(t);
  }, [hydrated]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden" style={themeVars(game)}>
      <WorldBg />
      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#060818]/55 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <Btn href="/" variant="dark" size="icon" ariaLabel="All games">
              <Icon name="home" />
            </Btn>
            <GameIcon game={game} size={40} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-xl font-bold text-white">{game.name}</h1>
              <div className="text-xs font-semibold text-white/50">
                {hydrated ? stats.completed : 0}/{game.levels} levels
              </div>
            </div>
            <div className="panel flex items-center gap-1.5 rounded-2xl px-3 py-2 font-display font-bold">
              <Icon name="star" className="h-5 w-5 text-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.7)]" />
              <span className="tabular-nums">{hydrated ? stats.stars : 0}</span>
              <span className="text-xs text-white/40">/{stats.maxStars}</span>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-3xl px-4 pt-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel overflow-hidden rounded-[28px]"
          >
            <div className="relative">
              <GameArt game={game} className="block aspect-[200/90] w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060818] via-[#060818]/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                  {game.category}
                </span>
                <h2 className="title-pop mt-2 text-4xl sm:text-5xl">{game.name}</h2>
                <p className="mt-1 text-white/75">{game.tagline}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 p-5 pt-3">
              <div className="min-w-[160px] flex-1">
                <div className="mb-1.5 flex justify-between text-xs font-semibold text-white/55">
                  <span>Progress</span>
                  <span>{Math.round(((hydrated ? stats.completed : 0) / game.levels) * 100)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-black/40 shadow-inner">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${game.accent}, ${game.accent2})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${((hydrated ? stats.completed : 0) / game.levels) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
              <Btn variant="green" size="lg" href={`/game/${game.id}/${unlocked}`} className="shine">
                <Icon name="play" className="h-6 w-6" /> PLAY LEVEL {unlocked}
              </Btn>
            </div>
          </motion.div>
        </section>

        <section className="relative mx-auto mt-6 max-w-md px-4 pb-24" style={{ height: layout.height + 40 }}>
          <div className="absolute inset-x-4 top-0" style={{ height: layout.height }}>
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 100 ${layout.height}`} preserveAspectRatio="none" aria-hidden>
            <path d={pathFor(game.levels)} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth={26} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path d={pathFor(game.levels)} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={20} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path d={pathFor(game.levels)} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2.5} strokeDasharray="2 12" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            {hydrated && unlocked > 1 && (
              <motion.path
                d={pathFor(unlocked)}
                fill="none"
                stroke={game.accent}
                strokeWidth={10}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, ease: "easeInOut" }}
                style={{ filter: `drop-shadow(0 0 8px ${game.accent})` }}
              />
            )}
          </svg>

          {layout.items.map((it) => {
            if (it.kind === "banner") {
              const c = game.concepts[it.idx];
              return (
                <motion.div
                  key={`b${it.idx}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  className="panel absolute inset-x-0 z-10 rounded-3xl p-4"
                  style={{ top: it.y }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="tile3d flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl font-display leading-none text-white"
                      style={{ background: `linear-gradient(145deg, ${game.accent}, ${game.accent2})`, ["--edge" as string]: "rgba(0,0,0,0.4)" }}
                    >
                      <span className="text-[9px] font-bold tracking-widest opacity-80">WORLD</span>
                      <span className="text-xl font-bold">{it.idx + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-lg font-bold text-white">
                        {c.title} <span className="ml-1 text-xs font-semibold text-white/40">from Lv {c.level}</span>
                      </div>
                      <p className="line-clamp-2 text-xs leading-relaxed text-white/60">{c.text}</p>
                    </div>
                  </div>
                </motion.div>
              );
            }
            const s = stars[it.level] ?? 0;
            const isLocked = !hydrated || it.level > unlocked;
            const isCurrent = it.level === current;
            const size = isCurrent ? 76 : 62;
            const node = (
              <span className="relative flex flex-col items-center">
                {isCurrent && (
                  <>
                    <span className="absolute inset-0 animate-pulse-ring rounded-full" style={{ background: game.accent, width: size, height: size }} />
                    <span className="absolute -top-12 animate-bob rounded-xl bg-white px-2.5 py-1 font-display text-xs font-bold text-slate-900 shadow-lg">
                      PLAY
                      <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-white" />
                    </span>
                  </>
                )}
                <span
                  className="tile3d relative flex items-center justify-center rounded-full font-display font-bold"
                  style={{
                    width: size,
                    height: size,
                    fontSize: isCurrent ? 28 : 22,
                    background: isLocked
                      ? "linear-gradient(180deg,#3b4366,#232945)"
                      : `radial-gradient(circle at 35% 30%, #fff8, transparent 40%), linear-gradient(160deg, ${game.accent}, ${game.accent2})`,
                    ["--edge" as string]: isLocked ? "#141833" : `color-mix(in oklab, ${game.accent2} 55%, black)`,
                    color: isLocked ? "rgba(255,255,255,0.35)" : "#fff",
                    textShadow: isLocked ? undefined : "0 2px 0 rgba(0,0,0,0.3)",
                  }}
                >
                  {isLocked ? <Icon name="lock" className="h-6 w-6" /> : it.level}
                </span>
                {!isLocked && (
                  <span className="absolute -bottom-5 flex gap-0.5">
                    {[0, 1, 2].map((k) => (
                      <Icon
                        key={k}
                        name="star"
                        className={`h-4 w-4 ${k === 1 ? "-translate-y-0.5" : ""} ${k < s ? "text-amber-300 drop-shadow-[0_0_4px_rgba(252,211,77,0.8)]" : "text-black/45"}`}
                      />
                    ))}
                  </span>
                )}
              </span>
            );
            const pos = { left: `${it.x}%`, top: it.y };
            return isLocked ? (
              <div key={it.level} className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={pos} aria-label={`Level ${it.level}, locked`}>
                {node}
              </div>
            ) : (
              <Link
                key={it.level}
                ref={isCurrent ? currentRef : undefined}
                href={`/game/${game.id}/${it.level}`}
                onClick={() => sfx.tap()}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 active:scale-95"
                style={pos}
                aria-label={`Level ${it.level}${s ? `, ${s} stars` : ""}`}
              >
                {node}
              </Link>
            );
          })}
          </div>
        </section>
      </div>
    </div>
  );
}
