import fs from "fs";
import path from "path";
import type { Choice } from "../engine/types";

export type SavedRun = {
  teamName: string;
  choices: (Choice & { title: string })[];
  score: number;
  mean: number;
  floor: number;
  floorDistrictId: string;
  floorDistrictName: string;
  reserve: number;
  nCrit: number;
  version: string;
  createdAt: string;
};

const file = path.join(process.cwd(), "data", "runs.json");

export function readRuns(): SavedRun[] {
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as SavedRun[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRun(run: SavedRun): SavedRun[] {
  const runs = readRuns();
  runs.push(run);
  fs.writeFileSync(file, JSON.stringify(runs, null, 2));
  return runs;
}
