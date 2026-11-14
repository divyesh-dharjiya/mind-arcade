"use client";

import { useSyncExternalStore } from "react";

export interface Settings {
  sound: boolean;
  haptics: boolean;
}

const KEY = "mind-arcade:settings";
const DEFAULTS: Settings = { sound: true, haptics: true };

let cache: Settings = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function load(): Settings {
  if (loaded) return cache;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) cache = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    cache = DEFAULTS;
  }
  return cache;
}

export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  return load();
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  cache = { ...load(), [key]: value };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULTS);
}

/** Remembers the last game + level the player opened, for "Continue". */
const LAST_KEY = "mind-arcade:last";
export function rememberLast(gameId: string, level: number) {
  try {
    window.localStorage.setItem(LAST_KEY, JSON.stringify({ gameId, level }));
  } catch {
    /* ignore */
  }
}
function readLastRaw(): string | null {
  try {
    return window.localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}
const noop = () => () => {};
/** Last played game as a raw JSON string (stable for React), parse with parseLast. */
export function useLastRaw(): string | null {
  return useSyncExternalStore(noop, readLastRaw, () => null);
}
export function parseLast(raw: string | null): { gameId: string; level: number } | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { gameId: string; level: number };
  } catch {
    return null;
  }
}
