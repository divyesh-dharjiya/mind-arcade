import type { GameMeta } from "@/lib/games";

const fb = { transformBox: "fill-box" as const, transformOrigin: "center" as const };
const hov = "transition-transform duration-500 ease-out";

function Gloss({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
      <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
    </linearGradient>
  );
}

function Tile({ x, y, w, h, c, gid, r = 7 }: { x: number; y: number; w: number; h: number; c: string; gid: string; r?: number }) {
  return (
    <g>
      <rect x={x} y={y + 3} width={w} height={h} rx={r} fill="#000" opacity={0.3} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill={c} />
      <rect x={x + 2} y={y + 2} width={w - 4} height={h * 0.45} rx={r - 2} fill={`url(#${gid})`} />
    </g>
  );
}

function Art({ id, a }: { id: GameMeta["id"]; a: string }) {
  const g = `${id}-gloss`;
  switch (id) {
    case "arrow-escape": {
      const C = ["#22d3ee", "#a78bfa", "#f472b6", "#fbbf24"];
      const cells: [number, number, number][] = [
        [0, 0, 1], [1, 0, 0], [2, 0, 1], [0, 1, 3], [1, 1, 2], [3, 1, 0], [0, 2, 2], [2, 2, 3], [3, 2, 1],
      ];
      const rot = [0, 90, 180, 270];
      return (
        <>
          <defs><Gloss id={g} /></defs>
          {cells.map(([cx, cy, d], i) => (
            <g key={i}>
              <Tile x={38 + cx * 30} y={22 + cy * 30} w={25} h={25} c={C[d]} gid={g} />
              <path d="M-6 0h10M1-5l5 5-5 5" transform={`translate(${50.5 + cx * 30} ${34.5 + cy * 30}) rotate(${rot[d] - 90})`} stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ))}
          <g className={`${hov} group-hover:translate-x-6`}>
            <path d="M126 46h22M130 54h14M128 38h12" stroke="#fff" strokeOpacity={0.5} strokeWidth={2.5} strokeLinecap="round" />
            <Tile x={152} y={34} w={25} h={25} c="#22d3ee" gid={g} />
            <path d="M158 46.5h10M163 41.5l5 5-5 5" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </>
      );
    }
    case "gem-swap": {
      const gems = [
        ["#f43f5e", "d"], ["#22d3ee", "c"], ["#a3e635", "h"],
        ["#fbbf24", "c"], ["#e879f9", "d"], ["#f43f5e", "h"],
        ["#22d3ee", "h"], ["#fbbf24", "d"], ["#e879f9", "c"],
      ] as const;
      return (
        <>
          <defs><Gloss id={g} /></defs>
          {gems.map(([c, s], i) => {
            const x = 64 + (i % 3) * 36;
            const y = 30 + Math.floor(i / 3) * 34;
            const shape =
              s === "d" ? <path d="M0-14 13 0 0 14-13 0z" fill={c} /> : s === "c" ? <circle r={13} fill={c} /> : <path d="M-12-7 0-14 12-7 12 7 0 14-12 7z" fill={c} />;
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <g className={i === 4 ? "animate-bob" : ""} style={fb}>
                  {shape}
                  <path d="M-6-8 0-11 5-8 0-3z" fill="#fff" opacity={0.7} />
                  <circle r={13} fill={`url(#${g})`} opacity={0.6} />
                </g>
              </g>
            );
          })}
          <g className={`${hov} group-hover:scale-125`} style={fb}>
            <path d="M150 28l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff" />
          </g>
          <path d="M40 100l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fde047" />
        </>
      );
    }
    case "block-fit": {
      const filled = new Set(["0,4", "1,4", "2,4", "3,4", "4,4", "6,4", "0,3", "1,3", "5,3", "6,3", "0,2", "6,2", "5,4", "2,3"]);
      const colors = ["#fbbf24", "#f97316", "#38bdf8", "#a78bfa", "#34d399", "#f472b6"];
      return (
        <>
          <defs><Gloss id={g} /></defs>
          <rect x={44} y={34} width={112} height={82} rx={10} fill="#0b1026" opacity={0.7} />
          {Array.from({ length: 35 }, (_, i) => {
            const cx = i % 7;
            const cy = Math.floor(i / 7);
            const on = filled.has(`${cx},${cy}`);
            return on ? (
              <Tile key={i} x={48 + cx * 15.5} y={38 + cy * 15.5} w={13.5} h={13.5} c={colors[(cx + cy) % colors.length]} gid={g} r={3.5} />
            ) : (
              <rect key={i} x={48 + cx * 15.5} y={38 + cy * 15.5} width={13.5} height={13.5} rx={3.5} fill="#fff" opacity={0.05} />
            );
          })}
          <g className={`${hov} group-hover:translate-y-3`}>
            {[[0, 0], [1, 0], [2, 0], [1, 1]].map(([x, y], i) => (
              <Tile key={i} x={124 + x * 15.5} y={8 + y * 15.5} w={13.5} h={13.5} c="#f472b6" gid={g} r={3.5} />
            ))}
          </g>
        </>
      );
    }
    case "laser-lab":
      return (
        <>
          <defs>
            <Gloss id={g} />
            <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {Array.from({ length: 20 }, (_, i) => (
            <rect key={i} x={30 + (i % 5) * 30} y={18 + Math.floor(i / 5) * 27} width={26} height={23} rx={5} fill="#fff" opacity={0.04} />
          ))}
          <rect x={22} y={28} width={20} height={16} rx={4} fill="#475569" />
          <circle cx={42} cy={36} r={4} fill="#fb7185" />
          <path d="M42 36H103V90H160" stroke="#fb7185" strokeWidth={4} fill="none" filter={`url(#${id}-glow)`} className="animate-glow" style={{ ["--accent" as string]: "#fb7185" }} />
          <path d="M42 36H103V90H160" stroke="#fff" strokeWidth={1.4} fill="none" />
          <rect x={96} y={29} width={14} height={4} rx={2} fill="#e2e8f0" transform="rotate(45 103 31)" />
          <rect x={96} y={86} width={14} height={4} rx={2} fill="#e2e8f0" transform="rotate(45 103 88)" />
          <g className={`${hov} group-hover:rotate-12`} style={fb}>
            <path d="M160 76l9 14-9 14-9-14z" fill="#f9a8d4" />
            <path d="M160 76l9 14-9 3z" fill="#fff" opacity={0.6} />
          </g>
          <path d="M70 105l-6 10h12z" fill="#94a3b8" opacity={0.5} />
        </>
      );
    case "sudoku": {
      const nums = ["5", "", "3", "", "7", "", "6", "1", ""];
      return (
        <>
          <rect x={56} y={18} width={90} height={90} rx={10} fill="#f8fafc" />
          {nums.map((n, i) => {
            const x = 56 + (i % 3) * 30;
            const y = 18 + Math.floor(i / 3) * 30;
            return (
              <g key={i}>
                {i === 4 && <rect x={x + 2} y={y + 2} width={26} height={26} rx={5} fill="#bae6fd" />}
                <text x={x + 15} y={y + 21} textAnchor="middle" fontSize={17} fontWeight={700} fill={i === 4 ? "#0284c7" : "#1e293b"} fontFamily="system-ui">
                  {n}
                </text>
              </g>
            );
          })}
          <path d="M86 18v90M116 18v90M56 48h90M56 78h90" stroke="#94a3b8" strokeWidth={1.5} />
          <g className={`${hov} group-hover:-translate-y-2 group-hover:-rotate-6`} style={fb}>
            <rect x={140} y={70} width={10} height={44} rx={3} fill="#fbbf24" transform="rotate(35 145 92)" />
            <path d="M126 108l6 4-7 3z" fill="#1e293b" />
          </g>
        </>
      );
    }
    case "color-sort": {
      const tubes = [
        ["#ef4444", "#3b82f6", "#ef4444", "#facc15"],
        ["#3b82f6", "#facc15", "#3b82f6"],
        ["#facc15", "#ef4444"],
      ];
      return (
        <>
          {tubes.map((t, ti) => (
            <g key={ti} transform={`translate(${52 + ti * 34} 22)`}>
              <rect x={0} y={0} width={22} height={88} rx={11} fill="#fff" opacity={0.1} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
              {t.map((c, li) => (
                <rect key={li} x={3} y={85 - (li + 1) * 19} width={16} height={19} rx={li === 0 ? 8 : 0} fill={c} />
              ))}
              <rect x={4} y={6} width={4} height={70} rx={2} fill="#fff" opacity={0.35} />
            </g>
          ))}
          <g className={`${hov} group-hover:-rotate-[18deg]`} style={{ transformBox: "fill-box", transformOrigin: "20% 20%" }}>
            <g transform="translate(150 16) rotate(-55 11 44)">
              <rect x={0} y={0} width={22} height={88} rx={11} fill="#fff" opacity={0.1} stroke="#fff" strokeOpacity={0.6} strokeWidth={2} />
              <rect x={3} y={47} width={16} height={38} rx={8} fill="#3b82f6" />
            </g>
          </g>
          <rect x={128} y={20} width={4} height={30} rx={2} fill="#3b82f6" opacity={0.85} />
        </>
      );
    }
    case "brick-breaker": {
      return (
        <>
          <defs><Gloss id={g} /></defs>
          {Array.from({ length: 18 }, (_, i) => {
            const r = Math.floor(i / 6);
            const c = i % 6;
            if (r === 2 && (c === 1 || c === 4)) return null;
            return <Tile key={i} x={32 + c * 23.5} y={16 + r * 14} w={21} h={11} c={`hsl(${r * 40 + 10} 90% 60%)`} gid={g} r={3} />;
          })}
          <path d="M98 108 118 70" stroke="#fff" strokeOpacity={0.25} strokeWidth={6} strokeLinecap="round" />
          <g className={`${hov} group-hover:-translate-y-4 group-hover:translate-x-3`}>
            <circle cx={118} cy={68} r={6} fill="#fff" />
          </g>
          <rect x={74} y={112} width={52} height={9} rx={4.5} fill="#fb923c" />
          <rect x={77} y={113} width={46} height={3} rx={1.5} fill="#fff" opacity={0.5} />
        </>
      );
    }
    case "pipe-connect":
      return (
        <>
          <path d="M40 70H80V36H130V96H165" stroke="#0b1d12" strokeWidth={14} fill="none" strokeLinejoin="round" />
          <path d="M40 70H80V36H130V96H165" stroke={a} strokeWidth={7} fill="none" strokeLinejoin="round" strokeDasharray="10 6" className="[animation:dash_1.2s_linear_infinite]" />
          <path d="M80 70v34H60" stroke="#0b1d12" strokeWidth={14} fill="none" />
          <path d="M80 70v34H60" stroke="#64748b" strokeWidth={7} fill="none" />
          <circle cx={40} cy={70} r={13} fill="#0b1d12" />
          <circle cx={40} cy={70} r={9} fill="#bef264" className="animate-glow" style={{ ["--accent" as string]: "#a3e635" }} />
          <circle cx={165} cy={96} r={11} fill="#0b1d12" />
          <circle cx={165} cy={96} r={7.5} fill="#fde047" className="animate-glow" style={{ ["--accent" as string]: "#fde047" }} />
          <circle cx={60} cy={104} r={9} fill="#0b1d12" />
          <circle cx={60} cy={104} r={6} fill="#334155" />
        </>
      );
    case "light-flip":
      return (
        <>
          {Array.from({ length: 9 }, (_, i) => {
            const on = [1, 3, 4, 5, 7].includes(i);
            const x = 64 + (i % 3) * 26;
            const y = 18 + Math.floor(i / 3) * 34;
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                {on && <circle cx={11} cy={13} r={17} fill="#facc15" opacity={0.25} className="animate-pulse" />}
                <circle cx={11} cy={13} r={10} fill={on ? "#fde047" : "#334155"} />
                <rect x={6} y={22} width={10} height={6} rx={2} fill="#94a3b8" />
                {on && <circle cx={8} cy={9} r={3} fill="#fff" opacity={0.8} />}
              </g>
            );
          })}
        </>
      );
    case "slide-puzzle": {
      const tiles = [0, 1, 2, 3, 4, 5, 6, 7];
      return (
        <>
          <defs>
            <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f472b6" />
              <stop offset="1" stopColor="#fbbf24" />
            </linearGradient>
            <clipPath id={`${id}-clip`}>
              <rect x={0} y={0} width={30} height={30} rx={4} />
            </clipPath>
          </defs>
          {tiles.map((t) => {
            const cx = t % 3;
            const cy = Math.floor(t / 3);
            const slide = t === 7;
            return (
              <g key={t} className={slide ? `${hov} group-hover:translate-x-[32px]` : ""}>
                <g transform={`translate(${56 + cx * 32} ${18 + cy * 32})`}>
                  <g clipPath={`url(#${id}-clip)`}>
                    <g transform={`translate(${-cx * 30} ${-cy * 30})`}>
                      <rect width={90} height={90} fill={`url(#${id}-sky)`} />
                      <circle cx={60} cy={34} r={14} fill="#fff7ed" />
                      <path d="M0 70 28 40 50 62 70 44 90 64V90H0z" fill="#7c3aed" />
                      <path d="M0 80 30 62 60 80 90 70V90H0z" fill="#4c1d95" />
                    </g>
                  </g>
                  <rect width={30} height={30} rx={4} fill="none" stroke="#fff" strokeOpacity={0.35} />
                </g>
              </g>
            );
          })}
        </>
      );
    }
    case "memory-match":
      return (
        <>
          <g className={`${hov} group-hover:-rotate-12`} style={fb}>
            <rect x={52} y={30} width={44} height={62} rx={8} fill="url(#mm-back)" transform="rotate(-14 74 61)" />
          </g>
          <defs>
            <linearGradient id="mm-back" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#db2777" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <g className={`${hov} group-hover:rotate-12`} style={fb}>
            <rect x={104} y={30} width={44} height={62} rx={8} fill="url(#mm-back)" transform="rotate(14 126 61)" />
          </g>
          <g className={`${hov} group-hover:-translate-y-2`}>
            <rect x={78} y={22} width={44} height={62} rx={8} fill="#f8fafc" />
            <path d="M100 38l5 10 11 1.6-8 7.7 1.9 11-9.9-5.2-9.9 5.2 1.9-11-8-7.7 11-1.6z" fill="#f472b6" />
          </g>
        </>
      );
    case "pattern-recall":
      return (
        <>
          {[
            ["#34d399", 0, 0],
            ["#22d3ee", 1, 0],
            ["#fbbf24", 0, 1],
            ["#f472b6", 1, 1],
          ].map(([c, x, y], i) => (
            <rect
              key={i}
              x={64 + (x as number) * 38}
              y={16 + (y as number) * 38}
              width={34}
              height={34}
              rx={9}
              fill={c as string}
              opacity={i === 1 ? 1 : 0.35}
              className={i === 1 ? "animate-glow" : ""}
              style={i === 1 ? { ["--accent" as string]: c as string } : undefined}
            />
          ))}
          <g className={`${hov} group-hover:-translate-y-3`}>
            <path d="M156 34v20a5 5 0 1 1-3-4.6V30l14-4v18a5 5 0 1 1-3-4.6V31z" fill="#fff" opacity={0.85} />
          </g>
          <circle cx={150} cy={102} r={3} fill="#fff" opacity={0.6} />
          <circle cx={162} cy={102} r={3} fill="#fff" opacity={0.6} />
          <circle cx={174} cy={102} r={3} fill="#fff" opacity={0.25} />
        </>
      );
  }
}

