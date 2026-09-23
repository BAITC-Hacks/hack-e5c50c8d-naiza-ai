import { NextResponse } from "next/server";
import { runCouncil } from "@/lib/ai/council";
import type { Briefing } from "@/lib/ai/briefing";
import { InvalidPortfolioError, simulate } from "@/lib/engine/simulate";
import type { Choice } from "@/lib/engine/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cache = new Map<string, { briefing: Briefing }>();

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
  const body = (await request.json().catch(() => null)) as { teamName?: unknown; choices?: unknown } | null;
  const choices = parseChoices(body?.choices);
  const teamName = typeof body?.teamName === "string" ? body.teamName.slice(0, 40) : "";
  if (!choices) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const result = simulate(choices);
    if (result.choices.length !== 5) return NextResponse.json({ error: "incomplete" }, { status: 400 });
    const key = `${result.version}:${result.measures.map((item) => `${item.id}:${item.districtId ?? "city"}`).sort().join("|")}`;
    const cached = cache.get(key);
    if (cached) return NextResponse.json(cached, { headers: { "Cache-Control": "no-store" } });
    const briefing = await runCouncil(result, teamName);
    const payload = { briefing };
    if (briefing.source === "council") cache.set(key, payload);
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof InvalidPortfolioError) {
      const over = error.reasons.some((item) => item.code === "over_budget");
      return NextResponse.json({ error: over ? "over_budget" : "invalid", reasons: error.reasons }, { status: 400 });
    }
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
