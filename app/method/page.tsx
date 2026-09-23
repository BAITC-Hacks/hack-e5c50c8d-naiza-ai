import { EXAMPLE } from "@/lib/engine/canon";
import { city } from "@/lib/engine/city";
import { formatScore, formatSigned } from "@/lib/engine/format";
import { simulate } from "@/lib/engine/simulate";

export default function MethodPage() {
  const base = simulate([]);
  const example = simulate(EXAMPLE);
  return (
    <main className="space-y-5">
      <section className="hero p-6 md:p-10">
        <p className="text-sm font-semibold text-gold">Прозрачная модель</p>
        <h1 className="mt-2 max-w-2xl font-serif text-4xl font-semibold md:text-5xl">Балл считается на глазах</h1>
        <p className="mt-4 max-w-2xl leading-7 text-cream/75">
          Восемь кварталов. Мера с лагом успевает на долю (8 − L) / 8. Синергия прибавляется целиком. Языковая модель эти числа не придумывает.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <article className="paper-card p-6">
          <p className="text-sm font-semibold text-ink-soft">Без действий</p>
          <p className="mt-2 font-serif text-5xl">{formatScore(base.score)}</p>
          <p className="mt-2 text-sm text-ink-soft">средний {formatScore(base.mean)} · пол {formatScore(base.floor)} · провалов {base.nCrit}</p>
        </article>
        <article className="paper-card p-6">
          <p className="text-sm font-semibold text-ink-soft">Пример методики · {example.cost} из 100</p>
          <p className="mt-2 font-serif text-5xl">{formatScore(example.score)}</p>
          <p className="mt-2 text-sm text-ink-soft">{formatSigned(example.delta)} к базе · пол {formatScore(example.floor)} · провалов {example.nCrit}</p>
        </article>
      </section>
      <pre className="hero overflow-x-auto p-6 font-sans text-sm leading-7 text-cream">{`показатель = ограничить в 0…100
район      = сумма весов × показатели
Score      = 0,70 × средний + 0,30 × самый слабый − провалы ниже ${city.score.criticalBelow}`}</pre>
      <p className="max-w-3xl text-sm leading-6 text-ink-soft">
        Веса направлений: транспорт 0,20, экология 0,20, соцсфера 0,22, безопасность 0,18, сервисы 0,20.
        Из одного направления можно взять не больше двух мер. Бюджет {city.budget}. Остаток не повышает балл.
        Пример: школа и поликлиника в Нуре, камеры в Нуре, платформа обращений, чистое топливо в Сарыарке.
      </p>
    </main>
  );
}
