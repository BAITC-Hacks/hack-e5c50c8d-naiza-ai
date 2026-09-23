import { journalLines, residentQuotes } from "../engine/present";
import { directionTitle } from "../engine/city";
import { formatScore, formatSigned } from "../engine/format";
import type { ScenarioResult } from "../engine/types";
import type { Briefing } from "./briefing";

export function buildFallback(result: ScenarioResult): Briefing {
  const floor = result.districts.find((item) => item.id === result.floorDistrictId) ?? result.districts[0];
  const mover = result.districts.find((item) => item.id === result.biggestMovers[0]?.districtId) ?? floor;
  const picked = result.measures
    .map((item) => `${item.title}${item.districtName ? ` · ${item.districtName}` : " · город"}`)
    .join("; ");
  const strengths = [
    `${mover.name} сдвигается сильнее других: ${formatSigned(mover.delta)} к индексу района.`,
    `Score ${formatScore(result.score)} (${formatSigned(result.delta)} к базе ${formatScore(result.baselineScore)}). Средний ${formatScore(result.mean)}, пол — ${floor.name} ${formatScore(result.floor)}.`,
    result.synergies.length
      ? result.synergies.map((item) => item.text).join(" ")
      : `Набор на ${result.cost} из 100. Синергий в этой пятёрке нет.`,
  ];
  const risks = [
    result.nCrit
      ? `Штраф ${result.nCrit}: ниже 40 остаются ${result.criticals.map((item) => item.indicator).join(", ")}.`
      : "Критический штраф сейчас 0: значений ниже 40 нет.",
    result.reserve > 0
      ? `Резерв ${result.reserve}. Он не сгорает и к Score ничего не добавляет.`
      : "Бюджет выбран полностью. Запаса на ещё одну меру нет.",
    `За два года успевает не весь эффект: лаг режет долю (8 − L) / 8. Направлений в наборе ${new Set(result.measures.map((item) => directionTitle(item.direction))).size}.`,
  ];
  const consequences = `Через 8 кварталов Score выходит на ${formatScore(result.score)}. Пол держит ${floor.name}. ${picked}. ${journalLines(result).map((item) => item.text).join(" ")}`;
  return {
    source: "fallback",
    strengths,
    risks,
    consequences,
    quotes: residentQuotes(result).map((item) => ({ districtId: item.districtId, persona: item.persona, line: item.line })),
    shadowNotes: [],
    trace: [],
  };
}
