import { city as defaultCity, districtById, measureById } from "./city";
import { baseline, canAdd, outlook, simulate, validate } from "./simulate";
import type { Choice, City } from "./types";

export type CoachMove = {
  choice: Choice;
  title: string;
  place: string;
  cost: number;
  finalScore: number;
  delta: number;
};

function legalAdds(choices: Choice[], source: City): Choice[] {
  if (choices.length >= 5) return [];
  const moves: Choice[] = [];
  for (const measure of source.measures) {
    if (choices.some((item) => item.measureId === measure.id)) continue;
    const options = measure.scope === "city"
      ? [{ measureId: measure.id, districtId: null }]
      : source.districts.map((district) => ({ measureId: measure.id, districtId: district.id }));
    for (const choice of options) {
      if (canAdd(choices, choice, source).ok) moves.push(choice);
    }
  }
  return moves;
}

function greedyFill(start: Choice[], source: City): Choice[] {
  const state = [...start];
  while (state.length < 5) {
    const options = legalAdds(state, source);
    if (!options.length) break;
    let best = options[0];
    let bestScore = -Infinity;
    for (const option of options) {
      const next = [...state, option];
      const score = next.length === 5 ? safeScore(next, source) : outlook(next, source);
      if (score !== null && score > bestScore) {
        best = option;
        bestScore = score;
      }
    }
    state.push(best);
  }
  return state;
}

function safeScore(choices: Choice[], source: City): number | null {
  try {
    return simulate(choices, source).score;
  } catch {
    return null;
  }
}

export function rivalPlan(source: City = defaultCity): { choices: Choice[]; score: number; titles: string[] } {
  const filled = greedyFill([], source);
  const result = simulate(filled, source);
  return {
    choices: result.choices,
    score: result.score,
    titles: result.measures.map((item) => (item.districtName ? `${item.title} · ${item.districtName}` : item.title)),
  };
}

export function coach(choices: Choice[], source: City = defaultCity): CoachMove[] {
  const blocked = validate(choices, source, true).filter((item) => item.code !== "count");
  if (blocked.length || choices.length >= 5) return [];
  const base = baseline(source).score;
  const ranked: CoachMove[] = [];
  for (const choice of legalAdds(choices, source)) {
    const filled = greedyFill([...choices, choice], source);
    const finalScore = safeScore(filled, source);
    const measure = measureById(choice.measureId, source);
    if (finalScore === null || !measure) continue;
    ranked.push({
      choice,
      title: measure.title,
      place: choice.districtId ? districtById(choice.districtId, source)?.name ?? choice.districtId : "весь город",
      cost: measure.cost,
      finalScore,
      delta: Math.round((finalScore - base) * 100) / 100,
    });
  }
  ranked.sort((a, b) => b.finalScore - a.finalScore || a.cost - b.cost);
  const seen = new Set<string>();
  return ranked.filter((item) => {
    const key = `${item.choice.measureId}:${item.choice.districtId ?? "city"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
}
