# Mind Arcade

Eight brain-training games in one Next.js app, **155 levels** in total. Every few levels, each game adds a new rule ("concept") to learn.

| Game | Levels | Concepts unlocked as you climb |
| --- | --- | --- |
| Arrow Escape | 30 | Clear arrows → Stones (7) → Long arrows (13) → Timer (21) |
| Brick Breaker | 15 | Basics → Tough bricks (3) → Power-ups (5) → Steel (7) → Bombs (10) → Drifting wall (13) |
| Light Flip | 20 | Plus flip → Diagonal flip (8) → Three colours (14) |
| Slide Puzzle | 15 | 3×3 → 4×4 (6) → Colour mode (9) → Spiral target (13) |
| Memory Match | 15 | Pairs → Shifting cards (6) → Triples (11) |
| Pattern Recall | 20 | Remember tiles → Sequence (8) → Reverse (15) |
| Color Sort | 20 | Pour & sort → Mystery layers (8) → Tall tubes (14) |
| Pipe Connect | 20 | Rotate pipes → Wrap-around (8) → Stiff tiles (15) |

- Levels are generated from a fixed seed, so a level is the same puzzle every time you play it, and every generated level can be solved.
- Stars (1–3) depend on moves, mistakes or lives left. Clearing a level unlocks the next one. Progress is saved in `localStorage`.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Structure

- `app/` — routes: `/` (hub), `/game/[id]` (level select), `/game/[id]/[level]` (play)
- `components/` — `HomeHub`, `LevelSelect`, `PlayScreen` (intro card, win/lose dialogs), HUD bits, icons
- `games/` — one component per game; each takes `{ level, onWin(stars), onLose(reason) }`
- `lib/games.ts` — game list, level counts and concept roadmap
- `lib/progress.ts` — saved stars / unlocks
- `lib/rng.ts` — seeded random generator for repeatable levels
