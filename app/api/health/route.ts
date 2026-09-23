import { NextResponse } from "next/server";
import { city } from "@/lib/engine/city";
import { simulate } from "@/lib/engine/simulate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const baseline = simulate([]);
  return NextResponse.json(
    {
      ok: true,
      service: "akim-na-5-chasov",
      version: city.version,
      baselineScore: baseline.score,
      checkedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
