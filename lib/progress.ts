"use client";

import { useSyncExternalStore } from "react";

// { [gameId]: { [level]: stars } }
export type Progress = Record<string, Record<number, number>>;

const KEY = "mind-arcade:v1";
const EMPTY: Progress = {};

let cacheRaw: string | null | undefined;
let cache: Progress = EMPTY;
let memoryOnly = false;
const listeners = new Set<() => void>();

function read(): Progress {
  if (memoryOnly) return cache;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cache = raw ? (JSON.parse(raw) as Progress) : EMPTY;
    } catch {
      cache = EMPTY;
    }
  }
  return cache;
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveStars(gameId: string, level: number, stars: number) {
  const current = read();
  const game = { ...(current[gameId] ?? {}) };
  if ((game[level] ?? 0) >= stars) return;
  game[level] = stars;
  const next: Progress = { ...current, [gameId]: game };
  const raw = JSON.stringify(next);
  cache = next;
  cacheRaw = raw;
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    memoryOnly = true;
  }
  emit();
}

export function resetProgress() {
  cache = EMPTY;
  cacheRaw = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    memoryOnly = true;
  }
  emit();
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

const noopSubscribe = () => () => {};
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function gameStats(progress: Progress, gameId: string, levels: number) {
  const g = progress[gameId] ?? {};
  let completed = 0;
  let stars = 0;
  let highest = 0;
  for (let l = 1; l <= levels; l++) {
    const s = g[l] ?? 0;
    if (s > 0) {
      completed++;
      stars += s;
      highest = l;
    }
  }
  return { completed, stars, maxStars: levels * 3, unlocked: Math.min(levels, highest + 1) };
}
