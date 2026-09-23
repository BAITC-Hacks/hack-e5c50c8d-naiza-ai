import { city as defaultCity, measureById } from "./city";
import { round2 } from "./format";
import { simulate, validate } from "./simulate";
import type { Choice, City, Neighbor, Recommendation } from "./types";

export function recommend(choices: Choice[], source: City = defaultCity): Recommendation {
  if (validate(choices, source, false).length) return { improvements: [], floorPick: null };
  const current = simulate(choices, source);
  const selected = new Set(choices.map((item) => item.measureId));
  const neighbors: Neighbor[] = [];

  for (const choice of choices) {
    for (const measure of source.measures) {
      if (measure.id === choice.measureId) {
        if (measure.scope !== "district") continue;
        for (const district of source.districts) {
          if (district.id === choice.districtId) continue;
          push(neighbors, choices, choice, { measureId: measure.id, districtId: district.id }, current.score, current.floor, source);
        }
        continue;
      }
      if (selected.has(measure.id)) continue;
      if (measure.scope === "city") {
        push(neighbors, choices, choice, { measureId: measure.id, districtId: null }, current.score, current.floor, source);
      } else {
        for (const district of source.districts) {
          push(neighbors, choices, choice, { measureId: measure.id, districtId: district.id }, current.score, current.floor, source);
        }
      }
    }
  }

  const improvements = neighbors
    .filter((item) => item.score > current.score + 0.005)
    .sort((a, b) => b.score - a.score || b.floor - a.floor)
    .slice(0, 3);
  const bestFloor = [...neighbors].sort((a, b) => b.floor - a.floor || b.score - a.score)[0];
  const floorPick =
    bestFloor && bestFloor.floor > current.floor + 0.005 && !improvements.some((item) => item.id === bestFloor.id)
      ? bestFloor
      : null;
  return { improvements, floorPick };
}

function push(
  bucket: Neighbor[],
  choices: Choice[],
  previous: Choice,
  next: Choice,
  currentScore: number,
  currentFloor: number,
  source: City,
) {
  const replaced = choices.map((item) => (item.measureId === previous.measureId ? next : item));
  if (validate(replaced, source, false).length) return;
  const outcome = simulate(replaced, source);
  const measure = measureById(next.measureId, source);
  bucket.push({
    id: `swap:${previous.measureId}:${next.measureId}:${next.districtId ?? "city"}`,
    choices: outcome.choices,
    measureId: next.measureId,
    districtId: next.districtId,
    replaces: `${previous.measureId}→${measure?.title ?? next.measureId}`,
    cost: outcome.cost,
    score: outcome.score,
    delta: round2(outcome.score - currentScore),
    floor: outcome.floor,
    floorDelta: round2(outcome.floor - currentFloor),
  });
}
