import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LevelSelect from "@/components/LevelSelect";
import { GAMES, getGame } from "@/lib/games";

export const dynamicParams = false;

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: PageProps<"/game/[id]">): Promise<Metadata> {
  const { id } = await params;
  const game = getGame(id);
  return { title: game ? game.name : "Game" };
}

export default async function GamePage({ params }: PageProps<"/game/[id]">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();
  return <LevelSelect gameId={game.id} />;
}
