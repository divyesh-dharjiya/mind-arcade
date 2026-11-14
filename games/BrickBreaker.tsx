"use client";

import { useEffect, useRef, useState } from "react";
import { levelRng, type Rng } from "@/lib/rng";
import { sfx } from "@/lib/sfx";
import { Hearts, Hud, Stat } from "@/components/Hud";
import type { GameProps } from "./types";

const W = 480;
const H = 680;
const R = 7;
const COLS = 10;
const BRICK_H = 22;
const GAP = 4;
const TOP = 70;

type BrickType = "normal" | "tough" | "steel" | "bomb";
type DropKind = "W" | "M" | "S" | "F" | "+";
interface Brick { bx: number; x: number; y: number; w: number; h: number; hp: number; max: number; type: BrickType; alive: boolean; hue: number; flash: number }
interface Ball { x: number; y: number; vx: number; vy: number; stuck: boolean; trail: [number, number][] }
interface Drop { x: number; y: number; kind: DropKind; t: number }
interface Part { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; text?: string }

const SHAPES = ["full", "pyramid", "stripes", "diamond", "checker", "frame", "zigzag", "random", "arch", "cross"] as const;
const DROP_COLOR: Record<DropKind, string> = { W: "#38bdf8", M: "#a78bfa", S: "#34d399", F: "#fb923c", "+": "#f43f5e" };

function shapeGrid(shape: (typeof SHAPES)[number], rows: number, rng: Rng): boolean[][] {
  const mid = (COLS - 1) / 2;
  const half = Array.from({ length: rows }, () => Array.from({ length: COLS / 2 }, () => rng() < 0.7));
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => {
      switch (shape) {
        case "full": return true;
        case "pyramid": return Math.abs(c - mid) <= ((r + 1) * COLS) / (2 * rows) + 0.5;
        case "stripes": return r % 2 === 0 || c % 3 === 0;
        case "diamond": return Math.abs(c - mid) / (COLS / 2) + Math.abs(r - (rows - 1) / 2) / (rows / 2) <= 1.1;
        case "checker": return (r + c) % 2 === 0;
        case "frame": return r === 0 || r === rows - 1 || c === 0 || c === COLS - 1 || r === Math.floor(rows / 2);
        case "zigzag": return (c + r) % 4 !== 3;
        case "arch": return r < 2 || c < 2 || c > COLS - 3;
        case "cross": return Math.abs(c - mid) < 1.6 || Math.abs(r - (rows - 1) / 2) < 1.1 || r === 0;
        default: return half[r][c < COLS / 2 ? c : COLS - 1 - c];
      }
    }),
  );
}

export function buildBricks(level: number): Brick[] {
  const rng = levelRng("brick-breaker", level);
  const rows = Math.min(10, 5 + Math.floor(level / 2));
  const margin = level >= 15 ? 46 : 16;
  const bw = (W - 2 * margin - (COLS - 1) * GAP) / COLS;
  let grid = shapeGrid(SHAPES[(level - 1) % SHAPES.length], rows, rng);
  if (grid.flat().filter(Boolean).length < 16) grid = shapeGrid("full", rows, rng);
  const steelRow = level >= 8 ? rows - 2 : -1;
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
      } else if (level >= 11 && rng() < 0.08) type = "bomb";
      else if (level >= 3 && rng() < Math.min(0.5, 0.12 + level * 0.025)) {
        type = "tough";
        hp = level >= 9 && rng() < 0.4 ? 3 : 2;
      }
      const x = margin + c * (bw + GAP);
      bricks.push({ bx: x, x, y: TOP + r * (BRICK_H + GAP), w: bw, h: BRICK_H, hp, max: hp, type, alive: true, hue: (r * 31 + 190) % 360, flash: 0 });
    }
  }
  return bricks;
}

