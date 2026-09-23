import { formatScore, formatSigned } from "@/lib/engine/format";
import type { ScenarioResult } from "@/lib/engine/types";

export function ScorePlate({ result, kicker }: { result: ScenarioResult; kicker?: string }) {
  const floor = result.districts.find((item) => item.id === result.floorDistrictId);
  return (
    <div>
      {kicker ? <p className="text-[11px] uppercase tracking-[0.18em] text-gold">{kicker}</p> : null}
      <p className="font-serif text-6xl font-semibold leading-none text-ink md:text-7xl">{formatScore(result.score)}</p>
      <p className="mt-2 text-sm text-ink-soft">
        {formatSigned(result.delta)} к базе {formatScore(result.baselineScore)}
        <span className="mx-2 text-line">/</span>
        средний {formatScore(result.mean)}
        <span className="mx-2 text-line">/</span>
        пол {floor?.name} {formatScore(result.floor)}
        <span className="mx-2 text-line">/</span>
        провалов {result.nCrit}
      </p>
    </div>
  );
}
