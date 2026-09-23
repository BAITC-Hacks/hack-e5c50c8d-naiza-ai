import { EXAMPLE } from "@/lib/engine/canon";
import { city } from "@/lib/engine/city";
import { formatScore, formatSigned } from "@/lib/engine/format";
import { simulate } from "@/lib/engine/simulate";

export default function MethodPage() {
  const base = simulate([]);
  const example = simulate(EXAMPLE);
  return (
    <main className="max-w-3xl">
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Открытая формула</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold">Как считается балл</h1>
      <p className="mt-4 text-ink-soft">
        Горизонт симуляции — 8 кварталов. Мера с лагом L успевает на долю (8 − L) / 8. Синергия прибавляется целиком и лагом не режется.
        Показатели обрезаются в диапазон 0…100. Числа считает движок, языковая модель их не придумывает.
      </p>
      <pre className="paper-card mt-6 overflow-x-auto p-4 text-sm leading-6">{`I' = clip(I + Σ эффект × (8 − L) / 8 + синергии, 0, 100)
D  = сумма весов × I'
средний = сумма (доля населения × D)
Score = 0,70×средний + 0,30×min(D) − 1×N_crit`}</pre>
      <p className="mt-4 text-sm text-ink-soft">
        N_crit — число пар «район × показатель» строго ниже {city.score.criticalBelow}. Веса: транспорт 0,20, экология 0,20, соцсфера 0,22, безопасность 0,18, сервисы 0,20.
        Из одного направления можно взять не больше двух мер. Бюджет {city.budget}. Остаток не сгорает и балл не повышает.
      </p>
      <h2 className="mt-8 font-serif text-2xl">Два набора на этих данных</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="paper-card p-4">
          <h3 className="font-serif text-xl">Без действий</h3>
          <p className="mt-2 text-3xl font-semibold">{formatScore(base.score)}</p>
          <p className="text-sm text-ink-soft">средний {formatScore(base.mean)}, пол {formatScore(base.floor)}, провалов {base.nCrit}</p>
        </article>
        <article className="paper-card p-4">
          <h3 className="font-serif text-xl">Пример методики · {example.cost}</h3>
          <p className="mt-2 text-3xl font-semibold">{formatScore(example.score)}</p>
          <p className="text-sm text-ink-soft">{formatSigned(example.delta)} к базе, пол {formatScore(example.floor)}, провалов {example.nCrit}</p>
        </article>
      </div>
      <p className="mt-4 text-sm text-ink-soft">
        Пример: школа и поликлиника в Нуре, камеры в Нуре, городская платформа обращений, чистое топливо в Сарыарке.
        Числа на странице посчитаны тем же simulate(), что и в наборе.
      </p>
    </main>
  );
}
