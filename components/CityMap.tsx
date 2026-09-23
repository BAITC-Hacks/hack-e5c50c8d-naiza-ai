import type { DistrictSnapshot } from "@/lib/engine/types";

const SPOTS = [
  { id: "esil", cx: 150, cy: 110, rx: 100, ry: 64 },
  { id: "almaty", cx: 430, cy: 120, rx: 108, ry: 66 },
  { id: "saryarka", cx: 168, cy: 280, rx: 102, ry: 62 },
  { id: "baikonur", cx: 430, cy: 286, rx: 96, ry: 60 },
  { id: "nura", cx: 300, cy: 400, rx: 120, ry: 48 },
];

function mix(from: string, to: string, t: number) {
  const parse = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const [a, b] = [parse(from), parse(to)];
  const value = a.map((channel, index) => Math.round(channel + (b[index] - channel) * t));
  return `rgb(${value[0]}, ${value[1]}, ${value[2]})`;
}

export function scoreColor(score: number) {
  const t = Math.min(1, Math.max(0, (score - 45) / 25));
  if (t < 0.5) return mix("#8C2F2F", "#A9782C", t * 2);
  return mix("#A9782C", "#1E6B52", (t - 0.5) * 2);
}

export function CityMap({
  districts,
  highlight = [],
  activeId,
  onDistrictClick,
}: {
  districts: DistrictSnapshot[];
  highlight?: string[];
  activeId?: string | null;
  onDistrictClick?: (id: string) => void;
}) {
  const byId = new Map(districts.map((item) => [item.id, item]));
  return (
    <figure>
      <svg viewBox="0 0 620 470" role="img" aria-label="Схема пяти условных районов" className="h-auto w-full">
        <rect x="0" y="0" width="620" height="470" rx="28" fill="#f7f3ec" />
        <path d="M300 24 C340 120, 280 200, 250 280 C230 340, 270 400, 320 452" fill="none" stroke="#8eb4c9" strokeWidth="22" strokeLinecap="round" opacity="0.55" />
        {SPOTS.map((spot) => {
          const district = byId.get(spot.id);
          const score = district?.afterScore ?? 0;
          const active = highlight.includes(spot.id) || activeId === spot.id;
          return (
            <g key={spot.id} onClick={() => onDistrictClick?.(spot.id)} className={onDistrictClick ? "cursor-pointer" : undefined}>
              <ellipse
                cx={spot.cx}
                cy={spot.cy}
                rx={spot.rx}
                ry={spot.ry}
                fill={scoreColor(score)}
                opacity={highlight.length === 0 || active ? 0.92 : 0.4}
                stroke="rgba(255,255,255,0.85)"
                strokeWidth={active ? 5 : 2}
              />
              <text x={spot.cx} y={spot.cy - 6} textAnchor="middle" fill="#FBF7F0" fontSize="16" fontFamily="Fraunces, serif">
                {district?.name ?? spot.id}
              </text>
              <text x={spot.cx} y={spot.cy + 16} textAnchor="middle" fill="#FBF7F0" fontSize="13" fontFamily="Source Sans 3, sans-serif">
                {(district?.afterScore ?? 0).toFixed(2).replace(".", ",")}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 text-sm text-ink-soft">Чем зеленее район, тем выше его индекс. Это схема, не карта города.</figcaption>
    </figure>
  );
}
