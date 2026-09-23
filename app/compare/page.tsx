"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { city } from "@/lib/engine/city";
import { formatScore } from "@/lib/engine/format";
import type { SavedRun } from "@/lib/store/runs";

export default function ComparePage() {
  const [runs, setRuns] = useState<SavedRun[] | null>(null);

  useEffect(() => {
    void fetch("/api/runs")
      .then((response) => response.json())
      .then((payload: { runs: SavedRun[] }) => setRuns(payload.runs ?? []))
      .catch(() => setRuns([]));
  }, []);

  const current = (runs ?? []).filter((run) => run.version === city.version && typeof run.score === "number");
  const max = Math.max(60, ...current.map((run) => run.score));

  return (
    <main>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Один бюджет, разные пятёрки</p>
      <h1 className="mt-2 font-serif text-4xl">Полка команд</h1>
      {runs === null ? <p className="mt-6 text-ink-soft">Открываем полку…</p> : null}
      {runs && current.length === 0 ? <p className="mt-6 max-w-lg text-ink-soft">День ещё никто не запечатал. Закройте пять решений и оставьте прогон на полке.</p> : null}
      <div className="mt-6 space-y-4">
        {current.map((run) => (
          <article key={run.createdAt + run.teamName} className="paper-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-2xl">{run.teamName}</h2>
              <p className="text-sm text-ink-soft">пол {run.floorDistrictName} {formatScore(run.floor)} · резерв {run.reserve} · провалов {run.nCrit}</p>
            </div>
            <div className="mt-3 h-3 bg-paper-deep">
              <div className="h-3 bg-steppe" style={{ width: `${(run.score / max) * 100}%` }} />
            </div>
            <p className="mt-2 font-semibold">{formatScore(run.score)}</p>
            <p className="mt-1 text-sm text-ink-soft">{run.choices.map((item) => item.title).join(" · ")}</p>
          </article>
        ))}
      </div>
      <Link href="/decide" className="no-print mt-8 inline-block border border-line px-4 py-3">К набору</Link>
    </main>
  );
}
