"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./ui/Icon";
import { sfx } from "@/lib/sfx";

export function Hud({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:mb-5">{children}</div>;
}

export function Stat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon?: IconName;
  label: string;
  value: ReactNode;
  tone?: "default" | "warn" | "good";
}) {
  const ring =
    tone === "warn" ? "ring-rose-400/60 text-rose-100" : tone === "good" ? "ring-emerald-400/50 text-emerald-100" : "ring-white/10 text-white";
  return (
    <div className={`panel flex h-10 items-center gap-2 rounded-2xl px-3 ring-1 ${ring}`}>
      {icon && <Icon name={icon} className="h-4 w-4 opacity-80" />}
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">{label}</span>
      <motion.span
        key={String(value)}
        initial={{ scale: 1.35, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
        className="font-display text-lg font-bold tabular-nums leading-none"
      >
        {value}
      </motion.span>
    </div>
  );
}

export function Hearts({ left, total = 3 }: { left: number; total?: number }) {
  return (
    <div className="panel flex h-10 items-center gap-1 rounded-2xl px-3" aria-label={`${left} of ${total} hearts`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="relative h-5 w-5">
          <Icon name="heart" className="absolute inset-0 h-5 w-5 text-white/15" />
          <AnimatePresence>
            {i < left && (
              <motion.span
                key="h"
                className="absolute inset-0"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: [1, 1.6, 0], rotate: [0, -15, 25], opacity: [1, 1, 0] }}
                transition={{ duration: 0.45 }}
              >
                <Icon name="heart" className="h-5 w-5 text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.8)]" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      ))}
    </div>
  );
}

export function GoalBar({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="panel flex h-10 min-w-[180px] items-center gap-3 rounded-2xl px-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">{label}</span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-black/40 shadow-inner">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, #fff)` }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
      <span className="font-display text-sm font-bold tabular-nums">
        {value}/{max}
      </span>
    </div>
  );
}

export function GameButton({
  onClick,
  children,
  disabled,
  icon,
  active,
}: {
  onClick: () => void;
  children?: ReactNode;
  disabled?: boolean;
  icon?: IconName;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx.tap();
        onClick();
      }}
      disabled={disabled}
      className={`btn3d ${active ? "yellow" : "dark"} h-10 rounded-2xl px-3.5 text-sm`}
    >
      {icon && <Icon name={icon} className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
