import { describe, expect, it } from "vitest";
import { CHEAP, EXAMPLE, OVER_BUDGET } from "./canon";
import { assertCity } from "./city";
import { recommend } from "./recommend";
import { coach } from "./coach";
import { cityInsight } from "./insights";
import { canAdd, InvalidPortfolioError, project, simulate, validate, yearFrames } from "./simulate";
import { rivalPlan } from "./coach";
import type { Choice } from "./types";

describe("методика города", () => {
  it("держит каталог", () => {
    expect(() => assertCity()).not.toThrow();
  });

  it("без действий даёт базовый Score 52.56 и два провала в Нуре", () => {
    const base = simulate([]);
    expect(base.score).toBeCloseTo(52.56, 2);
    expect(base.mean).toBeCloseTo(56.86, 2);
    expect(base.floor).toBeCloseTo(49.18, 2);
    expect(base.floorDistrictId).toBe("nura");
    expect(base.nCrit).toBe(2);
    expect(base.criticals.map((item) => item.indicator).sort()).toEqual(["S1", "S2"]);
  });

  it("пример из методики стоит 95, Score около 56.5, синергия M10+M12 есть", () => {
    const result = simulate(EXAMPLE);
    expect(result.cost).toBe(95);
    expect(result.reserve).toBe(5);
    expect(result.score).toBeGreaterThan(56.4);
    expect(result.score).toBeLessThan(56.6);
    expect(result.delta).toBeCloseTo(4, 0);
    expect(result.nCrit).toBe(0);
    expect(result.synergies.some((item) => item.id === "M10+M12" && item.districtId === "nura")).toBe(true);
    expect(validate(EXAMPLE)).toEqual([]);
  });

  it("восьмой квартал совпадает с итоговым Score, а ЛРТ молчит до конца лага", () => {
    const frames = yearFrames(EXAMPLE);
    expect(frames).toHaveLength(9);
    expect(frames[0].score).toBeCloseTo(simulate([]).score, 2);
    expect(frames[8].score).toBeCloseTo(simulate(EXAMPLE).score, 2);
    const late = yearFrames([{ measureId: "M3", districtId: "esil" }, { measureId: "M9", districtId: "nura" }, { measureId: "M10", districtId: "almaty" }, { measureId: "M12", districtId: null }, { measureId: "M4", districtId: "saryarka" }]);
    expect(late[4].started.join(" ")).not.toContain("ЛРТ");
    expect(late[5].started.join(" ")).toContain("ЛРТ");
  });

  it("аким-автомат собирает допустимую пятёрку сильнее базы", () => {
    const rival = rivalPlan();
    expect(validate(rival.choices)).toEqual([]);
    expect(rival.score).toBeGreaterThan(simulate([]).score);
  });

  it("порядок решений не меняет Score", () => {
    const shuffled: Choice[] = [...EXAMPLE].reverse();
    expect(simulate(shuffled).score).toBe(simulate(EXAMPLE).score);
  });

  it("дешёвый набор на 61 валиден и отличается от базы", () => {
    const cheap = simulate(CHEAP);
    expect(cheap.cost).toBe(61);
    expect(cheap.score).not.toBe(simulate([]).score);
  });

  it("дороже 100 не считается", () => {
    expect(validate(OVER_BUDGET).some((item) => item.code === "over_budget")).toBe(true);
    expect(() => simulate(OVER_BUDGET)).toThrow(InvalidPortfolioError);
  });

  it("запрещает повтор, третью меру направления и пары-конфликты", () => {
    const duplicate: Choice[] = [
      { measureId: "M9", districtId: "nura" },
      { measureId: "M9", districtId: "esil" },
      { measureId: "M12", districtId: null },
      { measureId: "M4", districtId: "almaty" },
      { measureId: "M10", districtId: "baikonur" },
    ];
    expect(validate(duplicate).some((item) => item.code === "duplicate")).toBe(true);

    const triple: Choice[] = [
      { measureId: "M7", districtId: "nura" },
      { measureId: "M8", districtId: "nura" },
      { measureId: "M9", districtId: "esil" },
      { measureId: "M12", districtId: null },
      { measureId: "M10", districtId: "baikonur" },
    ];
    expect(validate(triple).some((item) => item.code === "direction_cap")).toBe(true);

    const lrt: Choice[] = [
      { measureId: "M1", districtId: "esil" },
      { measureId: "M3", districtId: "nura" },
      { measureId: "M4", districtId: "almaty" },
      { measureId: "M8", districtId: "saryarka" },
      { measureId: "M12", districtId: null },
    ];
    expect(validate(lrt).some((item) => item.code === "conflict")).toBe(true);

    const samePlot: Choice[] = [
      { measureId: "M4", districtId: "nura" },
      { measureId: "M7", districtId: "nura" },
      { measureId: "M10", districtId: "esil" },
      { measureId: "M12", districtId: null },
      { measureId: "M2", districtId: null },
    ];
    expect(validate(samePlot).some((item) => item.code === "conflict")).toBe(true);

    const splitPlot: Choice[] = [
      { measureId: "M4", districtId: "esil" },
      { measureId: "M7", districtId: "nura" },
      { measureId: "M10", districtId: "almaty" },
      { measureId: "M12", districtId: null },
      { measureId: "M9", districtId: "saryarka" },
    ];
    expect(validate(splitPlot).some((item) => item.code === "conflict")).toBe(false);

    const pipes: Choice[] = [
      { measureId: "M5", districtId: "saryarka" },
      { measureId: "M13", districtId: "saryarka" },
      { measureId: "M9", districtId: "nura" },
      { measureId: "M10", districtId: "esil" },
      { measureId: "M12", districtId: null },
    ];
    expect(validate(pipes).some((item) => item.code === "conflict")).toBe(true);
  });

  it("районная мера без района не считается", () => {
    const broken: Choice[] = [
      { measureId: "M7", districtId: null },
      { measureId: "M8", districtId: "nura" },
      { measureId: "M10", districtId: "nura" },
      { measureId: "M12", districtId: null },
      { measureId: "M4", districtId: "esil" },
    ];
    expect(validate(broken).some((item) => item.code === "missing_district")).toBe(true);
    expect(() => simulate(broken)).toThrow(InvalidPortfolioError);
  });

  it("панель города на пустом наборе показывает два провала Нуры и незакрытые правила", () => {
    const view = project([]);
    const pulse = cityInsight([], view.districts, 0);
    expect(pulse.criticals).toHaveLength(2);
    expect(pulse.criticals.every((item) => item.name === "Нура")).toBe(true);
    expect(pulse.rules.find((item) => item.label.startsWith("Пять мер"))?.ok).toBe(false);
    expect(pulse.rules.find((item) => item.label.startsWith("Бюджет"))?.ok).toBe(true);
  });

  it("совет предлагает следующий ход, из которого собирается допустимая пятёрка", () => {
    const hints = coach([]);
    expect(hints).toHaveLength(3);
    for (const hint of hints) {
      expect(hint.finalScore).toBeGreaterThan(simulate([]).score);
      expect(canAdd([], hint.choice).ok).toBe(true);
    }
    const partial = EXAMPLE.slice(0, 3);
    const next = coach(partial);
    expect(next.length).toBeGreaterThan(0);
    expect(next[0].finalScore).toBeGreaterThanOrEqual(next[next.length - 1].finalScore);
  });

  it("тень не предлагает набор вне правил", () => {
    const advice = recommend(EXAMPLE);
    for (const item of advice.improvements) {
      expect(validate(item.choices)).toEqual([]);
      expect(simulate(item.choices).cost).toBeLessThanOrEqual(100);
      expect(item.score).toBeGreaterThan(simulate(EXAMPLE).score);
    }
  });
});
