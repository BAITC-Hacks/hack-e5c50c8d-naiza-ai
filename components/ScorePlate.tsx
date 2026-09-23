import { formatScore, formatSigned } from "@/lib/engine/format";
import type { ScenarioResult } from "@/lib/engine/types";

export function ScorePlate({ result, kicker }: { result: ScenarioResult; kicker?: string }) {
  const floor = result.districts.find((item) => item.id === result.floorDistrictId);
  return (
    <div>
      {kicker ? <p className="text-sm font-semibold text-gold">{kicker}</p> : null}
      <p className="mt-1 font-serif text-6xl font-semibold leading-none tracking-tight md:text-7xl">{formatScore(result.score)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="chip">{formatSigned(result.delta)} к базе</span>
        <span className="chip">Средний {formatScore(result.mean)}</span>
        <span className="chip">{floor?.name} {formatScore(result.floor)}</span>
        <span className="chip">Ниже 40: {result.nCrit}</span>
      </div>
    </div>
  );
}
