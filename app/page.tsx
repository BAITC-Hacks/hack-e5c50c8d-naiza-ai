"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CityMap } from "@/components/CityMap";
import { ScorePlate } from "@/components/ScorePlate";
import { loadDraft, saveDraft } from "@/lib/draft";
import { simulate } from "@/lib/engine/simulate";
import { usePrefs } from "@/lib/prefs";

export default function MorningPage() {
  const router = useRouter();
  const { t } = usePrefs();
  const morning = simulate([]);
  const steps = [
    { n: "01", title: t("step1"), text: t("step1text") },
    { n: "02", title: t("step2"), text: t("step2text") },
    { n: "03", title: t("step3"), text: t("step3text") },
  ];
  const [name, setName] = useState("");

  useEffect(() => {
    setName(loadDraft().teamName);
  }, []);

  return (
    <main className="space-y-5">
      <section className="hero grid items-center gap-8 p-6 md:p-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold text-gold">{t("homeKicker")}</p>
          <h1 className="mt-3 max-w-xl font-serif text-4xl font-semibold leading-[1.05] md:text-6xl">
            {t("homeTitle")}
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-cream/80">{t("homeLead")}</p>
          <label className="mt-8 block max-w-md">
            <span className="text-sm text-cream/70">{t("teamName")}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("teamPlaceholder")} className="field mt-2" />
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
            {t("start")}
          </button>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <ScorePlate result={morning} kicker={t("scoreNow")} />
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
          <h2 className="font-serif text-2xl">{t("districtsNow")}</h2>
          <p className="text-sm text-ink-soft">{t("nuraPulls")}</p>
        </div>
        <CityMap districts={morning.districts} />
      </section>
    </main>
  );
}
