"use client";

import { useEffect, useRef, useState } from "react";
import { levelRng, type Rng } from "@/lib/rng";
import { Hearts, Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

const W = 480;
const H = 640;
const R = 7;
const COLS = 10;
const BRICK_H = 20;
const GAP = 4;
const TOP = 64;

type BrickType = "normal" | "tough" | "steel" | "bomb";
type DropKind = "W" | "M" | "S" | "+";
interface Brick {
  bx: number;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  type: BrickType;
  alive: boolean;
  hue: number;
}
interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  stuck: boolean;
}
interface Drop {
  x: number;
  y: number;
  kind: DropKind;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const SHAPES = ["full", "pyramid", "stripes", "diamond", "checker", "frame", "zigzag", "random"] as const;

function shapeGrid(shape: (typeof SHAPES)[number], rows: number, rng: Rng): boolean[][] {
  const mid = (COLS - 1) / 2;
  const half = Array.from({ length: rows }, () => Array.from({ length: COLS / 2 }, () => rng() < 0.72));
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => {
      switch (shape) {
        case "full":
          return true;
        case "pyramid":
          return Math.abs(c - mid) <= ((r + 1) * COLS) / (2 * rows) + 0.5;
        case "stripes":
          return r % 2 === 0 || c % 3 === 0;
        case "diamond":
          return Math.abs(c - mid) / (COLS / 2) + Math.abs(r - (rows - 1) / 2) / (rows / 2) <= 1.1;
        case "checker":
          return (r + c) % 2 === 0;
        case "frame":
          return r === 0 || r === rows - 1 || c === 0 || c === COLS - 1 || r === Math.floor(rows / 2);
        case "zigzag":
          return (c + r) % 4 !== 3;
        default:
          return half[r][c < COLS / 2 ? c : COLS - 1 - c];
      }
    }),
  );
}

function buildBricks(level: number): Brick[] {
  const rng = levelRng("brick-breaker", level);
  const rows = Math.min(9, 4 + Math.ceil(level / 2));
  const margin = level >= 13 ? 44 : 16;
  const bw = (W - 2 * margin - (COLS - 1) * GAP) / COLS;
  const shape = SHAPES[(level - 1) % SHAPES.length];
  let grid = shapeGrid(shape, rows, rng);
  if (grid.flat().filter(Boolean).length < 14) grid = shapeGrid("full", rows, rng);
  const steelRow = level >= 7 ? rows - 2 : -1;
  const bricks: Brick[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const isSteel = r === steelRow && (c + level) % 3 === 0;
      if (!grid[r][c] && !isSteel) continue;
      let type: BrickType = "normal";
      let hp = 1;
      if (isSteel) {
        type = "steel";
        hp = Infinity;
      } else if (level >= 10 && rng() < 0.08) {
        type = "bomb";
      } else if (level >= 3 && rng() < Math.min(0.45, 0.12 + level * 0.025)) {
        type = "tough";
        hp = level >= 8 && rng() < 0.35 ? 3 : 2;
      }
      const x = margin + c * (bw + GAP);
      bricks.push({ bx: x, x, y: TOP + r * (BRICK_H + GAP), w: bw, h: BRICK_H, hp, type, alive: true, hue: (r * 34 + 8) % 360 });
    }
  }
  return bricks;
}

const DROP_COLOR: Record<DropKind, string> = { W: "#38bdf8", M: "#a78bfa", S: "#34d399", "+": "#f43f5e" };

