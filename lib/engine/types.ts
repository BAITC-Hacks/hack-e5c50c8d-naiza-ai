export const INDICATORS = ["T1", "T2", "E1", "E2", "S1", "S2", "B1", "B2", "C1", "C2"] as const;
export type Indicator = (typeof INDICATORS)[number];
export type Indicators = Record<Indicator, number>;

export type DirectionId = "transport" | "ecology" | "social" | "safety" | "service";

export type IndicatorDef = {
  id: Indicator;
  direction: DirectionId;
  title: string;
  high: string;
  low: string;
};

export type DirectionDef = { id: DirectionId; title: string };

export type DistrictDef = {
  id: string;
  name: string;
  population: number;
  profile: string;
  indicators: Indicators;
};

export type Persona = { districtId: string; name: string; detail: string };

export type MeasureDef = {
  id: string;
  direction: DirectionId;
  title: string;
  scope: "district" | "city";
  cost: number;
  lag: number;
  effects: Partial<Indicators>;
};

export type SynergyDef = {
  id: string;
  measures: [string, string];
  anchor: string;
  effects: Partial<Indicators>;
  text: string;
};

export type ConflictDef = {
  id: string;
  measures: [string, string];
  scope: "global" | "district";
  text: string;
};

export type City = {
  version: string;
  budget: number;
  horizon: number;
  score: { mean: number; floor: number; criticalPenalty: number; criticalBelow: number };
  weights: Indicators;
  indicators: IndicatorDef[];
  directions: DirectionDef[];
  districts: DistrictDef[];
  personas: Persona[];
  measures: MeasureDef[];
  synergies: SynergyDef[];
  conflicts: ConflictDef[];
};

export type Choice = { measureId: string; districtId: string | null };

export type Reason = { code: string; message: string };

export type Contribution = {
  measureId: string;
  districtId: string;
  indicator: Indicator;
  amount: number;
};

export type AppliedSynergy = {
  id: string;
  districtId: string;
  indicator: Indicator;
  amount: number;
  text: string;
};

export type CriticalCell = { districtId: string; indicator: Indicator; value: number };

export type DistrictSnapshot = {
  id: string;
  name: string;
  population: number;
  profile: string;
  before: Indicators;
  after: Indicators;
  beforeScore: number;
  afterScore: number;
  delta: number;
};

export type ChosenMeasure = {
  id: string;
  title: string;
  direction: DirectionId;
  scope: "district" | "city";
  cost: number;
  lag: number;
  factor: number;
  districtId: string | null;
  districtName: string | null;
};

export type ScenarioResult = {
  version: string;
  choices: Choice[];
  measures: ChosenMeasure[];
  cost: number;
  reserve: number;
  score: number;
  mean: number;
  floor: number;
  floorDistrictId: string;
  delta: number;
  baselineScore: number;
  baselineMean: number;
  baselineFloor: number;
  nCrit: number;
  criticals: CriticalCell[];
  districts: DistrictSnapshot[];
  synergies: AppliedSynergy[];
  contributions: Contribution[];
  biggestMovers: { districtId: string; delta: number }[];
  evidenceIds: string[];
};

export type Projection = {
  validation: { ok: true } | { ok: false; reasons: Reason[] };
  cost: number;
  reserve: number;
  scored: ScenarioResult | null;
  districts: DistrictSnapshot[];
};

export type Neighbor = {
  id: string;
  choices: Choice[];
  measureId: string;
  districtId: string | null;
  replaces: string;
  cost: number;
  score: number;
  delta: number;
  floor: number;
  floorDelta: number;
};

export type Recommendation = {
  improvements: Neighbor[];
  floorPick: Neighbor | null;
};
