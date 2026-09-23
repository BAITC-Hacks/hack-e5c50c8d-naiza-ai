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
const maxRuns = 200;

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
  const next = [...runs, run].slice(-maxRuns);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2), "utf8");
  return next;
}