export default function BrickBreaker({ level, onWin, onLose }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef({ onWin, onLose });
  const [hud, setHud] = useState({ lives: 3, left: 0 });

  useEffect(() => {
    cbRef.current = { onWin, onLose };
  }, [onWin, onLose]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rng = levelRng("brick-breaker-play", level);
    const bricks = buildBricks(level);
    const baseSpeed = 330 + level * 12;
    const basePaddle = 104 - level * 1.6 - (level >= 13 ? 10 : 0);
    const paddleY = H - 48;
    const sway = level >= 13;
    let px = W / 2;
    let targetX: number | null = null;
    let lives = 3;
    let balls: Ball[] = [{ x: px, y: paddleY - R - 1, vx: 0, vy: 0, stuck: true }];
    let drops: Drop[] = [];
    let particles: Particle[] = [];
    let wideUntil = 0;
    let slowUntil = 0;
    let t = 0;
    let done = false;
    let raf = 0;
    let last = performance.now();
    const keys = { left: false, right: false };
    let lastHud = { lives: -1, left: -1 };

    const breakable = () => bricks.filter((b) => b.alive && b.type !== "steel").length;

    const syncHud = () => {
      const left = breakable();
      if (left !== lastHud.left || lives !== lastHud.lives) {
        lastHud = { lives, left };
        setHud({ lives, left });
      }
    };
    syncHud();

    const paddleW = () => (t < wideUntil ? basePaddle * 1.5 : basePaddle);
    const speed = () => (t < slowUntil ? baseSpeed * 0.7 : baseSpeed);

    function launch() {
      for (const b of balls) {
        if (!b.stuck) continue;
        const a = (rng() - 0.5) * 0.7;
        b.vx = Math.sin(a) * speed();
        b.vy = -Math.cos(a) * speed();
        b.stuck = false;
      }
    }

    function burst(x: number, y: number, color: string) {
      for (let i = 0; i < 10; i++) {
        const a = rng() * Math.PI * 2;
        const s = 60 + rng() * 160;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6, color });
      }
    }

    function destroy(br: Brick) {
      if (!br.alive || br.type === "steel") return;
      br.alive = false;
      burst(br.x + br.w / 2, br.y + br.h / 2, br.type === "bomb" ? "#f87171" : `hsl(${br.hue} 85% 62%)`);
      if (br.type === "bomb") {
        for (const o of bricks) {
          if (!o.alive || o.type === "steel") continue;
          if (Math.abs(o.x - br.x) < br.w * 1.6 && Math.abs(o.y - br.y) < br.h * 1.8) destroy(o);
        }
      }
      if (level >= 5 && rng() < 0.14) {
        const roll = rng();
        const kind: DropKind = roll < 0.35 ? "W" : roll < 0.65 ? "M" : roll < 0.9 ? "S" : "+";
        drops.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, kind });
      }
    }

    function hit(br: Brick) {
      if (br.type === "steel") return;
      br.hp -= 1;
      if (br.hp <= 0) destroy(br);
    }

    function stepBall(b: Ball, dt: number) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < R) {
        b.x = R;
        b.vx = Math.abs(b.vx);
      } else if (b.x > W - R) {
        b.x = W - R;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y < R) {
        b.y = R;
        b.vy = Math.abs(b.vy);
      }
      // paddle
      const pw = paddleW();
      if (b.vy > 0 && b.y + R >= paddleY && b.y + R <= paddleY + 22 && b.x >= px - pw / 2 - R && b.x <= px + pw / 2 + R) {
        const rel = Math.max(-1, Math.min(1, (b.x - px) / (pw / 2)));
        const a = rel * 1.05;
        const s = speed();
        b.vx = Math.sin(a) * s;
        b.vy = -Math.cos(a) * s;
        b.y = paddleY - R;
      }
      // bricks
      for (const br of bricks) {
        if (!br.alive) continue;
        const nx = Math.max(br.x, Math.min(b.x, br.x + br.w));
        const ny = Math.max(br.y, Math.min(b.y, br.y + br.h));
        const dx = b.x - nx;
        const dy = b.y - ny;
        if (dx * dx + dy * dy >= R * R) continue;
        const ox = Math.min(b.x + R - br.x, br.x + br.w - (b.x - R));
        const oy = Math.min(b.y + R - br.y, br.y + br.h - (b.y - R));
        if (ox < oy) {
          b.vx = b.x < br.x + br.w / 2 ? -Math.abs(b.vx) : Math.abs(b.vx);
          b.x += b.x < br.x + br.w / 2 ? -ox : ox;
        } else {
          b.vy = b.y < br.y + br.h / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);
          b.y += b.y < br.y + br.h / 2 ? -oy : oy;
        }
        hit(br);
        break;
      }
    }

    function update(dt: number) {
      t += dt;
      if (keys.left) px -= 560 * dt;
      if (keys.right) px += 560 * dt;
      if (targetX !== null) px = targetX;
      const pw = paddleW();
      px = Math.max(pw / 2, Math.min(W - pw / 2, px));

      if (sway) {
        const off = Math.sin(t * 0.9) * 28;
        for (const br of bricks) br.x = br.bx + off;
      }

      const s = speed();
      for (const b of balls) {
        if (b.stuck) {
          b.x = px;
          b.y = paddleY - R - 1;
          continue;
        }
        const len = Math.hypot(b.vx, b.vy) || 1;
        b.vx = (b.vx / len) * s;
        b.vy = (b.vy / len) * s;
        if (Math.abs(b.vy) < s * 0.28) {
          b.vy = (b.vy < 0 ? -1 : 1) * s * 0.28;
          b.vx = Math.sign(b.vx || 1) * Math.sqrt(s * s - b.vy * b.vy);
        }
        const steps = Math.ceil((s * dt) / 4);
        for (let i = 0; i < steps; i++) stepBall(b, dt / steps);
      }
      balls = balls.filter((b) => b.y < H + R * 2);

      for (const d of drops) d.y += 170 * dt;
      drops = drops.filter((d) => {
        if (d.y > paddleY - 6 && d.y < paddleY + 20 && Math.abs(d.x - px) < pw / 2 + 12) {
          if (d.kind === "W") wideUntil = t + 12;
          else if (d.kind === "S") slowUntil = t + 10;
          else if (d.kind === "+") lives = Math.min(5, lives + 1);
          else {
            const src = balls.find((b) => !b.stuck) ?? balls[0];
            if (src) {
              for (const off of [-0.45, 0.45]) {
                const a = Math.atan2(src.vx, -src.vy) + off;
                balls.push({ x: src.x, y: src.y, vx: Math.sin(a) * s, vy: -Math.abs(Math.cos(a) * s), stuck: false });
              }
            }
          }
          return false;
        }
        return d.y < H + 20;
      });

      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 400 * dt;
        p.life -= dt;
      }
      particles = particles.filter((p) => p.life > 0);

      if (balls.length === 0) {
        lives -= 1;
        wideUntil = 0;
        slowUntil = 0;
        drops = [];
        if (lives <= 0) {
          done = true;
          syncHud();
          window.setTimeout(() => cbRef.current.onLose("The ball got past you. Try a new angle!"), 400);
          return;
        }
        balls = [{ x: px, y: paddleY - R - 1, vx: 0, vy: 0, stuck: true }];
      }

      if (breakable() === 0) {
        done = true;
        syncHud();
        window.setTimeout(() => cbRef.current.onWin(Math.min(3, lives)), 500);
        return;
      }
      syncHud();
    }

    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0b1224");
      g.addColorStop(1, "#151b38");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      for (const br of bricks) {
        if (!br.alive) continue;
        ctx.beginPath();
        ctx.roundRect(br.x, br.y, br.w, br.h, 5);
        if (br.type === "steel") {
          const sg = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
          sg.addColorStop(0, "#e2e8f0");
          sg.addColorStop(1, "#64748b");
          ctx.fillStyle = sg;
        } else if (br.type === "bomb") {
          ctx.fillStyle = "#dc2626";
        } else if (br.type === "tough") {
          ctx.fillStyle = `hsl(${br.hue} 70% ${br.hp >= 3 ? 30 : 40}%)`;
        } else {
          ctx.fillStyle = `hsl(${br.hue} 85% 60%)`;
        }
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(br.x + 3, br.y + 2, br.w - 6, 3);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (br.type === "tough") {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = "bold 12px sans-serif";
          ctx.fillText(String(br.hp), br.x + br.w / 2, br.y + br.h / 2 + 1);
        } else if (br.type === "bomb") {
          ctx.fillStyle = "#fde68a";
          ctx.beginPath();
          ctx.arc(br.x + br.w / 2, br.y + br.h / 2, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (br.type === "steel") {
          ctx.fillStyle = "#475569";
          for (const fx of [6, br.w - 6]) {
            ctx.beginPath();
            ctx.arc(br.x + fx, br.y + br.h / 2, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / 0.6);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      for (const d of drops) {
        ctx.beginPath();
        ctx.roundRect(d.x - 16, d.y - 9, 32, 18, 9);
        ctx.fillStyle = DROP_COLOR[d.kind];
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d.kind, d.x, d.y + 1);
      }

      const pw = paddleW();
      const pg = ctx.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0);
      pg.addColorStop(0, "#fb923c");
      pg.addColorStop(1, "#f43f5e");
      ctx.beginPath();
      ctx.roundRect(px - pw / 2, paddleY, pw, 14, 7);
      ctx.fillStyle = pg;
      ctx.shadowColor = "#fb7185";
      ctx.shadowBlur = 16;
      ctx.fill();

      ctx.fillStyle = t < slowUntil ? "#6ee7b7" : "#ffffff";
      ctx.shadowColor = "#e0f2fe";
      ctx.shadowBlur = 14;
      for (const b of balls) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, R, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (!done && balls.some((b) => b.stuck)) {
        ctx.fillStyle = "rgba(226,232,240,0.85)";
        ctx.font = "600 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Click, tap or press Space to launch", W / 2, H / 2 + 60);
      }
    }

    function frame(now: number) {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      if (!done) update(dt);
      draw();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    const toLogical = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * W;
    };
    const onMove = (e: PointerEvent) => {
      targetX = toLogical(e.clientX);
    };
    const onDown = (e: PointerEvent) => {
      targetX = toLogical(e.clientX);
      launch();
    };
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        keys.left = down;
        targetX = null;
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        keys.right = down;
        targetX = null;
        e.preventDefault();
      } else if ((e.key === " " || e.key === "ArrowUp") && down) {
        launch();
        e.preventDefault();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [level]);

  return (
    <div className="flex flex-col items-center">
      <Hud>
        <Hearts left={Math.min(hud.lives, 5)} total={Math.max(3, hud.lives)} />
        <Stat label="Bricks" value={hud.left} />
        <Stat label="Speed" value={`${Math.round((330 + level * 12) / 33) / 10}×`} />
      </Hud>
      <div style={{ width: `min(100%, ${W}px, calc(72vh * ${W / H}))` }}>
        <canvas
          ref={canvasRef}
          className="block h-auto w-full touch-none rounded-3xl border border-white/10 shadow-2xl shadow-orange-950/30"
          style={{ aspectRatio: `${W} / ${H}` }}
        />
      </div>
    </div>
  );
}
