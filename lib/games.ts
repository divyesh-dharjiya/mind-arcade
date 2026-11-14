export type GameId =
  | "brick-breaker"
  | "arrow-escape"
  | "light-flip"
  | "slide-puzzle"
  | "memory-match"
  | "pattern-recall"
  | "color-sort"
  | "pipe-connect";

export interface Concept {
  level: number;
  title: string;
  text: string;
}

export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
  skill: string;
  levels: number;
  accent: string;
  accent2: string;
  concepts: Concept[];
}

export const GAMES: GameMeta[] = [
  {
    id: "arrow-escape",
    name: "Arrow Escape",
    tagline: "Free every arrow in the right order.",
    skill: "Planning",
    levels: 30,
    accent: "#22d3ee",
    accent2: "#6366f1",
    concepts: [
      {
        level: 1,
        title: "Clear the board",
        text: "Tap an arrow to send it flying in the direction it points. It can only leave if nothing is in its path to the edge. A blocked tap costs a heart.",
      },
      {
        level: 7,
        title: "Stones",
        text: "Grey stones never move. Any arrow aimed at a stone is stuck forever — so the order you clear matters more.",
      },
      {
        level: 13,
        title: "Long arrows",
        text: "Some arrows now stretch across 2–3 cells. They slide out along their length, and their bodies block other arrows.",
      },
      {
        level: 21,
        title: "Beat the clock",
        text: "A timer is running. Plan fast — clear the board before time runs out.",
      },
    ],
  },
  {
    id: "brick-breaker",
    name: "Brick Breaker",
    tagline: "Angle every bounce to smash the wall.",
    skill: "Reflex + Aim",
    levels: 15,
    accent: "#fb923c",
    accent2: "#f43f5e",
    concepts: [
      {
        level: 1,
        title: "Break them all",
        text: "Move the paddle with your mouse, finger, or ← → keys. Click, tap or press Space to launch. Where the ball hits the paddle sets its angle.",
      },
      {
        level: 3,
        title: "Tough bricks",
        text: "Darker bricks take 2–3 hits. The number shows the hits left.",
      },
      {
        level: 5,
        title: "Power-ups",
        text: "Smashed bricks sometimes drop capsules. W = wide paddle, M = multi-ball, S = slow ball, + = extra life.",
      },
      {
        level: 7,
        title: "Steel bricks",
        text: "Silver bricks never break. Aim through the gaps to reach what's behind them.",
      },
      {
        level: 10,
        title: "Bomb bricks",
        text: "Red bomb bricks blow up every brick around them. Use them to clear big chunks at once.",
      },
      {
        level: 13,
        title: "Drifting wall",
        text: "The whole wall now drifts side to side, and your paddle is shorter. Time your shots.",
      },
    ],
  },
  {
    id: "light-flip",
    name: "Light Flip",
    tagline: "Switch every light off — each tap flips a cluster.",
    skill: "Logic",
    levels: 20,
    accent: "#facc15",
    accent2: "#f97316",
    concepts: [
      {
        level: 1,
        title: "Lights off",
        text: "Tapping a tile flips it and its 4 neighbours (up, down, left, right). Turn every light off. Try to match the par move count.",
      },
      {
        level: 8,
        title: "Diagonal flip",
        text: "The pattern changes: a tap now flips the tile and its 4 diagonal neighbours instead.",
      },
      {
        level: 14,
        title: "Three colours",
        text: "Tiles now cycle Off → Blue → Pink → Off. Each tap advances the tile and its neighbours one step.",
      },
    ],
  },
  {
    id: "slide-puzzle",
    name: "Slide Puzzle",
    tagline: "Slide tiles through the gap to rebuild the target.",
    skill: "Spatial",
    levels: 15,
    accent: "#a78bfa",
    accent2: "#ec4899",
    concepts: [
      {
        level: 1,
        title: "Slide into order",
        text: "Tap any tile in the same row or column as the gap to slide it. Rebuild the target shown on the right. Arrow keys work too.",
      },
      {
        level: 6,
        title: "Bigger board",
        text: "Now 4×4. Solve the top row first, then the left column, and the rest gets easier.",
      },
      {
        level: 9,
        title: "Colour mode",
        text: "No numbers — just colours. Match the gradient in the target picture.",
      },
      {
        level: 13,
        title: "Spiral target",
        text: "The goal is no longer reading order. Numbers must wind inward in a spiral — check the target.",
      },
    ],
  },
  {
    id: "memory-match",
    name: "Memory Match",
    tagline: "Flip cards and find every matching set.",
    skill: "Memory",
    levels: 15,
    accent: "#f472b6",
    accent2: "#8b5cf6",
    concepts: [
      {
        level: 1,
        title: "Find the pairs",
        text: "Flip two cards. If they match they stay open; if not they flip back. Remember where everything is.",
      },
      {
        level: 6,
        title: "Shifting cards",
        text: "After every miss, two hidden cards swap places. The swapped spots glow — track them!",
      },
      {
        level: 11,
        title: "Triples",
        text: "Each picture now appears three times. Find all three in one turn to lock them in.",
      },
    ],
  },
  {
    id: "pattern-recall",
    name: "Pattern Recall",
    tagline: "Watch the glow, then repeat it from memory.",
    skill: "Focus",
    levels: 20,
    accent: "#34d399",
    accent2: "#06b6d4",
    concepts: [
      {
        level: 1,
        title: "Remember the glow",
        text: "Some tiles light up for a moment. When they go dark, tap all of them. Each level has 3 rounds and you get 3 hearts.",
      },
      {
        level: 8,
        title: "Sequence",
        text: "Tiles now light up one at a time. Tap them back in exactly the same order.",
      },
      {
        level: 15,
        title: "Reverse",
        text: "Same sequences — but tap them back in reverse order, last tile first.",
      },
    ],
  },
  {
    id: "color-sort",
    name: "Color Sort",
    tagline: "Pour colours between tubes until each is pure.",
    skill: "Strategy",
    levels: 20,
    accent: "#60a5fa",
    accent2: "#22d3ee",
    concepts: [
      {
        level: 1,
        title: "Sort the colours",
        text: "Tap a tube, then another, to pour. You can only pour onto the same colour or into an empty tube. Finish with one colour per tube.",
      },
      {
        level: 8,
        title: "Mystery layers",
        text: "Lower layers are hidden (?) until they reach the top of their tube. Plan for surprises.",
      },
      {
        level: 14,
        title: "Tall tubes",
        text: "Tubes now hold 5 layers. More room — and more colours to untangle.",
      },
    ],
  },
  {
    id: "pipe-connect",
    name: "Pipe Connect",
    tagline: "Rotate pipes until power reaches every lamp.",
    skill: "Pattern",
    levels: 20,
    accent: "#a3e635",
    accent2: "#10b981",
    concepts: [
      {
        level: 1,
        title: "Connect the flow",
        text: "Tap a tile to rotate it. Link every pipe to the glowing source in the middle with no loose ends, so every lamp lights up.",
      },
      {
        level: 8,
        title: "Wrap-around",
        text: "Pipes may now exit one edge of the board and enter from the opposite edge.",
      },
      {
        level: 15,
        title: "Stiff tiles",
        text: "Orange-rimmed tiles are stiff: each tap turns them 180°, so they only have two positions.",
      },
    ],
  },
];

export const TOTAL_LEVELS = GAMES.reduce((n, g) => n + g.levels, 0);

export function getGame(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}

export function conceptAt(game: GameMeta, level: number): Concept | undefined {
  return game.concepts.find((c) => c.level === level);
}

export function activeConcepts(game: GameMeta, level: number): Concept[] {
  return game.concepts.filter((c) => c.level <= level);
}
