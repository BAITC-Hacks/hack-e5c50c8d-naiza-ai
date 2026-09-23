"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CityMap } from "@/components/CityMap";
import { ScorePlate } from "@/components/ScorePlate";
import { CHEAP, EXAMPLE } from "@/lib/engine/canon";
import { city, measureById } from "@/lib/engine/city";
import { formatSigned } from "@/lib/engine/format";
import { journalLines } from "@/lib/engine/present";
import { canAdd, project } from "@/lib/engine/simulate";
import { loadDraft, saveDraft, type Draft } from "@/lib/draft";
import type { Choice, DirectionId } from "@/lib/engine/types";

export default function DecidePage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({ teamName: "", choices: [] });
  const [direction, setDirection] = useState<DirectionId>("transport");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadDraft();
    const params = new URLSearchParams(window.location.search);
    const preset = params.get("preset");
    if (preset === "example" || preset === "cheap") {
      const next = { ...loaded, choices: preset === "example" ? EXAMPLE : CHEAP };
      saveDraft(next);
      setDraft(next);
    } else {
      setDraft(loaded);
    }
  }, []);

  const view = project(draft.choices);
  const pending = pendingId ? measureById(pendingId) : undefined;
  const measures = city.measures.filter((item) => item.direction === direction);

  function commit(choices: Choice[]) {
    const next = { ...draft, choices };
    setDraft(next);
    saveDraft(next);
  }

  function add(choice: Choice) {
    const gate = canAdd(draft.choices, choice);
    if (!gate.ok || draft.choices.length >= 5) {
      if (!gate.ok) setNotice(gate.message);
      return;
    }
    setNotice(null);
    commit([...draft.choices, choice]);
    setPendingId(null);
  }

  function onMeasure(id: string) {
    const measure = measureById(id);
    if (!measure) return;
    if (measure.scope === "city") {
      add({ measureId: id, districtId: null });
      return;
    }
    setPendingId(id);
  }

  return (
    <main className="pb-28 md:pb-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold">{draft.teamName || "Команда"} · {draft.choices.length} из 5</p>
          <h1 className="font-serif text-3xl font-semibold md:text-4xl">Пять мер на два года</h1>
          <p className="mt-1 max-w-xl text-ink-soft">
            {notice ?? (pending ? `Куда поставить «${pending.title}»? Нажмите район на схеме.` : "Районная мера просит район. Городская действует на всех.")}
          </p>
        </div>
        <div className="hidden md:block">
          {view.scored ? <ScorePlate result={view.scored} kicker="Score" /> : <p className="max-w-xs text-sm text-ink-soft">Score появится на пяти допустимых решениях. Сейчас он не считается.</p>}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <CityMap
            districts={view.districts}
            activeId={null}
            highlight={pending ? city.districts.map((item) => item.id) : []}
            onDistrictClick={(id) => {
              if (pendingId) add({ measureId: pendingId, districtId: id });
            }}
          />
          <ul className="mt-4 space-y-2 text-sm">
            {(view.scored ? journalLines(view.scored) : []).slice(0, 3).map((line) => (
              <li key={line.text} className={line.tone === "bad" ? "text-seal" : "text-ink-soft"}>{line.text}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-3 flex gap-2 overflow-x-auto">
            {city.directions.map((item) => {
              const count = draft.choices.filter((choice) => measureById(choice.measureId)?.direction === item.id).length;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDirection(item.id)}
                  className={`border px-3 py-2 text-sm ${direction === item.id ? "border-ink bg-ink text-paper" : "border-line bg-card"}`}
                >
                  {item.title} {count}/2
                </button>
              );
            })}
          </div>
          <div className="grid gap-3">
            {measures.map((item) => {
              const picked = draft.choices.find((choice) => choice.measureId === item.id);
              const gate = item.scope === "city"
                ? canAdd(draft.choices, { measureId: item.id, districtId: null })
                : city.districts.some((district) => canAdd(draft.choices, { measureId: item.id, districtId: district.id }).ok)
                  ? { ok: true as const }
                  : canAdd(draft.choices, { measureId: item.id, districtId: city.districts[0].id });
              const blocked = !picked && (!gate.ok || draft.choices.length >= 5);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={blocked || Boolean(picked)}
                  onClick={() => onMeasure(item.id)}
                  className={`paper-card p-4 text-left ${picked || pendingId === item.id ? "border-gold ring-1 ring-gold" : ""} ${blocked ? "opacity-70" : "hover:border-gold"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-xl">{item.id}. {item.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {item.scope === "city" ? "Весь город" : "Один район"} · лаг {item.lag} кв. · доля {(city.horizon - item.lag)}/8
                      </p>
                    </div>
                    <p className="font-semibold text-gold">{item.cost}</p>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">
                    {Object.entries(item.effects).map(([key, value]) => `${key} ${formatSigned(value)}`).join(", ")}
                  </p>
                  {picked ? <p className="mt-2 text-xs text-steppe">{picked.districtId ? city.districts.find((district) => district.id === picked.districtId)?.name : "город"}</p> : null}
                  {draft.choices.length >= 5 && !picked ? <span className="stamp mt-3">уже пять решений</span> : null}
                  {blocked && !gate.ok && draft.choices.length < 5 ? <span className="stamp mt-3">{gate.message}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur md:static md:mt-6 md:border md:bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-soft">Остаток {view.reserve} из 100</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {draft.choices.map((choice) => {
                const measure = measureById(choice.measureId);
                const district = choice.districtId ? city.districts.find((item) => item.id === choice.districtId)?.name : "город";
                return (
                  <button
                    key={choice.measureId}
                    type="button"
                    onClick={() => commit(draft.choices.filter((item) => item.measureId !== choice.measureId))}
                    className="border border-line px-2 py-1 text-xs"
                  >
                    {measure?.title} · {district} ×
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="border border-line px-3 py-2 text-sm" onClick={() => commit(EXAMPLE)}>Пример методики</button>
            <button type="button" className="border border-line px-3 py-2 text-sm" onClick={() => commit(CHEAP)}>Дешёвый набор</button>
            <button type="button" disabled={!view.scored} onClick={() => router.push("/report")} className="bg-ink px-4 py-2 text-paper disabled:opacity-40">
              Запечатать набор
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
