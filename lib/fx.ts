"use client";

// Fire-and-forget visual effects. Games call these; <FxLayer/> renders them.

export interface BurstOpts {
  colors?: string[];
  count?: number;
  speed?: number;
  size?: number;
  kind?: "spark" | "star" | "square";
  ring?: boolean;
  gravity?: number;
  life?: number;
}

export type FxCmd =
  | { type: "burst"; x: number; y: number; opts: BurstOpts }
  | { type: "confetti"; colors?: string[] }
  | { type: "text"; x: number; y: number; text: string; color: string; size: number };

let sink: ((c: FxCmd) => void) | null = null;

export function registerFx(fn: (c: FxCmd) => void) {
  sink = fn;
  return () => {
    if (sink === fn) sink = null;
  };
}

function send(c: FxCmd) {
  sink?.(c);
}

export function burst(x: number, y: number, opts: BurstOpts = {}) {
  send({ type: "burst", x, y, opts });
}

export function center(el: Element | null | undefined): [number, number] | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2];
}

export function burstAt(el: Element | null | undefined, opts: BurstOpts = {}) {
  const c = center(el);
  if (c) burst(c[0], c[1], opts);
}

export function confetti(colors?: string[]) {
  send({ type: "confetti", colors });
}

export function floatText(x: number, y: number, text: string, color = "#fde047", size = 26) {
  send({ type: "text", x, y, text, color, size });
}

export function floatTextAt(el: Element | null | undefined, text: string, color?: string, size?: number) {
  const c = center(el);
  if (c) floatText(c[0], c[1], text, color, size);
}

export function shake(el: Element | null | undefined, strength = 8, duration = 420) {
  if (!el || !("animate" in el)) return;
  const s = strength;
  (el as HTMLElement).animate(
    [
      { transform: "translate(0,0)" },
      { transform: `translate(${-s}px, ${s * 0.4}px) rotate(-0.4deg)` },
      { transform: `translate(${s}px, ${-s * 0.3}px) rotate(0.4deg)` },
      { transform: `translate(${-s * 0.6}px, ${-s * 0.2}px)` },
      { transform: `translate(${s * 0.4}px, ${s * 0.2}px)` },
      { transform: "translate(0,0)" },
    ],
    { duration, easing: "cubic-bezier(.36,.07,.19,.97)" },
  );
}
