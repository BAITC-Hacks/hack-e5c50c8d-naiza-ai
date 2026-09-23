import { describe, expect, it } from "vitest";
import { EXAMPLE } from "../engine/canon";
import { formatScore } from "../engine/format";
import { simulate } from "../engine/simulate";
import { foreignFigures, unknownEvidence } from "./evidence";
import { buildFallback } from "./fallback";

describe("доклад", () => {
  it("пример методики называет Нуру, Score и синергию камер с платформой", () => {
    const result = simulate(EXAMPLE);
    const text = JSON.stringify(buildFallback(result));
    expect(text).toContain("Нура");
    expect(text).toContain(formatScore(result.score));
    expect(text.toLowerCase()).toContain("камер");
  });

  it("принимает известный evidenceId и бракует выдуманный", () => {
    expect(unknownEvidence(["score.score"], ["score.score"])).toEqual([]);
    expect(unknownEvidence(["score.madeup"], ["score.score"])).toEqual(["score.madeup"]);
  });

  it("ловит число, которого нет в журнале", () => {
    const haystack = JSON.stringify({ score: 56.54, reserve: 5 });
    expect(foreignFigures("Score 56,54 при резерве 5", haystack)).toEqual([]);
    expect(foreignFigures("Score вырос до 88,88", haystack)).toEqual(["88,88"]);
  });
});
