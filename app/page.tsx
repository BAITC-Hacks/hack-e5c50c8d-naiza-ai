"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CityMap } from "@/components/CityMap";
import { ScorePlate } from "@/components/ScorePlate";
import { loadDraft, saveDraft } from "@/lib/draft";
import { simulate } from "@/lib/engine/simulate";

export default function MorningPage() {
  const router = useRouter();
  const morning = simulate([]);
  const [name, setName] = useState("");

  useEffect(() => {
    setName(loadDraft().teamName);
  }, []);

  return (
    <main className="grid items-start gap-8 md:grid-cols-[1.1fr_0.9fr]">
      <section>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Папка на столе · бюджет 100</p>
        <h1 className="mt-2 max-w-xl font-serif text-4xl font-semibold leading-tight md:text-5xl">
          Пять мер. Один город. Балл, который видит Нуру.
        </h1>
        <p className="mt-4 max-w-xl text-ink-soft">
          У всех команд один каталог и 100 условных единиц. Нужно выбрать ровно пять мероприятий.
          Семьдесят процентов балла — средний город, тридцать — самый слабый район. Каждый показатель ниже 40 снимает ещё один балл.
        </p>
        <div className="mt-8">
          <ScorePlate result={morning} kicker="База без действий" />
        </div>
        <label className="mt-8 block max-w-md">
          <span className="text-sm text-ink-soft">Имя команды</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Левый берег"
            className="mt-2 w-full border border-line bg-card px-3 py-3 text-ink outline-none focus:border-gold"
          />
        </label>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => {
            const draft = loadDraft();
            saveDraft({ ...draft, teamName: name.trim() });
            router.push("/decide");
          }}
          className="mt-4 bg-ink px-5 py-3 text-paper disabled:cursor-not-allowed disabled:opacity-40"
        >
          Открыть набор
        </button>
        <p className="mt-4 text-xs text-ink-soft">Условные районы, не официальная статистика. Жители в докладе вымышлены.</p>
      </section>
      <CityMap districts={morning.districts} />
    </main>
  );
}
