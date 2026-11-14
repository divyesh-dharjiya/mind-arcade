export type GameId =
  | "arrow-escape"
  | "brick-breaker"
  | "light-flip"
  | "slide-puzzle"
  | "memory-match"
  | "pattern-recall"
  | "color-sort"
  | "pipe-connect"
  | "block-fit"
  | "gem-swap"
  | "laser-lab"
  | "sudoku";

export type Category = "Logic" | "Memory" | "Reflex" | "Strategy" | "Spatial";
export const CATEGORIES: Category[] = ["Logic", "Strategy", "Memory", "Spatial", "Reflex"];

export interface Concept {
  level: number;
  title: string;
  text: string;
}

export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
  goal: string;
  category: Category;
  levels: number;
  accent: string;
  accent2: string;
  bg: [string, string];
  isNew?: boolean;
  concepts: Concept[];
}

export const GAMES: GameMeta[] = [
  {
    id: "arrow-escape",
    name: "Arrow Escape",
    tagline: "Free every arrow — in exactly the right order.",
    goal: "Send every arrow off the board",
    category: "Logic",
    levels: 30,
    accent: "#22d3ee",
    accent2: "#6366f1",
    bg: ["#0a1638", "#241a5c"],
    concepts: [
      { level: 1, title: "Clear the board", text: "Tap an arrow to launch it the way it points. If something is in its path it crashes and bounces back — and you lose a heart." },
      { level: 6, title: "Stones", text: "Stone blocks never move. An arrow aimed at a stone is stuck for good, so plan the order carefully." },
      { level: 12, title: "Long arrows", text: "Some arrows stretch across 2–3 cells. They slide out along their length and block everything they cover." },
      { level: 20, title: "Beat the clock", text: "The timer is ticking. Read the board fast — clear it before time runs out." },
    ],
  },
  {
    id: "gem-swap",
    name: "Gem Swap",
    tagline: "Swap gems, chain cascades, hit the target.",
    goal: "Reach the goal before you run out of moves",
    category: "Strategy",
    levels: 24,
    accent: "#e879f9",
    accent2: "#6366f1",
    bg: ["#2a0b3d", "#0d1b4d"],
    isNew: true,
    concepts: [
      { level: 1, title: "Match three", text: "Swap two neighbouring gems to line up 3 or more of a kind. Cascades score extra. Reach the target score within the moves." },
      { level: 5, title: "Power gems", text: "Match 4 to forge a Line gem that blasts a whole row or column. Match 5 for a Nova that clears everything around it." },
      { level: 10, title: "Collect orders", text: "Now each level asks for specific gems. Collect the order before your moves run out." },
      { level: 16, title: "Frozen tiles", text: "Ice is stuck under some gems. Make matches on top of the ice to crack it — clear all of it to win." },
    ],
  },
  {
    id: "block-fit",
    name: "Block Fit",
    tagline: "Drop shapes, complete lines, chase combos.",
    goal: "Clear the target lines before pieces run out",
    category: "Strategy",
    levels: 20,
    accent: "#fbbf24",
    accent2: "#f97316",
    bg: ["#21103a", "#0f2547"],
    isNew: true,
    concepts: [
      { level: 1, title: "Fill the lines", text: "Drag a piece onto the board. Fill a full row or column to clear it. Clear the target number of lines before your pieces run out." },
      { level: 6, title: "Stone blocks", text: "Levels start with stones already on the board. Clearing a line through them breaks them." },
      { level: 12, title: "Gem hunt", text: "Gems are hidden in the board. Clear the lines that hold them to collect every gem." },
    ],
  },
  {
    id: "laser-lab",
    name: "Laser Lab",
    tagline: "Tilt mirrors to steer the beam into every crystal.",
    goal: "Light up every crystal",
    category: "Logic",
    levels: 24,
    accent: "#fb7185",
    accent2: "#f43f5e",
    bg: ["#230a1c", "#0e0f2c"],
    isNew: true,
    concepts: [
      { level: 1, title: "Bend the beam", text: "Tap a mirror to flip its angle. Guide the laser so it passes through every crystal on the board." },
      { level: 8, title: "Walls", text: "Solid walls absorb the beam. Route around them." },
      { level: 15, title: "Twin lasers", text: "Two coloured lasers. Each crystal only lights up for the beam of its own colour." },
    ],
  },
  {
    id: "sudoku",
    name: "Sudoku",
    tagline: "Every row, column and box — one of each number.",
    goal: "Fill the grid with no repeats",
    category: "Logic",
    levels: 20,
    accent: "#38bdf8",
    accent2: "#818cf8",
    bg: ["#0c1a33", "#1b1740"],
    isNew: true,
    concepts: [
      { level: 1, title: "4×4 warm-up", text: "Fill each row, column and 2×2 box with 1–4, no repeats. Pick a cell, then a number. 3 mistakes and the level ends." },
      { level: 6, title: "6×6 grid", text: "Numbers 1–6 with 2×3 boxes. Use Notes to pencil in candidates." },
      { level: 13, title: "Classic 9×9", text: "The real thing. 1–9 in every row, column and 3×3 box." },
    ],
  },
  {
    id: "color-sort",
    name: "Color Sort",
    tagline: "Pour liquids between tubes until each is pure.",
    goal: "One colour per tube",
    category: "Strategy",
    levels: 24,
    accent: "#60a5fa",
    accent2: "#22d3ee",
    bg: ["#0b1b3f", "#112e4f"],
    concepts: [
      { level: 1, title: "Pour and sort", text: "Tap a tube, then another, to pour. You can only pour onto the same colour or into an empty tube." },
      { level: 9, title: "Mystery layers", text: "Lower layers are hidden until they reach the top. Plan for surprises." },
      { level: 16, title: "Tall tubes", text: "Tubes now hold 5 layers — and there are more colours to untangle." },
    ],
  },
  {
    id: "brick-breaker",
    name: "Brick Breaker",
    tagline: "Angle every bounce to smash the neon wall.",
    goal: "Smash every breakable brick",
    category: "Reflex",
    levels: 20,
    accent: "#fb923c",
    accent2: "#f43f5e",
    bg: ["#1c0f2e", "#3b0d24"],
    concepts: [
      { level: 1, title: "Break them all", text: "Move with mouse, finger or ← →. Click, tap or Space to launch. Where the ball hits the paddle sets its angle. Chain hits for combo points." },
      { level: 3, title: "Tough bricks", text: "Darker bricks take 2–3 hits. The number shows hits left." },
      { level: 5, title: "Power-ups", text: "Capsules drop from smashed bricks: wide paddle, multi-ball, slow-mo, fireball and extra life." },
      { level: 8, title: "Steel bricks", text: "Steel never breaks. Find the gaps." },
      { level: 11, title: "Bomb bricks", text: "Bombs blow up everything around them — chain them for huge combos." },
      { level: 15, title: "Drifting wall", text: "The wall drifts side to side and your paddle is shorter. Time it." },
    ],
  },
  {
    id: "pipe-connect",
    name: "Pipe Connect",
    tagline: "Rotate pipes until energy reaches every lamp.",
    goal: "Light every lamp with no loose ends",
    category: "Spatial",
    levels: 24,
    accent: "#a3e635",
    accent2: "#10b981",
    bg: ["#0b2116", "#0f2a30"],
    concepts: [
      { level: 1, title: "Connect the flow", text: "Tap a tile to rotate it. Link every pipe to the core with no loose ends so every lamp lights." },
      { level: 9, title: "Wrap-around", text: "Pipes can leave one edge and come back on the opposite edge." },
      { level: 17, title: "Stiff tiles", text: "Orange-rimmed tiles turn 180° per tap — only two positions." },
    ],
  },
  {
    id: "light-flip",
    name: "Light Flip",
    tagline: "Every tap flips a cluster. Turn them all off.",
    goal: "Switch every light off",
    category: "Logic",
    levels: 24,
    accent: "#facc15",
    accent2: "#f97316",
    bg: ["#191233", "#3d2a0c"],
    concepts: [
      { level: 1, title: "Lights out", text: "Tapping a lamp flips it and its 4 neighbours. Turn every lamp off — try to match par." },
      { level: 9, title: "Diagonal flip", text: "The pattern changes: a tap now flips the lamp and its 4 diagonal neighbours." },
      { level: 17, title: "Three colours", text: "Lamps cycle Off → Blue → Pink → Off. Each tap advances the lamp and its neighbours one step." },
    ],
  },
  {
    id: "slide-puzzle",
    name: "Slide Puzzle",
    tagline: "Slide the pieces back into the picture.",
    goal: "Rebuild the picture",
    category: "Spatial",
    levels: 16,
    accent: "#a78bfa",
    accent2: "#ec4899",
    bg: ["#1a0f3a", "#3b0f40"],
    concepts: [
      { level: 1, title: "Slide into place", text: "Tap any piece in the same row or column as the gap to slide it. Numbers help you on the first levels." },
      { level: 5, title: "Picture only", text: "No more numbers — rebuild the picture by eye. Peek at the target any time." },
      { level: 9, title: "Bigger board", text: "4×4 now. Solve the top row first, then the left column." },
      { level: 13, title: "Master 5×5", text: "Twenty-four pieces. Work in layers." },
    ],
  },
  {
    id: "memory-match",
    name: "Memory Match",
    tagline: "Flip cards, find sets, build combos.",
    goal: "Find every matching set",
    category: "Memory",
    levels: 18,
    accent: "#f472b6",
    accent2: "#8b5cf6",
    bg: ["#2a0b2e", "#170f3d"],
    concepts: [
      { level: 1, title: "Find the pairs", text: "Flip two cards. Matches stay open. Back-to-back matches build a combo." },
      { level: 6, title: "Shifting cards", text: "After a miss, two hidden cards swap places — the swapped spots glow. Track them!" },
      { level: 11, title: "Triples", text: "Each picture appears three times. Find all three in one turn." },
      { level: 15, title: "Beat the clock", text: "Now there's a time limit. Stay sharp." },
    ],
  },
  {
    id: "pattern-recall",
    name: "Pattern Recall",
    tagline: "Watch the pads, hear the tune, repeat it.",
    goal: "Repeat the pattern 3 times",
    category: "Memory",
    levels: 20,
    accent: "#34d399",
    accent2: "#06b6d4",
    bg: ["#052a2a", "#0b1d3d"],
    concepts: [
      { level: 1, title: "Remember the glow", text: "Some pads light up at once. When they go dark, tap all of them. 3 rounds per level, 3 hearts." },
      { level: 8, title: "Sequence", text: "Pads light one at a time with a note each. Play them back in the same order." },
      { level: 15, title: "Reverse", text: "Same sequences — but play them back in reverse." },
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

export function worldOf(game: GameMeta, level: number): number {
  return game.concepts.filter((c) => c.level <= level).length;
}
