"use client";

// Tiny synthesized sound kit (Web Audio) so games feel alive with zero audio files.

import { getSettings } from "./settings";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!getSettings().sound) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  dur?: number;
  vol?: number;
  attack?: number;
  slideTo?: number;
  delay?: number;
  detune?: number;
}

function tone({ freq, type = "sine", dur = 0.12, vol = 0.2, attack = 0.005, slideTo, delay = 0, detune = 0 }: ToneOpts) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.detune.value = detune;
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

interface NoiseOpts {
  dur?: number;
  vol?: number;
  freq?: number;
  sweepTo?: number;
  q?: number;
  type?: BiquadFilterType;
  delay?: number;
}

let noiseBuf: AudioBuffer | null = null;
function noise({ dur = 0.2, vol = 0.15, freq = 1200, sweepTo, q = 1, type = "bandpass", delay = 0 }: NoiseOpts) {
  const c = ac();
  if (!c || !master) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const semi = (base: number, n: number) => base * Math.pow(2, n / 12);
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export function haptic(ms: number | number[] = 12) {
  if (typeof navigator === "undefined" || !getSettings().haptics) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

export const sfx = {
  /** UI button tap */
  tap: () => tone({ freq: 620, type: "triangle", dur: 0.07, vol: 0.12, slideTo: 880 }),
  /** soft select / pick up */
  select: () => tone({ freq: 440, type: "sine", dur: 0.09, vol: 0.16, slideTo: 660 }),
  /** pitched pop, p = semitone offset */
  pop: (p = 0) => {
    tone({ freq: semi(420, p), type: "sine", dur: 0.13, vol: 0.22, slideTo: semi(920, p) });
    tone({ freq: semi(840, p), type: "triangle", dur: 0.06, vol: 0.06, delay: 0.01 });
  },
  click: (p = 0) => tone({ freq: semi(1100, p), type: "square", dur: 0.025, vol: 0.05 }),
  rotate: () => {
    tone({ freq: 900, type: "square", dur: 0.02, vol: 0.04 });
    noise({ dur: 0.06, vol: 0.05, freq: 3000, type: "highpass" });
  },
  whoosh: () => noise({ dur: 0.28, vol: 0.18, freq: 500, sweepTo: 4200, q: 0.8 }),
  thud: () => {
    tone({ freq: 140, type: "sine", dur: 0.16, vol: 0.3, slideTo: 60 });
    noise({ dur: 0.08, vol: 0.08, freq: 400, type: "lowpass" });
  },
  bounce: (p = 0) => tone({ freq: semi(330, p), type: "triangle", dur: 0.08, vol: 0.14 }),
  error: () => {
    tone({ freq: 196, type: "sawtooth", dur: 0.16, vol: 0.09, slideTo: 110 });
    tone({ freq: 185, type: "square", dur: 0.16, vol: 0.05, slideTo: 104, delay: 0.02 });
    haptic([20, 40, 20]);
  },
  pour: () => {
    noise({ dur: 0.55, vol: 0.12, freq: 600, sweepTo: 1600, q: 3 });
    [0, 0.12, 0.24, 0.36].forEach((d, i) => tone({ freq: 500 + i * 90, type: "sine", dur: 0.06, vol: 0.06, delay: d, slideTo: 900 + i * 90 }));
  },
  flip: () => noise({ dur: 0.09, vol: 0.12, freq: 2400, type: "bandpass", q: 0.7 }),
  note: (i: number) => {
    const f = semi(392, PENTA[i % PENTA.length]);
    tone({ freq: f, type: "triangle", dur: 0.38, vol: 0.2 });
    tone({ freq: f * 2, type: "sine", dur: 0.25, vol: 0.05 });
  },
  match: (combo = 0) => {
    const base = Math.min(combo, 8);
    [0, 4, 7].forEach((n, i) => tone({ freq: semi(523, n + base), type: "triangle", dur: 0.16, vol: 0.13, delay: i * 0.045 }));
  },
  clear: () => {
    noise({ dur: 0.35, vol: 0.14, freq: 1200, sweepTo: 6000, q: 0.6 });
    [0, 7, 12, 19].forEach((n, i) => tone({ freq: semi(523, n), type: "sine", dur: 0.2, vol: 0.1, delay: i * 0.04 }));
  },
  powerup: () => [0, 4, 7, 12, 16].forEach((n, i) => tone({ freq: semi(440, n), type: "square", dur: 0.08, vol: 0.06, delay: i * 0.05 })),
  explode: () => {
    noise({ dur: 0.5, vol: 0.3, freq: 900, sweepTo: 80, type: "lowpass" });
    tone({ freq: 90, type: "sine", dur: 0.4, vol: 0.3, slideTo: 40 });
    haptic(30);
  },
  coin: () => {
    tone({ freq: 988, type: "square", dur: 0.06, vol: 0.06 });
    tone({ freq: 1319, type: "square", dur: 0.18, vol: 0.06, delay: 0.06 });
  },
  star: (i: number) => {
    const f = [784, 988, 1175][i] ?? 1175;
    tone({ freq: f, type: "triangle", dur: 0.35, vol: 0.2 });
    tone({ freq: f * 1.5, type: "sine", dur: 0.25, vol: 0.06, delay: 0.03 });
    noise({ dur: 0.2, vol: 0.05, freq: 7000, type: "highpass", delay: 0.02 });
  },
  win: () => {
    [0, 4, 7, 12].forEach((n, i) => tone({ freq: semi(523, n), type: "triangle", dur: 0.22, vol: 0.16, delay: i * 0.1 }));
    [12, 16, 19, 24].forEach((n, i) => tone({ freq: semi(523, n), type: "sine", dur: 0.5, vol: 0.08, delay: 0.42 + i * 0.03 }));
    haptic([15, 60, 15]);
  },
  lose: () => {
    [0, -3, -6, -10].forEach((n, i) => tone({ freq: semi(392, n), type: "triangle", dur: 0.3, vol: 0.14, delay: i * 0.16 }));
    haptic(60);
  },
  tick: () => tone({ freq: 1500, type: "sine", dur: 0.03, vol: 0.05 }),
  start: () => [0, 7, 12].forEach((n, i) => tone({ freq: semi(440, n), type: "triangle", dur: 0.14, vol: 0.12, delay: i * 0.08 })),
};