export default function BrickBreaker({ level, paused, onWin, onLose }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef({ onWin, onLose });
  const pausedRef = useRef(paused);
  const [hud, setHud] = useState({ lives: 3, left: 0, score: 0, combo: 0 });

  useEffect(() => {
    cbRef.current = { onWin, onLose };
  }, [onWin, onLose]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const rng = levelRng("brick-breaker-play", level);
    const bricks = buildBricks(level);
    const baseSpeed = 340 + level * 13;
    const basePaddle = 108 - level * 1.5 - (level >= 15 ? 12 : 0);
    const paddleY = H - 54;
    const sway = level >= 15;
    const stars = Array.from({ length: 70 }, () => ({ x: rng() * W, y: rng() * H, s: rng() * 1.6 + 0.3, v: rng() * 12 + 4 }));
    let px = W / 2;
    let targetX: number | null = null;
    let lives = 3;
    let score = 0;
    let combo = 0;
    let bestCombo = 0;
    let balls: Ball[] = [{ x: px, y: paddleY - R - 1, vx: 0, vy: 0, stuck: true, trail: [] }];
    let drops: Drop[] = [];
    let parts: Part[] = [];
    let wideUntil = 0;
    let slowUntil = 0;
    let fireUntil = 0;
    let squash = 0;
    let shakeT = 0;
    let t = 0;
    let done = false;
    let raf = 0;
    let last = performance.now();
    const keys = { left: false, right: false };
    let lastHud = "";

    const breakable = () => bricks.filter((b) => b.alive && b.type !== "steel").length;
    const syncHud = () => {
      const left = breakable();
      const key = `${lives}|${left}|${score}|${combo}`;
      if (key !== lastHud) {
        lastHud = key;
        setHud({ lives, left, score, combo });
      }
    };
    syncHud();

    const paddleW = () => (t < wideUntil ? basePaddle * 1.55 : basePaddle);
    const speed = () => (t < slowUntil ? baseSpeed * 0.68 : baseSpeed);

    function launch() {
      if (pausedRef.current || done) return;
      let any = false;
      for (const b of balls) {
        if (!b.stuck) continue;
        const a = (rng() - 0.5) * 0.7;
        b.vx = Math.sin(a) * speed();
        b.vy = -Math.cos(a) * speed();
        b.stuck = false;
        any = true;
      }
      if (any) sfx.select();
    }

    function shards(x: number, y: number, color: string, n = 12) {
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2;
        const s = 80 + rng() * 240;
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.7 + rng() * 0.3, color, size: 2 + rng() * 4 });
      }
    }
    function popText(x: number, y: number, text: string, color: string) {
      parts.push({ x, y, vx: 0, vy: -60, life: 0.9, color, size: 16, text });
    }

    function destroy(br: Brick, chain = 0) {
      if (!br.alive || br.type === "steel") return;
      br.alive = false;
      combo++;
      bestCombo = Math.max(bestCombo, combo);
      const pts = 10 * Math.min(combo, 10) + (br.max > 1 ? 15 : 0);
      score += pts;
      const color = br.type === "bomb" ? "#f87171" : `hsl(${br.hue} 90% 62%)`;
      shards(br.x + br.w / 2, br.y + br.h / 2, color);
      if (combo >= 3 || pts >= 40) popText(br.x + br.w / 2, br.y, `+${pts}`, combo >= 5 ? "#fde047" : "#fff");
      sfx.pop(Math.min(14, combo));
      if (br.type === "bomb") {
        shakeT = 0.35;
        sfx.explode();
        parts.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, vx: 0, vy: 0, life: 0.4, color: "#fde68a", size: 70, text: "" });
        for (const o of bricks) {
          if (!o.alive || o.type === "steel") continue;
          if (Math.abs(o.x - br.x) < br.w * 1.7 && Math.abs(o.y - br.y) < br.h * 1.9) destroy(o, chain + 1);
        }
      }
      if (level >= 5 && rng() < 0.15) {
        const roll = rng();
        const kind: DropKind = roll < 0.28 ? "W" : roll < 0.52 ? "M" : roll < 0.72 ? "S" : roll < 0.9 ? "F" : "+";
        drops.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, kind, t: 0 });
      }
    }

    function hit(br: Brick) {
      if (br.type === "steel") {
        br.flash = 1;
        sfx.click(-6);
        return;
      }
      br.hp -= 1;
      br.flash = 1;
      if (br.hp <= 0) destroy(br);
      else {
        sfx.bounce(6);
        shards(br.x + br.w / 2, br.y + br.h / 2, `hsl(${br.hue} 70% 50%)`, 4);
      }
    }

    function stepBall(b: Ball, dt: number) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < R) {
        b.x = R;
        b.vx = Math.abs(b.vx);
        sfx.bounce(-5);
      } else if (b.x > W - R) {
        b.x = W - R;
        b.vx = -Math.abs(b.vx);
        sfx.bounce(-5);
      }
      if (b.y < R) {
        b.y = R;
        b.vy = Math.abs(b.vy);
        sfx.bounce(-5);
      }
      const pw = paddleW();
      if (b.vy > 0 && b.y + R >= paddleY && b.y + R <= paddleY + 24 && b.x >= px - pw / 2 - R && b.x <= px + pw / 2 + R) {
        const rel = Math.max(-1, Math.min(1, (b.x - px) / (pw / 2)));
        const a = rel * 1.05;
        const s = speed();
        b.vx = Math.sin(a) * s;
        b.vy = -Math.cos(a) * s;
        b.y = paddleY - R;
        squash = 1;
        combo = 0;
        sfx.bounce(0);
      }
      const fire = t < fireUntil;
      for (const br of bricks) {
        if (!br.alive) continue;
        const nx = Math.max(br.x, Math.min(b.x, br.x + br.w));
        const ny = Math.max(br.y, Math.min(b.y, br.y + br.h));
        const dx = b.x - nx;
        const dy = b.y - ny;
        if (dx * dx + dy * dy >= R * R) continue;
        if (fire && br.type !== "steel") {
          destroy(br);
          continue;
        }
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
      if (keys.left) px -= 600 * dt;
      if (keys.right) px += 600 * dt;
      if (targetX !== null) px += (targetX - px) * Math.min(1, dt * 22);
      const pw = paddleW();
      px = Math.max(pw / 2, Math.min(W - pw / 2, px));
      squash = Math.max(0, squash - dt * 5);
      shakeT = Math.max(0, shakeT - dt);
      for (const s of stars) {
        s.y += s.v * dt;
        if (s.y > H) s.y = 0;
      }
      if (sway) {
        const off = Math.sin(t * 0.9) * 30;
        for (const br of bricks) br.x = br.bx + off;
      }
      for (const br of bricks) br.flash = Math.max(0, br.flash - dt * 6);

      const s = speed();
      for (const b of balls) {
        if (b.stuck) {
          b.x = px;
          b.y = paddleY - R - 1;
          b.trail = [];
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
        b.trail.unshift([b.x, b.y]);
        if (b.trail.length > 10) b.trail.pop();
      }
      balls = balls.filter((b) => b.y < H + R * 2);

      for (const d of drops) {
        d.y += 175 * dt;
        d.t += dt;
      }
      drops = drops.filter((d) => {
        if (d.y > paddleY - 8 && d.y < paddleY + 22 && Math.abs(d.x - px) < pw / 2 + 14) {
          sfx.powerup();
          popText(d.x, paddleY - 20, { W: "WIDE!", M: "MULTI!", S: "SLOW-MO", F: "FIREBALL!", "+": "+1 LIFE" }[d.kind], DROP_COLOR[d.kind]);
          if (d.kind === "W") wideUntil = t + 12;
          else if (d.kind === "S") slowUntil = t + 9;
          else if (d.kind === "F") fireUntil = t + 6;
          else if (d.kind === "+") lives = Math.min(5, lives + 1);
          else {
            const src = balls.find((b) => !b.stuck) ?? balls[0];
            if (src) {
              for (const off of [-0.45, 0.45]) {
                const a = Math.atan2(src.vx, -src.vy) + off;
                balls.push({ x: src.x, y: src.y, vx: Math.sin(a) * s, vy: -Math.abs(Math.cos(a) * s), stuck: false, trail: [] });
              }
            }
          }
          return false;
        }
        return d.y < H + 20;
      });

      for (const p of parts) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (!p.text) p.vy += 500 * dt;
        p.life -= dt;
      }
      parts = parts.filter((p) => p.life > 0);

      if (balls.length === 0) {
        lives -= 1;
        combo = 0;
        wideUntil = slowUntil = fireUntil = 0;
        drops = [];
        shakeT = 0.4;
        sfx.error();
        if (lives <= 0) {
          done = true;
          syncHud();
          sfx.lose();
          window.setTimeout(() => cbRef.current.onLose("The ball slipped past. Read the angle off the paddle and try again!"), 500);
          return;
        }
        balls = [{ x: px, y: paddleY - R - 1, vx: 0, vy: 0, stuck: true, trail: [] }];
      }

      if (breakable() === 0) {
        done = true;
        syncHud();
        sfx.clear();
        window.setTimeout(
          () =>
            cbRef.current.onWin(Math.min(3, lives), [
              { label: "Score", value: score.toLocaleString() },
              { label: "Best combo", value: `x${bestCombo}` },
              { label: "Lives left", value: String(lives) },
            ]),
          700,
        );
        return;
      }
      syncHud();
    }

    function rr(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0a0f2c");
      g.addColorStop(1, "#1d0b2b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      for (const s of stars) {
        ctx.globalAlpha = 0.25 + s.s * 0.3;
        ctx.fillStyle = "#c7d2fe";
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(129,140,248,0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, H * 0.55);
        ctx.lineTo(W / 2 + (x - W / 2) * 2.2, H);
        ctx.stroke();
      }

      if (shakeT > 0) ctx.translate((rng() - 0.5) * 12 * shakeT, (rng() - 0.5) * 12 * shakeT);

      for (const br of bricks) {
        if (!br.alive) continue;
        let top: string;
        let bot: string;
        if (br.type === "steel") {
          top = "#e2e8f0";
          bot = "#64748b";
        } else if (br.type === "bomb") {
          top = "#fca5a5";
          bot = "#b91c1c";
        } else if (br.type === "tough") {
          const l = br.hp >= 3 ? 34 : br.hp === 2 ? 44 : 56;
          top = `hsl(${br.hue} 80% ${l + 14}%)`;
          bot = `hsl(${br.hue} 85% ${l - 8}%)`;
        } else {
          top = `hsl(${br.hue} 95% 70%)`;
          bot = `hsl(${br.hue} 85% 48%)`;
        }
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = bot;
        rr(br.x - 3, br.y - 3, br.w + 6, br.h + 6, 8);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        rr(br.x, br.y + 3, br.w, br.h, 6);
        ctx.fill();
        const bg = ctx.createLinearGradient(0, br.y, 0, br.y + br.h);
        bg.addColorStop(0, top);
        bg.addColorStop(1, bot);
        ctx.fillStyle = bg;
        rr(br.x, br.y, br.w, br.h, 6);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        rr(br.x + 3, br.y + 2, br.w - 6, br.h * 0.32, 4);
        ctx.fill();
        if (br.flash > 0) {
          ctx.globalAlpha = br.flash * 0.8;
          ctx.fillStyle = "#fff";
          rr(br.x, br.y, br.w, br.h, 6);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (br.type === "tough") {
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.font = "bold 13px system-ui, sans-serif";
          ctx.fillText(String(br.hp), br.x + br.w / 2, br.y + br.h / 2 + 1);
        } else if (br.type === "bomb") {
          ctx.fillStyle = "#1f2937";
          ctx.beginPath();
          ctx.arc(br.x + br.w / 2, br.y + br.h / 2 + 1, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = (Math.sin(t * 10) > 0 ? "#fde047" : "#fb923c");
          ctx.beginPath();
          ctx.arc(br.x + br.w / 2 + 4, br.y + br.h / 2 - 5, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (br.type === "steel") {
          ctx.fillStyle = "#475569";
          for (const fx of [6, br.w - 6]) {
            ctx.beginPath();
            ctx.arc(br.x + fx, br.y + br.h / 2, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      for (const p of parts) {
        if (p.text !== undefined) {
          if (p.text === "") {
            ctx.globalAlpha = Math.max(0, p.life / 0.4) * 0.6;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - p.life / 0.4) + 10, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            ctx.globalAlpha = Math.min(1, p.life * 2);
            ctx.font = `800 ${p.size}px system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.lineWidth = 4;
            ctx.strokeStyle = "rgba(10,10,30,0.8)";
            ctx.strokeText(p.text, p.x, p.y);
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, p.x, p.y);
          }
        } else {
          ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;

      for (const d of drops) {
        const c = DROP_COLOR[d.kind];
        const bob = Math.sin(d.t * 8) * 1.5;
        ctx.shadowColor = c;
        ctx.shadowBlur = 14;
        const dg = ctx.createLinearGradient(0, d.y - 10, 0, d.y + 10);
        dg.addColorStop(0, "#fff");
        dg.addColorStop(0.35, c);
        dg.addColorStop(1, c);
        ctx.fillStyle = dg;
        rr(d.x - 19, d.y - 10 + bob, 38, 20, 10);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#0f172a";
        ctx.font = "900 13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d.kind, d.x, d.y + 1 + bob);
      }

      const pw = paddleW();
      const sq = squash * 4;
      const pg = ctx.createLinearGradient(0, paddleY, 0, paddleY + 16);
      pg.addColorStop(0, "#fed7aa");
      pg.addColorStop(0.4, "#fb923c");
      pg.addColorStop(1, "#e11d48");
      ctx.shadowColor = "#fb7185";
      ctx.shadowBlur = 22;
      ctx.fillStyle = pg;
      rr(px - pw / 2 - sq, paddleY + sq * 0.5, pw + sq * 2, 16 - sq * 0.5, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      rr(px - pw / 2 + 6, paddleY + 2, pw - 12, 4, 2);
      ctx.fill();

      const fire = t < fireUntil;
      for (const b of balls) {
        b.trail.forEach(([tx, ty], i) => {
          ctx.globalAlpha = (1 - i / b.trail.length) * 0.35;
          ctx.fillStyle = fire ? "#fb923c" : "#93c5fd";
          ctx.beginPath();
          ctx.arc(tx, ty, R * (1 - i / 14), 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.shadowColor = fire ? "#fb923c" : t < slowUntil ? "#6ee7b7" : "#bae6fd";
        ctx.shadowBlur = 18;
        ctx.fillStyle = fire ? "#fed7aa" : t < slowUntil ? "#a7f3d0" : "#ffffff";
        ctx.beginPath();
        ctx.arc(b.x, b.y, R, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (!done && balls.some((b) => b.stuck)) {
        ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.3;
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "700 17px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("TAP / CLICK / SPACE TO LAUNCH", W / 2, H / 2 + 80);
        ctx.globalAlpha = 1;
      }
    }

    function frame(now: number) {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      if (!done && !pausedRef.current) update(dt);
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
    <div className="flex w-full flex-col items-center">
      <Hud>
        <Hearts left={Math.min(hud.lives, 5)} total={Math.max(3, hud.lives)} />
        <Stat icon="trophy" label="Score" value={hud.score.toLocaleString()} />
        <Stat icon="grid" label="Bricks" value={hud.left} />
        {hud.combo >= 3 && <Stat icon="bolt" label="Combo" value={`x${hud.combo}`} tone="good" />}
      </Hud>
      <div className="board p-2" style={{ width: `min(100%, ${W + 16}px, calc(74dvh * ${W / H}))` }}>
        <canvas ref={canvasRef} className="block h-auto w-full touch-none rounded-[20px]" style={{ aspectRatio: `${W} / ${H}` }} />
      </div>
    </div>
  );
}
