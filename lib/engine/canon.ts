import type { Choice } from "./types";

export const EXAMPLE: Choice[] = [
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12", districtId: null },
  { measureId: "M5", districtId: "saryarka" },
];

export const CHEAP: Choice[] = [
  { measureId: "M9", districtId: "nura" },
  { measureId: "M11", districtId: "almaty" },
  { measureId: "M10", districtId: "baikonur" },
  { measureId: "M12", districtId: null },
  { measureId: "M4", districtId: "esil" },
];

export const OVER_BUDGET: Choice[] = [
  { measureId: "M3", districtId: "esil" },
  { measureId: "M13", districtId: "esil" },
  { measureId: "M5", districtId: "saryarka" },
  { measureId: "M7", districtId: "nura" },
  { measureId: "M2", districtId: null },
];