export function GameArt({ game, className = "" }: { game: GameMeta; className?: string }) {
  return (
    <svg viewBox="0 0 200 130" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${game.id}-bg`} cx="50%" cy="20%" r="90%">
          <stop offset="0" stopColor={game.accent} stopOpacity="0.55" />
          <stop offset="0.55" stopColor={game.accent2} stopOpacity="0.35" />
          <stop offset="1" stopColor={game.bg[0]} stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="200" height="130" fill={`url(#${game.id}-bg)`} />
      <circle cx="178" cy="18" r="1.4" fill="#fff" opacity="0.7" />
      <circle cx="16" cy="112" r="1.2" fill="#fff" opacity="0.6" />
      <circle cx="24" cy="20" r="1" fill="#fff" opacity="0.5" />
      <Art id={game.id} a={game.accent} />
    </svg>
  );
}

const STAR = "M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.3l-5.6 2.9 1.1-6.3L2.9 9.5l6.3-.9z";

/** Filled 24×24 pictograms, drawn in white with `ink` used for inner detail. */
function Glyph({ id, ink }: { id: GameMeta["id"]; ink: string }) {
  const W = "#fff";
  switch (id) {
    case "arrow-escape":
      return (
        <>
          <path d="M3.5 10.2h9V6.2l8 5.8-8 5.8v-4h-9z" fill={W} />
          <path d="M2.5 6.8h4.2M2 17.2h5" stroke={W} strokeWidth={1.8} strokeLinecap="round" opacity={0.65} />
        </>
      );
    case "gem-swap":
      return (
        <>
          <path d="M7 3.8h10l4.2 5.2L12 20.4 2.8 9z" fill={W} />
          <path d="M2.8 9h18.4M7 3.8 9.6 9 12 20.4 14.4 9 17 3.8M9.6 9 12 3.8 14.4 9" fill="none" stroke={ink} strokeWidth={1.1} strokeLinejoin="round" opacity={0.55} />
        </>
      );
    case "block-fit":
      return (
        <>
          {[[2, 12.5], [9, 12.5], [16, 12.5], [9, 5.5]].map(([x, y], i) => (
            <g key={i}>
              <rect x={x} y={y} width={6} height={6} rx={1.5} fill={W} />
              <rect x={x + 1} y={y + 1} width={4} height={1.4} rx={0.7} fill={ink} opacity={0.18} />
            </g>
          ))}
        </>
      );
    case "laser-lab":
      return (
        <>
          <rect x={1.8} y={13} width={5} height={5} rx={1.3} fill={W} />
          <path d="M6.8 15.5h7.7V10.6" fill="none" stroke={W} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12.6 17.4 16.4 13.6" stroke={W} strokeWidth={2.6} strokeLinecap="round" />
          <path d="M14.5 0.6 19.2 5.6 14.5 10.6 9.8 5.6z" fill={W} />
          <path d="M14.5 0.6 19.2 5.6H14.5z" fill={ink} opacity={0.3} />
        </>
      );
    case "sudoku":
      return (
        <>
          <rect x={3} y={3} width={18} height={18} rx={3.4} fill={W} />
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke={ink} strokeWidth={0.9} opacity={0.3} />
          <rect x={9} y={9} width={6} height={6} fill={ink} />
          <text x={12} y={14.1} textAnchor="middle" fontSize={5.4} fontWeight={800} fill={W} fontFamily="system-ui, sans-serif">7</text>
          <text x={6} y={8} textAnchor="middle" fontSize={4.4} fontWeight={700} fill={ink} fontFamily="system-ui, sans-serif">3</text>
          <text x={18} y={20} textAnchor="middle" fontSize={4.4} fontWeight={700} fill={ink} fontFamily="system-ui, sans-serif">5</text>
        </>
      );
    case "color-sort":
      return (
        <>
          {[4.2, 13.8].map((x, i) => (
            <g key={i}>
              <path d={`M${x} 2.6h6v14.4a3 3 0 0 1-6 0z`} fill="none" stroke={W} strokeWidth={1.6} />
              <path d={`M${x + 0.9} ${i ? 12.2 : 8.4}h4.2v${i ? 4.8 : 8.6}a2.1 2.1 0 0 1-4.2 0z`} fill={W} />
              <path d={`M${x + 0.9} ${i ? 14.6 : 12.6}h4.2`} stroke={ink} strokeWidth={0.9} opacity={0.35} />
            </g>
          ))}
        </>
      );
    case "brick-breaker":
      return (
        <>
          {[[2, 3, 1], [9, 3, 1], [16, 3, 0.55], [5.5, 7.6, 0.85], [12.5, 7.6, 1]].map(([x, y, o], i) => (
            <rect key={i} x={x} y={y} width={6} height={3.6} rx={1.1} fill={W} opacity={o} />
          ))}
          <circle cx={15.2} cy={15} r={2.1} fill={W} />
          <path d="M11.5 18.2 14 16.4" stroke={W} strokeWidth={1.2} strokeLinecap="round" opacity={0.5} />
          <rect x={4.5} y={19.6} width={11} height={2.6} rx={1.3} fill={W} />
        </>
      );
    case "pipe-connect":
      return (
        <>
          <path d="M3 8h7.5a4.5 4.5 0 0 1 4.5 4.5V21" fill="none" stroke={W} strokeWidth={4.4} />
          <rect x={1.6} y={5.4} width={2.4} height={5.2} rx={0.7} fill={W} />
          <rect x={12.4} y={19.4} width={5.2} height={2.4} rx={0.7} fill={W} />
          <path d="M3 8h7.5a4.5 4.5 0 0 1 4.5 4.5V21" fill="none" stroke={ink} strokeWidth={1.2} strokeDasharray="1.6 1.8" opacity={0.45} />
          <path d="M20.2 1.6 17 7h2.6l-1.3 4.3 3.9-5.8h-2.7z" fill={W} />
        </>
      );
    case "light-flip":
      return (
        <>
          <path d="M12 3.2a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v.5h5v-.5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3.2z" fill={W} />
          <rect x={9.5} y={17.7} width={5} height={1.8} rx={0.9} fill={W} opacity={0.85} />
          <rect x={10.2} y={20.2} width={3.6} height={1.6} rx={0.8} fill={W} opacity={0.7} />
          <path d="M10.2 6.6a3.6 3.6 0 0 0-2 3.1" fill="none" stroke={ink} strokeWidth={1.2} strokeLinecap="round" opacity={0.35} />
          <path d="M12 .6v1.2M3.6 3.8l.9.9M20.4 3.8l-.9.9M1.4 10.6h1.3M21.3 10.6h1.3" stroke={W} strokeWidth={1.6} strokeLinecap="round" />
        </>
      );
    case "slide-puzzle":
      return <path d="M4 7.2h4.1a2.3 2.3 0 1 1 4.6 0H17v4.1a2.3 2.3 0 1 1 0 4.6V20h-4.3a2.3 2.3 0 1 0-4.6 0H4z" fill={W} />;
    case "memory-match":
      return (
        <>
          <rect x={2.6} y={5.2} width={10} height={14} rx={2.2} fill={W} opacity={0.5} transform="rotate(-11 7.6 12.2)" />
          <g transform="rotate(8 15.4 11.8)">
            <rect x={9.8} y={4} width={11.2} height={15.6} rx={2.4} fill={W} />
            <path d={STAR} fill={ink} transform="translate(15.4 11.8) scale(0.34) translate(-12 -11.6)" />
          </g>
        </>
      );
    case "pattern-recall":
      return (
        <>
          <rect x={3} y={3} width={8} height={8} rx={2.3} fill={W} />
          <rect x={13} y={3} width={8} height={8} rx={2.3} fill={W} opacity={0.35} />
          <rect x={3} y={13} width={8} height={8} rx={2.3} fill={W} opacity={0.35} />
          <rect x={13} y={13} width={8} height={8} rx={2.3} fill={W} opacity={0.7} />
          <circle cx={7} cy={7} r={1.6} fill={ink} opacity={0.35} />
        </>
      );
  }
}

export function GameIcon({ game, size = 48 }: { game: GameMeta; size?: number }) {
  const ink = `color-mix(in oklab, ${game.accent2} 72%, black)`;
  return (
    <span
      className="tile3d relative inline-flex shrink-0 items-center justify-center overflow-hidden text-white"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: `radial-gradient(circle at 28% 18%, rgba(255,255,255,0.45), transparent 46%), linear-gradient(145deg, ${game.accent}, ${game.accent2})`,
        ["--edge" as string]: `color-mix(in oklab, ${game.accent2} 60%, black)`,
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} aria-hidden style={{ filter: "drop-shadow(0 1.5px 0 rgba(0,0,0,0.25))" }}>
        <Glyph id={game.id} ink={ink} />
      </svg>
    </span>
  );
}
