"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CityMap } from "@/components/CityMap";
import { CHEAP, EXAMPLE } from "@/lib/engine/canon";
import { city, indicatorTitle, measureById } from "@/lib/engine/city";
import { formatScore, formatSigned } from "@/lib/engine/format";
import { coach } from "@/lib/engine/coach";
import { cityInsight, helpsWeakDistrict } from "@/lib/engine/insights";
import { canAdd, project } from "@/lib/engine/simulate";
import { loadDraft, saveDraft, type Draft } from "@/lib/draft";
import type { Choice, DirectionId, Indicator } from "@/lib/engine/types";

function effectText(effects: Partial<Record<Indicator, number>>) {
  return Object.entries(effects)
    .map(([key, value]) => `${indicatorTitle(key as Indicator)} ${formatSigned(value ?? 0)}`)
    .join(" · ");
}

export default function DecidePage() {
  const router = useRouter();
  const pickerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Draft>({ teamName: "", choices: [] });
  const [direction, setDirection] = useState<DirectionId>("social");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [onlyWeak, setOnlyWeak] = useState(false);

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

  useEffect(() => {
    if (pendingId) pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [pendingId]);

  const view = project(draft.choices);
  const hintKey = draft.choices.map((item) => `${item.measureId}:${item.districtId ?? ""}`).join("|");
  const hints = useMemo(() => coach(draft.choices), [hintKey, draft.choices]);
  const pending = pendingId ? measureById(pendingId) : undefined;
  const floorDistrict = [...view.districts].sort((a, b) => a.afterScore - b.afterScore)[0];
  const pulse = cityInsight(draft.choices, view.districts, view.cost);
  const measures = city.measures.filter((item) => {
    if (item.direction !== direction) return false;
    if (query.trim() && !item.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (onlyWeak && !helpsWeakDistrict(item, floorDistrict)) return false;
    return true;
  });
  const spent = Math.max(0, view.cost);

  function commit(choices: Choice[]) {
    const next = { ...draft, choices };
    setDraft(next);
    saveDraft(next);
    setNotice(null);
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

  return (
    <main className="pb-28">
      <section className="hero p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gold">{draft.teamName || "Команда"}</p>
            <h1 className="mt-1 font-serif text-4xl font-semibold md:text-5xl">Пять мест в наборе</h1>
          </div>
          <div className="text-left md:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cream/60">Score</p>
            <p className="font-serif text-5xl">{view.scored ? formatScore(view.scored.score) : "—"}</p>
            <p className="text-sm text-cream/70">
              {view.scored ? `${formatSigned(view.scored.delta)} к базе 52,56` : `${draft.choices.length} из 5 заполнено`}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm text-cream/80">
            <span>Потрачено {spent}</span>
            <span>осталось {view.reserve} из 100</span>
          </div>
          <div className="meter"><span style={{ width: `${Math.min(100, spent)}%` }} /></div>
        </div>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => {
            const choice = draft.choices[index];
            const measure = choice ? measureById(choice.measureId) : undefined;
            const place = choice?.districtId ? city.districts.find((item) => item.id === choice.districtId)?.name : "весь город";
            return (
              <li key={index} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3">
                <p className="font-serif text-lg text-gold">{index + 1}</p>
                {measure ? (
                  <>
                    <p className="mt-1 text-sm font-semibold leading-5">{measure.title}</p>
                    <p className="text-xs text-cream/65">{place} · {measure.cost}</p>
                    <button
                      type="button"
                      className="mt-2 text-sm font-semibold text-gold"
                      onClick={() => commit(draft.choices.filter((item) => item.measureId !== choice.measureId))}
                    >
                      Убрать
                    </button>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-cream/55">Свободно</p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {hints.length > 0 ? (
        <section className="mt-4 grid gap-3 md:grid-cols-3">
          {hints.map((hint) => (
            <button
              key={`${hint.choice.measureId}:${hint.choice.districtId ?? "city"}`}
              type="button"
              onClick={() => add(hint.choice)}
              className="paper-card p-4 text-left hover:ring-2 hover:ring-gold"
            >
              <p className="text-sm font-semibold text-gold-deep">Следующий сильный ход</p>
              <p className="mt-1 font-serif text-2xl">{hint.title}</p>
              <p className="text-sm text-ink-soft">{hint.place} · {hint.cost}</p>
              <p className="mt-2 text-sm">Дальше по сильным ходам Score около {formatScore(hint.finalScore)}</p>
            </button>
          ))}
        </section>
      ) : null}

      {pending ? (
        <section ref={pickerRef} className="paper-card mt-4 p-5 ring-2 ring-gold">
          <p className="text-sm font-semibold text-gold-deep">Следующий шаг</p>
          <h2 className="mt-1 font-serif text-3xl">Куда поставить «{pending.title}»?</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
            {city.districts.map((district) => {
              const gate = canAdd(draft.choices, { measureId: pending.id, districtId: district.id });
              return (
                <button
                  key={district.id}
                  type="button"
                  disabled={!gate.ok}
                  onClick={() => add({ measureId: pending.id, districtId: district.id })}
                  className="btn btn-dark h-14"
                >
                  {district.name}
                </button>
              );
            })}
          </div>
          {notice ? <p className="mt-3 text-sm font-semibold text-seal">{notice}</p> : null}
        </section>
      ) : null}

      <section className="mt-6 grid items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl">Каталог</h2>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={onlyWeak} onChange={(event) => setOnlyWeak(event.target.checked)} />
              Только меры для {floorDistrict?.name ?? "слабого района"}
            </label>
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти меру" className="field field-light mt-3" />
          <div className="mt-3 flex flex-wrap gap-2">
            {city.directions.map((item) => {
              const count = draft.choices.filter((choice) => measureById(choice.measureId)?.direction === item.id).length;
              const active = direction === item.id;
              return (
                <button key={item.id} type="button" onClick={() => setDirection(item.id)} className={`btn ${active ? "btn-dark" : "btn-line"}`}>
                  {item.title}
                  <span className="ml-2 text-xs opacity-70">{count}/2</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid gap-3">
            {measures.length === 0 ? <p className="text-sm text-ink-soft">В этом направлении нет мер по такому запросу.</p> : null}
            {measures.map((item) => {
              const picked = draft.choices.some((choice) => choice.measureId === item.id);
              const possible = item.scope === "city"
                ? canAdd(draft.choices, { measureId: item.id, districtId: null }).ok
                : city.districts.some((district) => canAdd(draft.choices, { measureId: item.id, districtId: district.id }).ok);
              const closed = !picked && (!possible || draft.choices.length >= 5);
              const active = pendingId === item.id;
              return (
                <article key={item.id} className={`paper-card p-4 ${active ? "ring-2 ring-gold" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-2xl">{item.title}</h3>
                        <span className="chip chip-light">{item.cost}</span>
                        <span className="chip chip-light">{item.scope === "city" ? "весь город" : "один район"}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">{effectText(item.effects)}. Заработает через {item.lag} кв.</p>
                    </div>
                    {item.scope === "city" ? (
                      <button type="button" disabled={closed || picked} onClick={() => add({ measureId: item.id, districtId: null })} className="btn btn-dark">
                        {picked ? "В наборе" : "Добавить"}
                      </button>
                    ) : (
                      <button type="button" disabled={closed || picked} onClick={() => { setPendingId(item.id); setNotice(null); }} className="btn btn-line">
                        {picked ? "В наборе" : active ? "Район выше" : "Выбрать район"}
                      </button>
                    )}
                  </div>
                  {closed && !picked ? (
                    <p className="mt-3 text-sm text-seal">
                      {draft.choices.length >= 5 ? "Пять мест уже заняты. Уберите одну меру сверху." : "Эта мера сейчас нарушает правила бюджета, направления или совместимости."}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <div className="paper-card p-4">
            <h2 className="px-1 font-serif text-2xl">Правила</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {pulse.rules.map((rule) => (
                <li key={rule.label} className={rule.ok ? "text-steppe" : "text-ink-soft"}>{rule.ok ? "●" : "○"} {rule.label}</li>
              ))}
            </ul>
          </div>
          <div className="paper-card p-4">
            <h2 className="px-1 font-serif text-2xl">Ниже 40</h2>
            {pulse.criticals.length === 0 ? <p className="mt-2 text-sm text-steppe">Таких показателей нет.</p> : (
              <ul className="mt-2 space-y-1 text-sm">
                {pulse.criticals.map((item) => (
                  <li key={item.name + item.title}>{item.name}: {item.title} · {item.value.toFixed(1).replace(".", ",")}</li>
                ))}
              </ul>
            )}
            {pulse.synergies.length ? (
              <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                {pulse.synergies.map((item) => (
                  <li key={item.id}>{item.state === "on" ? "Синергия включена. " : `Не хватает: ${item.missing}. `}{item.text}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="paper-card p-4">
            <h2 className="px-1 font-serif text-2xl">Город после набора</h2>
            <CityMap
              districts={view.districts}
              onDistrictClick={pending ? (id) => add({ measureId: pending.id, districtId: id }) : undefined}
            />
          </div>
        </aside>
      </section>

      <div className="dock no-print px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            {view.scored ? `Набор готов · Score ${formatScore(view.scored.score)}` : `Свободно мест: ${5 - draft.choices.length}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-line" onClick={() => { setPendingId(null); commit([]); }}>Очистить</button>
            <button type="button" className="btn btn-line" onClick={() => { setPendingId(null); commit(EXAMPLE); }}>Пример</button>
            <button type="button" className="btn btn-line" onClick={() => { setPendingId(null); commit(CHEAP); }}>Дешевле</button>
            <button type="button" disabled={!view.scored} onClick={() => router.push("/report")} className="btn btn-gold">
              Открыть доклад
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
