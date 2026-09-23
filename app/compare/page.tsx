"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { city } from "@/lib/engine/city";
import { formatScore } from "@/lib/engine/format";
import type { SavedRun } from "@/lib/store/runs";

export default function ComparePage() {
  const [runs, setRuns] = useState<SavedRun[] | null>(null);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefing, setBriefing] = useState(false);

  useEffect(() => {
    void fetch("/api/runs")
      .then((response) => response.json())
      .then((payload: { runs: SavedRun[] }) => setRuns(payload.runs ?? []))
      .catch(() => setRuns([]));
  }, []);

  const current = (runs ?? []).filter((run) => run.version === city.version && typeof run.score === "number");
  const max = Math.max(60, ...current.map((run) => run.score));

  async function explain() {
    if (current.length < 2) return;
    const left = current[current.length - 2];
    const right = current[current.length - 1];
    setBriefing(true);
    setBrief(null);
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          left: left.choices,
          right: right.choices,
          leftName: left.teamName,
          rightName: right.teamName,
        }),
      });
      const payload = (await response.json()) as { text?: string };
      setBrief(payload.text ?? "Сравнение не собралось.");
    } catch {
      setBrief("Сравнение не собралось.");
    } finally {
      setBriefing(false);
    }
  }

  return (
    <main className="space-y-5">
      <section className="hero p-6 md:p-10">
        <p className="text-sm font-semibold text-gold">Один бюджет</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold md:text-5xl">Команды рядом</h1>
        <p className="mt-3 max-w-xl text-cream/75">Каждая карточка — запечатанный набор на этой машине. Чужие версии данных сюда не попадают.</p>
      </section>
      {runs === null ? <p className="text-ink-soft">Открываем полку…</p> : null}
      {runs && current.length === 0 ? (
        <article className="paper-card p-8">
          <h2 className="font-serif text-3xl">Пока пусто</h2>
          <p className="mt-2 max-w-lg text-ink-soft">Закройте пять мер и положите доклад на полку. Здесь появятся команды.</p>
          <Link href="/decide" className="btn btn-dark mt-5">Собрать набор</Link>
        </article>
      ) : null}
      {current.length >= 2 ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-dark" onClick={() => void explain()} disabled={briefing}>
            {briefing ? "Сравниваем…" : "Сравнить две последние"}
          </button>
          <p className="text-sm text-ink-soft">Берём два верхних прогона. Числа считает движок, текст только объясняет их.</p>
        </div>
      ) : null}
      {brief ? <article className="paper-card p-5 text-sm leading-6">{brief}</article> : null}
      <div className="grid gap-4">
        {current.map((run, index) => (
          <article key={run.createdAt + run.teamName} className="paper-card grid items-center gap-4 p-5 md:grid-cols-[auto_1fr_auto]">
            <p className="font-serif text-3xl text-gold-deep">{String(index + 1).padStart(2, "0")}</p>
            <div>
              <h2 className="font-serif text-2xl">{run.teamName}</h2>
              <p className="mt-1 text-sm text-ink-soft">Слабый район {run.floorDistrictName} · резерв {run.reserve} · провалов {run.nCrit}</p>
              <div className="meter mt-3 bg-paper-deep"><span style={{ width: `${(run.score / max) * 100}%` }} /></div>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{run.choices.map((item) => item.title).join(" · ")}</p>
            </div>
            <p className="font-serif text-5xl">{formatScore(run.score)}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
