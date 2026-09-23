"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CityMap } from "@/components/CityMap";
import { ScorePlate } from "@/components/ScorePlate";
import { buildFallback } from "@/lib/ai/fallback";
import type { Briefing } from "@/lib/ai/briefing";
import { districtById, indicatorTitle } from "@/lib/engine/city";
import { formatScore, formatSigned } from "@/lib/engine/format";
import { journalLines } from "@/lib/engine/present";
import { recommend } from "@/lib/engine/recommend";
import { InvalidPortfolioError, simulate } from "@/lib/engine/simulate";
import { loadDraft, saveDraft } from "@/lib/draft";
import type { ScenarioResult } from "@/lib/engine/types";

export default function ReportPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("Команда");
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    setTeamName(draft.teamName || "Команда");
    try {
      const scored = simulate(draft.choices);
      if (scored.choices.length !== 5) {
        setProblem("Нужны ровно пять допустимых решений.");
        setReady(true);
        return;
      }
      setResult(scored);
      setBriefing(buildFallback(scored));
      setPending(true);
      void fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName: draft.teamName, choices: scored.choices }),
      })
        .then(async (response) => {
          if (!response.ok) return;
          const payload = (await response.json()) as { briefing?: Briefing };
          if (payload.briefing) setBriefing(payload.briefing);
        })
        .finally(() => setPending(false));
    } catch (error) {
      setProblem(error instanceof InvalidPortfolioError ? error.message : "Набор не считается.");
    }
    setReady(true);
  }, []);

  async function saveRun() {
    if (!result) return;
    await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamName, choices: result.choices }),
    });
    setSaved(true);
  }

  if (!ready) return <main className="text-ink-soft">Собираем доклад…</main>;
  if (!result || !briefing) {
    return (
      <main className="max-w-xl">
        <h1 className="font-serif text-4xl">Набор не запечатан</h1>
        <p className="mt-3 text-ink-soft">{problem}</p>
        <Link href="/decide" className="mt-6 inline-block bg-ink px-4 py-3 text-paper">Вернуться к набору</Link>
      </main>
    );
  }

  const advice = recommend(result.choices);
  const shadows = [...advice.improvements, ...(advice.floorPick ? [advice.floorPick] : [])];
  const floorName = districtById(result.floorDistrictId)?.name ?? result.floorDistrictId;

  return (
    <main>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Доклад · {teamName}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <ScorePlate result={result} kicker="Astana Quality of Life Score" />
        <p className="max-w-sm text-sm text-ink-soft">Пол города — {floorName}. Тридцать процентов балла смотрят сюда. Провалов ниже 40: {result.nCrit}.</p>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <CityMap districts={result.districts} />
        <div>
          <table className="w-full text-left text-sm">
            <thead className="text-ink-soft">
              <tr>
                <th className="py-2 font-medium">Район</th>
                <th className="py-2 font-medium">Было</th>
                <th className="py-2 font-medium">Стало</th>
                <th className="py-2 font-medium">Сдвиг</th>
              </tr>
            </thead>
            <tbody>
              {result.districts.map((district) => (
                <tr key={district.id} className="border-t border-line">
                  <td className="py-2">{district.name}</td>
                  <td>{formatScore(district.beforeScore)}</td>
                  <td>{formatScore(district.afterScore)}</td>
                  <td>{formatSigned(district.delta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="mt-4 space-y-2 text-sm">
            {journalLines(result).map((line) => (
              <li key={line.text} className={line.tone === "bad" ? "text-seal" : "text-ink-soft"}>{line.text}</li>
            ))}
          </ul>
          {result.criticals.length ? (
            <p className="mt-3 text-sm text-seal">
              {result.criticals.map((item) => `${districtById(item.districtId)?.name} ${indicatorTitle(item.indicator)} ${formatScore(item.value)}`).join("; ")}
            </p>
          ) : null}
        </div>
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <article className="paper-card p-5">
          <h2 className="font-serif text-2xl">Сильные стороны</h2>
          <ul className="mt-3 space-y-2 text-sm">{briefing.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className="paper-card p-5">
          <h2 className="font-serif text-2xl">Риски</h2>
          <ul className="mt-3 space-y-2 text-sm">{briefing.risks.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </section>
      <article className="paper-card mt-4 p-5">
        <h2 className="font-serif text-2xl">Последствия на 8 кварталов</h2>
        <p className="mt-3 text-sm leading-6">{briefing.consequences}</p>
        {briefing.note ? <p className="mt-3 text-xs text-ink-soft">{briefing.note}</p> : null}
        {pending ? <p className="mt-3 text-xs text-gold">Секретарь ещё пишет. На экране доклад по журналу.</p> : null}
        {briefing.trace.map((id) => <p key={id} className="mt-2 text-xs text-ink-soft">Секретарь открыл карточку {districtById(id)?.name ?? id}.</p>)}
      </article>
      <section className="mt-6 grid gap-3 md:grid-cols-3">
        {briefing.quotes.map((quote) => (
          <blockquote key={quote.districtId + quote.line} className="border-l-2 border-gold pl-3 text-sm">
            <p>«{quote.line}»</p>
            <footer className="mt-2 text-xs text-ink-soft">{quote.persona}, {districtById(quote.districtId)?.name}</footer>
          </blockquote>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Тень другого решения</h2>
        {shadows.length === 0 ? <p className="mt-2 text-sm text-ink-soft">Среди соседних наборов этот сильнейший.</p> : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {shadows.map((item) => (
              <button
                key={item.id}
                type="button"
                className="paper-card p-4 text-left hover:border-gold"
                onClick={() => {
                  const draft = loadDraft();
                  saveDraft({ ...draft, choices: item.choices });
                  router.push("/decide");
                }}
              >
                <p className="text-[11px] uppercase tracking-wider text-gold">{formatSigned(item.delta)} · пол {formatSigned(item.floorDelta)}</p>
                <p className="mt-1 font-serif text-xl">{item.replaces}</p>
                <p className="mt-1 text-sm text-ink-soft">Score {formatScore(item.score)}, пол {formatScore(item.floor)}</p>
                {briefing.shadowNotes.find((note) => note.neighborId === item.id)?.text ? <p className="mt-2 text-sm">{briefing.shadowNotes.find((note) => note.neighborId === item.id)?.text}</p> : null}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="no-print mt-8 flex flex-wrap gap-3">
        <Link href="/decide" className="border border-line px-4 py-3">Назад к набору</Link>
        <button type="button" onClick={() => void saveRun()} className="border border-line px-4 py-3">{saved ? "Прогон на полке" : "Оставить прогон на полке"}</button>
        <button type="button" onClick={() => window.print()} className="border border-line px-4 py-3">Собрать доклад</button>
        {saved ? <Link href="/compare" className="px-4 py-3 text-gold">Открыть полку</Link> : null}
      </div>
      <section className="mt-6 text-sm text-ink-soft">
        {result.measures.map((item) => <p key={item.id}>{item.id}. {item.title}{item.districtName ? `, ${item.districtName}` : ", город"} — {item.cost}</p>)}
        <p className="mt-2">Стоимость {result.cost}. Остаток {result.reserve}. Условные районы, не официальная статистика.</p>
      </section>
    </main>
  );
}
