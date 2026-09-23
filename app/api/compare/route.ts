import { NextResponse } from "next/server";
import { compareBrief } from "@/lib/ai/compare";
import { InvalidPortfolioError, simulate } from "@/lib/engine/simulate";
import type { Choice } from "@/lib/engine/types";

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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    left?: unknown;
    right?: unknown;
    leftName?: unknown;
    rightName?: unknown;
  } | null;
  const leftChoices = parseChoices(body?.left);
  const rightChoices = parseChoices(body?.right);
  if (!leftChoices || !rightChoices) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const left = simulate(leftChoices);
    const right = simulate(rightChoices);
    const brief = await compareBrief(
      left,
      right,
      typeof body?.leftName === "string" && body.leftName.trim() ? body.leftName.trim() : "Набор А",
      typeof body?.rightName === "string" && body.rightName.trim() ? body.rightName.trim() : "Набор Б",
    );
    return NextResponse.json(brief);
  } catch (error) {
    if (error instanceof InvalidPortfolioError) {
      return NextResponse.json({ error: "invalid", reasons: error.reasons }, { status: 400 });
    }
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
