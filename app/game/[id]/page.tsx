import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LevelMap from "@/components/LevelMap";
import { GAMES, getGame } from "@/lib/games";

export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: PageProps<"/game/[id]">): Promise<Metadata> {
  const { id } = await params;
  const game = getGame(id);
  return { title: game ? game.name : "Game", description: game?.tagline };
}

export default async function GamePage({ params }: PageProps<"/game/[id]">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();
  return <LevelMap gameId={game.id} />;
}
