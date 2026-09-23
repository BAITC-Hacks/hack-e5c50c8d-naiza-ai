import { city as defaultCity, indicatorTitle, measureById } from "./city";
import { validate } from "./simulate";
import { INDICATORS, type Choice, type City, type DistrictSnapshot, type Indicator, type MeasureDef } from "./types";

export type CityInsight = {
  criticals: { name: string; title: string; value: number }[];
  synergies: { id: string; text: string; state: "on" | "wait"; missing: string | null }[];
  rules: { ok: boolean; label: string }[];
};

export function cityInsight(choices: Choice[], districts: DistrictSnapshot[], cost: number, source: City = defaultCity): CityInsight {
  const reasons = validate(choices, source, true);
  const codes = new Set(reasons.map((item) => item.code));
  const criticals = districts.flatMap((district) =>
    INDICATORS.filter((key) => district.after[key] < source.score.criticalBelow).map((key) => ({
      name: district.name,
      title: indicatorTitle(key, source),
      value: district.after[key],
    })),
  );
  const selected = new Set(choices.map((item) => item.measureId));
  const synergies = source.synergies
    .map((rule) => {
      const [left, right] = rule.measures;
      const hasLeft = selected.has(left);
      const hasRight = selected.has(right);
      if (!hasLeft && !hasRight) return null;
      const missingId = hasLeft && !hasRight ? right : !hasLeft && hasRight ? left : null;
      return {
        id: rule.id,
        text: rule.text,
        state: missingId ? "wait" as const : "on" as const,
        missing: missingId ? measureById(missingId, source)?.title ?? missingId : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    criticals,
    synergies,
    rules: [
      { ok: choices.length === 5, label: `Пять мер: ${choices.length} из 5` },
      { ok: !codes.has("over_budget") && cost <= source.budget, label: `Бюджет: ${cost} из ${source.budget}` },
      { ok: !codes.has("direction_cap"), label: "Не больше двух мер в одном направлении" },
      { ok: !codes.has("conflict"), label: "Нет запрещённых пар" },
      { ok: !codes.has("duplicate") && !codes.has("missing_district"), label: "У районных мер выбран район" },
    ],
  };
}

export function helpsWeakDistrict(measure: MeasureDef, district: DistrictSnapshot | undefined, below = 45): boolean {
  if (!district) return true;
  const weak = new Set(INDICATORS.filter((key) => district.after[key] < below));
  return Object.keys(measure.effects).some((key) => weak.has(key as Indicator));
}
