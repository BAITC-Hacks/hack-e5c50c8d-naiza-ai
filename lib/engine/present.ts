import { districtById, indicatorTitle, personaFor } from "./city";
import { formatScore, formatSigned } from "./format";
import type { ScenarioResult } from "./types";

export type JournalLine = { tone: "good" | "warn" | "bad"; text: string };

export function journalLines(result: ScenarioResult): JournalLine[] {
  const name = (id: string) => result.districts.find((item) => item.id === id)?.name ?? id;
  const lines: JournalLine[] = [];
  for (const item of result.synergies) {
    lines.push({ tone: "good", text: `${name(item.districtId)}: ${item.text} (+${formatScore(item.amount)} к ${indicatorTitle(item.indicator)}).` });
  }
  if (result.nCrit === 0) {
    lines.push({ tone: "good", text: "Критических провалов ниже 40 не осталось." });
  } else {
    const cells = result.criticals
      .map((item) => `${name(item.districtId)} · ${indicatorTitle(item.indicator)} ${formatScore(item.value)}`)
      .join("; ");
    lines.push({ tone: "bad", text: `Провалов ниже 40: ${result.nCrit}. ${cells}.` });
  }
  const partial = result.measures.filter((item) => item.factor < 1);
  if (partial.length) {
    lines.push({
      tone: "warn",
      text: "Часть мер не успевает за 8 кварталов: эффект умножен на (8 − лаг) / 8. Синергии этим не режутся.",
    });
  }
  return lines;
}

const VOICE: Record<string, { up: string; flat: string }> = {
  nura: {
    up: "Школа и врач наконец в нашем районе, а не через весь город.",
    flat: "Нура снова внизу списка. Детям по-прежнему тесно.",
  },
  saryarka: {
    up: "Зимой дышать стало легче. Печки больше не держат весь квартал в дыму.",
    flat: "Смог никуда не делся. Окна по утрам серые.",
  },
  esil: {
    up: "До школы стало ближе, и мост чуть отпустил.",
    flat: "Левый берег и так жил плотно. Этот набор почти не про наши пробки.",
  },
  almaty: {
    up: "Трубы перестали срывать зиму. Вода держится.",
    flat: "Старый дом как стоял в пробке, так и стоит.",
  },
  baikonur: {
    up: "Двор стал светлее, автобус понятнее.",
    flat: "Мы посередине. Ни рывка, ни провала.",
  },
};

export function residentQuotes(result: ScenarioResult) {
  const movers = result.biggestMovers.length ? result.biggestMovers : result.districts.slice(0, 3).map((item) => ({ districtId: item.id, delta: 0 }));
  return movers.slice(0, 3).map((mover) => {
    const persona = personaFor(mover.districtId);
    const bank = VOICE[mover.districtId];
    const line = mover.delta > 1 ? bank?.up ?? "В районе стало заметно лучше." : bank?.flat ?? "Этот набор прошёл мимо двора.";
    return {
      districtId: mover.districtId,
      persona: persona?.name ?? districtById(mover.districtId)?.name ?? mover.districtId,
      line,
    };
  });
}
