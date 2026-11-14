import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PlayScreen from "@/components/PlayScreen";
import { GAMES, getGame } from "@/lib/games";

export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES.flatMap((g) =>
    Array.from({ length: g.levels }, (_, i) => ({ id: g.id, level: String(i + 1) })),
  );
}

export async function generateMetadata({ params }: PageProps<"/game/[id]/[level]">): Promise<Metadata> {
  const { id, level } = await params;
  const game = getGame(id);
  return { title: game ? `${game.name} · Level ${level}` : "Play" };
}

export default async function PlayPage({ params }: PageProps<"/game/[id]/[level]">) {
  const { id, level } = await params;
  const game = getGame(id);
  const n = Number(level);
  if (!game || !Number.isInteger(n) || n < 1 || n > game.levels) notFound();
  // Keyed so moving to the next level always starts a fresh game.
  return <PlayScreen key={`${game.id}-${n}`} gameId={game.id} level={n} />;
}
