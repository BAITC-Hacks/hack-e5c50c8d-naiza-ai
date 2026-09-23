import { city as defaultCity, districtById, measureById } from "./city";
import { round2 } from "./format";
import {
  INDICATORS,
  type Choice,
  type City,
  type Contribution,
  type CriticalCell,
  type DistrictSnapshot,
  type Indicator,
  type Indicators,
  type Projection,
  type Reason,
  type ScenarioResult,
} from "./types";

export class InvalidPortfolioError extends Error {
  readonly code = "InvalidPortfolio" as const;
  constructor(readonly reasons: Reason[]) {
    super(reasons.map((item) => item.message).join("; "));
    this.name = "InvalidPortfolioError";
  }
}

function blank(source: Indicators): Indicators {
  return { ...source };
}

function emptyIndicators(): Indicators {
  return { T1: 0, T2: 0, E1: 0, E2: 0, S1: 0, S2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
}

export function districtIndex(indicators: Indicators, source: City): number {
  return INDICATORS.reduce((sum, key) => sum + source.weights[key] * indicators[key], 0);
}

function clip(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function sameChoice(left: Choice, right: Choice) {
  return left.measureId === right.measureId && left.districtId === right.districtId;
}

export function validate(choices: Choice[], source: City = defaultCity, partial = false): Reason[] {
  const reasons: Reason[] = [];
  if (!partial && choices.length !== 5) {
    reasons.push({ code: "count", message: `Нужно ровно 5 решений, сейчас ${choices.length}` });
  }
  if (choices.length > 5) {
    reasons.push({ code: "too_many", message: "Решений больше пяти" });
  }

  const seen = new Set<string>();
  let cost = 0;
  const directionCount = new Map<string, number>();

  for (const choice of choices) {
    const measure = measureById(choice.measureId, source);
    if (!measure) {
      reasons.push({ code: "unknown_measure", message: `Неизвестная мера ${choice.measureId}` });
      continue;
    }
    if (seen.has(measure.id)) {
      reasons.push({ code: "duplicate", message: `${measure.title} уже выбрана` });
    }
    seen.add(measure.id);
    cost += measure.cost;
    directionCount.set(measure.direction, (directionCount.get(measure.direction) ?? 0) + 1);
    if (measure.scope === "district" && !choice.districtId) {
      reasons.push({ code: "missing_district", message: `${measure.title}: выберите район` });
    }
    if (measure.scope === "district" && choice.districtId && !districtById(choice.districtId, source)) {
      reasons.push({ code: "unknown_district", message: `Неизвестный район ${choice.districtId}` });
    }
    if (measure.scope === "city" && choice.districtId) {
      reasons.push({ code: "city_has_district", message: `${measure.title} действует на весь город` });
    }
  }

  if (cost > source.budget) {
    reasons.push({ code: "over_budget", message: `Бюджет ${source.budget}, набор стоит ${cost}` });
  }
  for (const [direction, count] of directionCount) {
    if (count > 2) {
      const title = source.directions.find((item) => item.id === direction)?.title ?? direction;
      reasons.push({ code: "direction_cap", message: `В направлении «${title}» больше двух мер` });
    }
  }

  for (const conflict of source.conflicts) {
    const [leftId, rightId] = conflict.measures;
    const left = choices.filter((item) => item.measureId === leftId);
    const right = choices.filter((item) => item.measureId === rightId);
    if (!left.length || !right.length) continue;
    if (conflict.scope === "global") {
      reasons.push({ code: "conflict", message: conflict.text });
      continue;
    }
    const shared = left.some((item) => right.some((other) => item.districtId && item.districtId === other.districtId));
    if (shared) reasons.push({ code: "conflict", message: conflict.text });
  }

  return reasons;
}

function apply(choices: Choice[], source: City, quarter?: number) {
  const factorOf = (lag: number) =>
    quarter === undefined ? (source.horizon - lag) / source.horizon : Math.max(0, quarter - lag) / source.horizon;
  const deltas = new Map(source.districts.map((district) => [district.id, emptyIndicators()]));
  const contributions: Contribution[] = [];

  for (const choice of choices) {
    const measure = measureById(choice.measureId, source);
    if (!measure) continue;
    const factor = factorOf(measure.lag);
    const targets = measure.scope === "city" ? source.districts.map((item) => item.id) : choice.districtId ? [choice.districtId] : [];
    for (const districtId of targets) {
      const bucket = deltas.get(districtId);
      if (!bucket) continue;
      for (const indicator of INDICATORS) {
        const raw = measure.effects[indicator];
        if (raw === undefined || raw === 0) continue;
        const amount = raw * factor;
        bucket[indicator] += amount;
        contributions.push({ measureId: measure.id, districtId, indicator, amount });
      }
    }
  }

  const synergies = [];
  for (const rule of source.synergies) {
    const selected = rule.measures.every((id) => choices.some((choice) => choice.measureId === id));
    if (!selected) continue;
    if (quarter !== undefined) {
      const readyAt = Math.max(...rule.measures.map((id) => measureById(id, source)?.lag ?? 0));
      if (quarter <= readyAt) continue;
    }
    const anchor = choices.find((choice) => choice.measureId === rule.anchor);
    if (!anchor?.districtId) continue;
    const bucket = deltas.get(anchor.districtId);
    if (!bucket) continue;
    for (const indicator of INDICATORS) {
      const amount = rule.effects[indicator];
      if (amount === undefined || amount === 0) continue;
      bucket[indicator] += amount;
      synergies.push({
        id: rule.id,
        districtId: anchor.districtId,
        indicator,
        amount,
        text: rule.text,
      });
    }
  }

  const criticals: CriticalCell[] = [];
  const districts: DistrictSnapshot[] = source.districts.map((district) => {
    const delta = deltas.get(district.id)!;
    const after = blank(district.indicators);
    for (const indicator of INDICATORS) {
      after[indicator] = clip(district.indicators[indicator] + delta[indicator]);
      if (after[indicator] < source.score.criticalBelow) {
        criticals.push({ districtId: district.id, indicator, value: round2(after[indicator]) });
      }
    }
    const beforeScore = districtIndex(district.indicators, source);
    const afterScore = districtIndex(after, source);
    return {
      id: district.id,
      name: district.name,
      population: district.population,
      profile: district.profile,
      before: blank(district.indicators),
      after,
      beforeScore,
      afterScore,
      delta: afterScore - beforeScore,
    };
  });

  return { districts, contributions, synergies, criticals };
}

function cityStats(districts: DistrictSnapshot[], source: City) {
  const mean = districts.reduce((sum, item) => sum + item.population * item.afterScore, 0);
  let floor = Infinity;
  let floorDistrictId = districts[0]?.id ?? "";
  for (const item of districts) {
    if (item.afterScore < floor) {
      floor = item.afterScore;
      floorDistrictId = item.id;
    }
  }
  return { mean, floor, floorDistrictId };
}

let baselineCache: ScenarioResult | null = null;

export function baseline(source: City = defaultCity): ScenarioResult {
  if (source === defaultCity && baselineCache) return baselineCache;
  const applied = apply([], source);
  const stats = cityStats(applied.districts, source);
  const score = source.score.mean * stats.mean + source.score.floor * stats.floor - source.score.criticalPenalty * applied.criticals.length;
  const result: ScenarioResult = {
    version: source.version,
    choices: [],
    measures: [],
    cost: 0,
    reserve: source.budget,
    score: round2(score),
    mean: round2(stats.mean),
    floor: round2(stats.floor),
    floorDistrictId: stats.floorDistrictId,
    delta: 0,
    baselineScore: round2(score),
    baselineMean: round2(stats.mean),
    baselineFloor: round2(stats.floor),
    nCrit: applied.criticals.length,
    criticals: applied.criticals,
    districts: applied.districts,
    synergies: [],
    contributions: [],
    biggestMovers: [],
    evidenceIds: ["score.score", "score.mean", "score.floor", "score.nCrit"],
  };
  if (source === defaultCity) baselineCache = result;
  return result;
}

function chosenMeasures(choices: Choice[], source: City) {
  return choices.map((choice) => {
    const measure = measureById(choice.measureId, source)!;
    const district = choice.districtId ? districtById(choice.districtId, source) : undefined;
    return {
      id: measure.id,
      title: measure.title,
      direction: measure.direction,
      scope: measure.scope,
      cost: measure.cost,
      lag: measure.lag,
      factor: (source.horizon - measure.lag) / source.horizon,
      districtId: choice.districtId,
      districtName: district?.name ?? null,
    };
  });
}

export function simulate(choices: Choice[], source: City = defaultCity): ScenarioResult {
  if (choices.length === 0) return baseline(source);
  const reasons = validate(choices, source, false);
  if (reasons.length) throw new InvalidPortfolioError(reasons);

  const morning = baseline(source);
  const applied = apply(choices, source);
  const stats = cityStats(applied.districts, source);
  const rawScore = source.score.mean * stats.mean + source.score.floor * stats.floor - source.score.criticalPenalty * applied.criticals.length;
  const cost = choices.reduce((sum, choice) => sum + (measureById(choice.measureId, source)?.cost ?? 0), 0);
  const movers = [...applied.districts]
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3)
    .map((item) => ({ districtId: item.id, delta: round2(item.delta) }));

  const evidenceIds = [
    "score.score",
    "score.mean",
    "score.floor",
    "score.delta",
    "score.nCrit",
    "reserve",
    "cost",
    ...applied.districts.flatMap((item) => [`district.${item.id}.delta`, `district.${item.id}.score`]),
    ...applied.criticals.map((item) => `critical.${item.districtId}.${item.indicator}`),
    ...applied.synergies.map((item) => `synergy.${item.id}`),
    ...choices.map((item) => `choice.${item.measureId}`),
  ];

  return {
    version: source.version,
    choices,
    measures: chosenMeasures(choices, source),
    cost,
    reserve: source.budget - cost,
    score: round2(rawScore),
    mean: round2(stats.mean),
    floor: round2(stats.floor),
    floorDistrictId: stats.floorDistrictId,
    delta: round2(rawScore - morning.score),
    baselineScore: morning.score,
    baselineMean: morning.mean,
    baselineFloor: morning.floor,
    nCrit: applied.criticals.length,
    criticals: applied.criticals,
    districts: applied.districts,
    synergies: applied.synergies,
    contributions: applied.contributions,
    biggestMovers: movers,
    evidenceIds,
  };
}

export function outlook(choices: Choice[], source: City = defaultCity): number | null {
  const reasons = validate(choices, source, true).filter((item) => item.code !== "count");
  if (reasons.length) return null;
  const applied = apply(choices, source);
  const stats = cityStats(applied.districts, source);
  const raw = source.score.mean * stats.mean + source.score.floor * stats.floor - source.score.criticalPenalty * applied.criticals.length;
  return round2(raw);
}

export type YearFrame = {
  quarter: number;
  score: number;
  mean: number;
  floor: number;
  floorDistrictId: string;
  nCrit: number;
  districts: DistrictSnapshot[];
  started: string[];
};

export function yearFrames(choices: Choice[], source: City = defaultCity): YearFrame[] {
  const morning = baseline(source);
  return Array.from({ length: source.horizon + 1 }, (_, quarter) => {
    const applied = apply(choices, source, quarter);
    const stats = cityStats(applied.districts, source);
    const raw = source.score.mean * stats.mean + source.score.floor * stats.floor - source.score.criticalPenalty * applied.criticals.length;
    const started = choices
      .map((choice) => measureById(choice.measureId, source))
      .filter((measure): measure is NonNullable<typeof measure> => Boolean(measure))
      .filter((measure) => quarter === measure.lag + 1)
      .map((measure) => measure.title);
    return {
      quarter,
      score: round2(raw),
      mean: round2(stats.mean),
      floor: round2(stats.floor),
      floorDistrictId: stats.floorDistrictId,
      nCrit: applied.criticals.length,
      districts: applied.districts,
      started,
    };
  }).map((frame, _, all) => (frame.quarter === 0 ? { ...frame, score: morning.score, mean: morning.mean, floor: morning.floor } : frame));
}

export function project(choices: Choice[], source: City = defaultCity): Projection {
  const reasons = validate(choices, source, choices.length !== 5);
  const cost = choices.reduce((sum, choice) => sum + (measureById(choice.measureId, source)?.cost ?? 0), 0);
  const structurallyOk = reasons.every((item) => item.code === "count");
  const applied = structurallyOk ? apply(choices, source).districts : baseline(source).districts;
  let scored: ScenarioResult | null = null;
  if (reasons.length === 0 && choices.length === 5) scored = simulate(choices, source);
  return {
    validation: reasons.length ? { ok: false, reasons } : { ok: true },
    cost,
    reserve: source.budget - cost,
    scored,
    districts: scored?.districts ?? applied,
  };
}

export function canAdd(choices: Choice[], next: Choice, source: City = defaultCity): { ok: true } | { ok: false; message: string } {
  if (choices.some((item) => sameChoice(item, next) || item.measureId === next.measureId)) {
    return { ok: false, message: "Эта мера уже в наборе" };
  }
  const reasons = validate([...choices, next], source, true).filter((item) => item.code !== "count");
  if (reasons.length) return { ok: false, message: reasons[0].message };
  return { ok: true };
}
