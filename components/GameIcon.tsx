import type { GameMeta } from "@/lib/games";

function Glyph({ id }: { id: GameMeta["id"] }) {
  const s = { stroke: "currentColor", strokeWidth: 3.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (id) {
    case "arrow-escape":
      return (
        <g {...s}>
          <path d="M10 14h16m-5-5 5 5-5 5" />
          <path d="M34 10v18m-5-5 5 5 5-5" />
          <path d="M38 36H20m5-5-5 5 5 5" />
          <path d="M12 38V24" opacity={0.55} />
        </g>
      );
    case "brick-breaker":
      return (
        <g>
          {[0, 1, 2].map((c) => (
            <rect key={`a${c}`} x={6 + c * 13} y={7} width={10.5} height={6} rx={2} fill="currentColor" />
          ))}
          {[0, 1].map((c) => (
            <rect key={`b${c}`} x={12.5 + c * 13} y={16} width={10.5} height={6} rx={2} fill="currentColor" opacity={0.65} />
          ))}
          <circle cx={30} cy={31} r={3.6} fill="currentColor" />
          <rect x={14} y={38} width={20} height={4.5} rx={2.2} fill="currentColor" />
        </g>
      );
    case "light-flip":
      return (
        <g>
          {[0, 1, 2].flatMap((r) =>
            [0, 1, 2].map((c) => {
              const on = (r === 1) || (c === 1);
              return (
                <rect key={`${r}${c}`} x={7 + c * 12} y={7 + r * 12} width={10} height={10} rx={2.6} fill="currentColor" opacity={on ? 1 : 0.28} />
              );
            }),
          )}
        </g>
      );
    case "slide-puzzle":
      return (
        <g>
          {[0, 1, 2].flatMap((r) =>
            [0, 1, 2].map((c) =>
              r === 2 && c === 2 ? null : (
                <rect key={`${r}${c}`} x={7 + c * 12} y={7 + r * 12} width={10} height={10} rx={2.6} fill="currentColor" opacity={r === 2 && c === 1 ? 0.55 : 1} />
              ),
            ),
          )}
          <path d="M36 41h5" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
    case "memory-match":
      return (
        <g>
          <rect x={7} y={10} width={18} height={26} rx={4} fill="currentColor" opacity={0.45} transform="rotate(-10 16 23)" />
          <rect x={22} y={10} width={18} height={26} rx={4} fill="currentColor" transform="rotate(8 31 23)" />
          <path d="M31 18.5l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z" fill="#0f172a" opacity={0.75} transform="rotate(8 31 23)" />
        </g>
      );
    case "pattern-recall":
      return (
        <g>
          {[0, 1, 2].flatMap((r) =>
            [0, 1, 2].map((c) => {
              const on = (r === 0 && c === 0) || (r === 1 && c === 2) || (r === 2 && c === 1);
              return (
                <circle key={`${r}${c}`} cx={12 + c * 12} cy={12 + r * 12} r={on ? 5 : 3} fill="currentColor" opacity={on ? 1 : 0.3} />
              );
            }),
          )}
          <path d="M12 12 36 24 24 36" stroke="currentColor" strokeWidth={1.8} fill="none" strokeDasharray="2 3" opacity={0.7} />
        </g>
      );
    case "color-sort":
      return (
        <g>
          {[0, 1, 2].map((t) => (
            <g key={t}>
              <path d={`M${8 + t * 12} 8v26a5 5 0 0 0 10 0V8`} stroke="currentColor" strokeWidth={2.6} fill="none" />
              <rect x={10 + t * 12} y={t === 1 ? 26 : 20} width={6} height={t === 1 ? 12 : 18} rx={2} fill="currentColor" opacity={t === 0 ? 1 : t === 1 ? 0.7 : 0.45} />
            </g>
          ))}
        </g>
      );
    case "pipe-connect":
      return (
        <g {...s} strokeWidth={4.5}>
          <path d="M8 24h12V10h18" />
          <path d="M20 24v14h12" />
          <circle cx={38} cy={10} r={3} fill="currentColor" />
          <circle cx={34} cy={38} r={4.5} fill="currentColor" stroke="none" />
          <circle cx={8} cy={24} r={4.5} fill="currentColor" stroke="none" />
        </g>
      );
  }
}

export function GameIcon({ game, size = 56 }: { game: GameMeta; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${game.accent}, ${game.accent2})`,
        boxShadow: `0 10px 30px -10px ${game.accent}`,
      }}
    >
      <svg viewBox="0 0 48 48" width={size * 0.66} height={size * 0.66} aria-hidden>
        <Glyph id={game.id} />
      </svg>
    </span>
  );
}

export function StarIcon({ on, size = 16 }: { on: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={on ? "text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.5)]" : "text-slate-600"}>
      <path fill="currentColor" d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.3l-5.6 2.9 1.1-6.3L2.9 9.5l6.3-.9z" />
    </svg>
  );
}

export function Stars({ count, size = 16, className = "" }: { count: number; size?: number; className?: string }) {
  return (
    <span className={`inline-flex gap-0.5 ${className}`} aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <StarIcon key={i} on={i < count} size={size} />
      ))}
    </span>
  );
}
