# Mind Arcade

**▶ Play now: [mind-arcade-nine.vercel.app](https://mind-arcade-nine.vercel.app)**

Twelve brain games in one Next.js app, with **264 levels**. Each game is split into worlds, and every new world adds a rule to learn. The app is built to look and feel like a mobile game: level maps, animated intros and results, sound effects, particles and confetti.

| Game | Levels | Worlds (new rule from level) |
| --- | --- | --- |
| Arrow Escape | 30 | Clear the board → Stones (6) → Long arrows (12) → Beat the clock (20) |
| Gem Swap | 24 | Match three → Power gems (5) → Collect orders (10) → Frozen tiles (16) |
| Block Fit | 20 | Fill the lines → Stone blocks (6) → Gem hunt (12) |
| Laser Lab | 24 | Bend the beam → Walls (8) → Twin lasers (15) |
| Sudoku | 20 | 4×4 → 6×6 (6) → Classic 9×9 (13) |
| Color Sort | 24 | Pour and sort → Mystery layers (9) → Tall tubes (16) |
| Brick Breaker | 20 | Tough bricks (3) → Power-ups (5) → Steel (8) → Bombs (11) → Drifting wall (15) |
| Pipe Connect | 24 | Connect the flow → Wrap-around (9) → Stiff tiles (17) |
| Light Flip | 24 | Plus flip → Diagonal flip (9) → Three colours (17) |
| Slide Puzzle | 16 | Numbered pictures → Picture only (5) → 4×4 (9) → 5×5 (13) |
| Memory Match | 18 | Pairs → Shifting cards (6) → Triples (11) → Beat the clock (15) |
| Pattern Recall | 20 | Remember the glow → Sequence (8) → Reverse (15) |

## What's inside

- **Real game feel:** a winding level map with world banners, a level intro card, a pause menu, win screens where the stars pop in, and lose screens.
- **Animation:** built with [Motion](https://motion.dev). Pieces spring into place, cards flip in 3D, tubes tilt and pour, gems cascade, and lasers re-fire when a mirror turns.
- **Effects:** a canvas layer for particle bursts, confetti, floating score text and screen shake (`lib/fx.ts`, `components/FxLayer.tsx`).
- **Sound:** every effect is synthesized with the Web Audio API, so there are no audio files (`lib/sfx.ts`). Sound and vibration can be switched off.
- **Fair levels:** each level comes from a fixed seed, so it's the same puzzle every time, and the generator makes sure it can be solved. Arrow orders are reversible, Color Sort is checked by a solver, Sudoku has a unique solution, and Laser Lab is traced to confirm it works.
- **Progress:** stars, unlocked levels and "continue" are saved in `localStorage`.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Structure

- `app/` — routes: `/` (hub), `/game/[id]` (level map), `/game/[id]/[level]` (play)
- `components/` — `HomeHub`, `LevelMap`, `PlayScreen` (intro, pause, win/lose), `GameArt` (illustrations), `Hud`, `FxLayer`, `ui/`
- `games/` — one component per game; each takes `{ level, paused, onWin(stars, stats), onLose(reason) }`
- `lib/` — game catalogue, progress, settings, seeded RNG, sound and effects
