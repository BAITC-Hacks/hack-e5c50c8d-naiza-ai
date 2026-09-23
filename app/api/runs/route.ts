import { NextResponse } from "next/server";
import { city, districtById } from "@/lib/engine/city";
import { InvalidPortfolioError, simulate } from "@/lib/engine/simulate";
import type { Choice } from "@/lib/engine/types";
import { addRun, readRuns } from "@/lib/store/runs";

export const runtime = "nodejs";

function parseChoices(value: unknown): Choice[] | null {
  if (!Array.isArray(value)) return null;
  const choices: Choice[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const measureId = (item as { measureId?: unknown }).measureId;
    const districtId = (item as { districtId?: unknown }).districtId;
    if (typeof measureId !== "string") return null;
    if (districtId !== null && districtId !== undefined && typeof districtId !== "string") return null;
    choices.push({ measureId, districtId: typeof districtId === "string" ? districtId : null });
  }
  return choices;
}

export async function GET() {
  return NextResponse.json({ runs: readRuns() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { teamName?: unknown; choices?: unknown } | null;
  const choices = parseChoices(body?.choices);
  if (!choices) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const result = simulate(choices);
    if (result.choices.length !== 5) return NextResponse.json({ error: "incomplete" }, { status: 400 });
    const runs = addRun({
      teamName: typeof body?.teamName === "string" && body.teamName.trim() ? body.teamName.trim().slice(0, 40) : "Команда",
      choices: result.measures.map((item) => ({
        measureId: item.id,
        districtId: item.districtId,
        title: item.districtName ? `${item.title} (${item.districtName})` : item.title,
      })),
      score: result.score,
      mean: result.mean,
      floor: result.floor,
      floorDistrictId: result.floorDistrictId,
      floorDistrictName: districtById(result.floorDistrictId)?.name ?? result.floorDistrictId,
      reserve: result.reserve,
      nCrit: result.nCrit,
      version: city.version,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ runs });
  } catch (error) {
    if (error instanceof InvalidPortfolioError) {
      return NextResponse.json({ error: error.reasons.some((item) => item.code === "over_budget") ? "over_budget" : "invalid", reasons: error.reasons }, { status: 400 });
    }
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
