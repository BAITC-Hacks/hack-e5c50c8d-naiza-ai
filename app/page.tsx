"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CityMap } from "@/components/CityMap";
import { ScorePlate } from "@/components/ScorePlate";
import { loadDraft, saveDraft } from "@/lib/draft";
import { simulate } from "@/lib/engine/simulate";

const steps = [
  { n: "01", title: "Мера", text: "Направление и одна инициатива из каталога." },
  { n: "02", title: "Район", text: "Если мера не городская, выберите район кнопкой." },
  { n: "03", title: "Доклад", text: "Пятая мера открывает балл и объяснение." },
];

export default function MorningPage() {
  const router = useRouter();
  const morning = simulate([]);
  const [name, setName] = useState("");

  useEffect(() => {
    setName(loadDraft().teamName);
  }, []);

  return (
    <main className="space-y-5">
      <section className="hero grid items-center gap-8 p-6 md:p-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold text-gold">Симулятор одного бюджета</p>
          <h1 className="mt-3 max-w-xl font-serif text-4xl font-semibold leading-[1.05] md:text-6xl">
            Пять решений. Один город.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-cream/80">
            Семьдесят процентов балла — средний уровень. Тридцать — самый слабый район. Всё, что ниже 40, снимает балл.
          </p>
          <label className="mt-8 block max-w-md">
            <span className="text-sm text-cream/70">Имя команды</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Левый берег" className="field mt-2" />
          </label>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => {
              const draft = loadDraft();
              saveDraft({ ...draft, teamName: name.trim() });
              router.push("/decide");
            }}
            className="btn btn-gold mt-4"
          >
            Собрать набор
          </button>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <ScorePlate result={morning} kicker="Город до ваших решений" />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <article key={step.n} className="paper-card p-5">
            <p className="font-serif text-3xl text-gold-deep">{step.n}</p>
            <h2 className="mt-2 font-serif text-2xl">{step.title}</h2>
            <p className="mt-1 text-sm leading-6 text-ink-soft">{step.text}</p>
          </article>
        ))}
      </section>

      <section className="paper-card p-4 md:p-6">
        <div className="mb-2 flex items-end justify-between gap-3 px-1">
          <h2 className="font-serif text-2xl">Районы сейчас</h2>
          <p className="text-sm text-ink-soft">Нура тянет пол вниз</p>
        </div>
        <CityMap districts={morning.districts} />
      </section>
    </main>
  );
}
