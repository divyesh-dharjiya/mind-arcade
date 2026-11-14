"use client";

import { useEffect, useRef } from "react";
import { registerFx, type FxCmd } from "@/lib/fx";

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "spark" | "star" | "square" | "confetti" | "ring" | "text";
  rot: number;
  vr: number;
  g: number;
  drag: number;
  text?: string;
}

const DEFAULT = ["#fde047", "#f472b6", "#60a5fa", "#34d399", "#f97316", "#a78bfa"];

function starPath(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

export default function FxLayer() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let parts: P[] = [];
    let raf = 0;
    let running = false;
    let last = 0;
    let dpr = 1;
    // Canvas can't read CSS variables, so resolve the display font family once.
    const fontFamily =
      getComputedStyle(document.documentElement).getPropertyValue("--font-fredoka").trim() || "system-ui, sans-serif";

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const add = (p: Partial<P> & Pick<P, "x" | "y" | "kind" | "color">) => {
      parts.push({ vx: 0, vy: 0, life: 1, max: 1, size: 6, rot: Math.random() * 6.28, vr: 0, g: 0, drag: 0.98, ...p } as P);
    };

    const handle = (c: FxCmd) => {
      if (c.type === "burst") {
        const o = c.opts;
        const colors = o.colors ?? DEFAULT;
        const count = o.count ?? 18;
        const speed = o.speed ?? 320;
        const life = o.life ?? 0.75;
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const s = speed * (0.35 + Math.random() * 0.75);
          add({
            x: c.x,
            y: c.y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: life * (0.7 + Math.random() * 0.5),
            max: life,
            size: (o.size ?? 5) * (0.6 + Math.random() * 0.8),
            color: colors[i % colors.length],
            kind: o.kind ?? "spark",
            vr: (Math.random() - 0.5) * 12,
            g: o.gravity ?? 260,
            drag: 0.9,
          });
        }
        if (o.ring !== false) {
          add({ x: c.x, y: c.y, kind: "ring", color: colors[0], life: 0.45, max: 0.45, size: (o.size ?? 5) * 9 });
        }
      } else if (c.type === "confetti") {
        const colors = c.colors ?? DEFAULT;
        const w = window.innerWidth;
        const h = window.innerHeight;
        for (let i = 0; i < 170; i++) {
          const left = i % 2 === 0;
          const a = left ? -Math.PI / 2 + 0.25 + Math.random() * 0.55 : -Math.PI / 2 - 0.25 - Math.random() * 0.55;
          const s = 700 + Math.random() * 650;
          add({
            x: left ? -10 : w + 10,
            y: h * 0.85,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: 2.6 + Math.random() * 1.4,
            max: 3.5,
            size: 6 + Math.random() * 7,
            color: colors[i % colors.length],
            kind: "confetti",
            vr: (Math.random() - 0.5) * 14,
            g: 900,
            drag: 0.965,
          });
        }
      } else {
        add({ x: c.x, y: c.y, vy: -70, kind: "text", color: c.color, text: c.text, size: c.size, life: 1.1, max: 1.1, drag: 0.97 });
      }
      if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      for (const p of parts) {
        p.life -= dt;
        const k = Math.pow(p.drag, dt * 60);
        p.vx *= k;
        p.vy = p.vy * k + p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const t = Math.max(0, p.life / p.max);
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.kind === "spark") {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = t;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * (0.4 + t * 0.6), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = t * 0.25;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "star") {
          ctx.globalAlpha = Math.min(1, t * 1.5);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          starPath(ctx, p.size * 1.3);
          ctx.fill();
        } else if (p.kind === "square") {
          ctx.globalAlpha = t;
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else if (p.kind === "confetti") {
          ctx.globalAlpha = Math.min(1, t * 2);
          ctx.rotate(p.rot);
          ctx.scale(Math.cos(p.rot * 1.7), 1);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
          p.vx += Math.sin(now / 180 + p.size) * 12 * dt;
        } else if (p.kind === "ring") {
          const r = p.size * (1 - t) + 4;
          ctx.globalAlpha = t * 0.8;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3 * t + 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.kind === "text" && p.text) {
          const appear = Math.min(1, (p.max - p.life) / 0.12);
          ctx.globalAlpha = Math.min(1, t * 2.2);
          ctx.scale(0.6 + appear * 0.4, 0.6 + appear * 0.4);
          ctx.font = `700 ${p.size}px ${fontFamily}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = 5;
          ctx.strokeStyle = "rgba(15,23,42,0.85)";
          ctx.strokeText(p.text, 0, 0);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, 0, 0);
        }
        ctx.restore();
      }
      parts = parts.filter((p) => p.life > 0 && p.y < window.innerHeight + 80);
      if (parts.length) raf = requestAnimationFrame(loop);
      else {
        running = false;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      }
    };

    const unregister = registerFx(handle);
    return () => {
      unregister();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[80] h-full w-full" />;
}
