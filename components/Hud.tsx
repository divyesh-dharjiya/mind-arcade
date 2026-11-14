import type { ReactNode } from "react";

export function Hud({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-sm">{children}</div>
  );
}

export function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "warn" | "good";
}) {
  const toneCls =
    tone === "warn"
      ? "border-rose-400/40 text-rose-200"
      : tone === "good"
        ? "border-emerald-400/40 text-emerald-200"
        : "border-white/10 text-slate-200";
  return (
    <div className={`flex items-center gap-2 rounded-full border bg-white/5 px-3 py-1.5 ${toneCls}`}>
      <span className="text-[11px] uppercase tracking-wider text-slate-400">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function Hearts({ left, total = 3 }: { left: number; total?: number }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={`h-4 w-4 ${i < left ? "text-rose-400" : "text-slate-600"}`}>
          <path
            fill="currentColor"
            d="M12 21s-7.5-4.6-9.6-9.2C.9 8.5 2.9 4.5 6.7 4.5c2.2 0 3.6 1.2 4.3 2.4.7-1.2 2.1-2.4 4.3-2.4 3.8 0 5.8 4 4.3 7.3C19.5 16.4 12 21 12 21z"
          />
        </svg>
      ))}
    </div>
  );
}

export function GameButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
