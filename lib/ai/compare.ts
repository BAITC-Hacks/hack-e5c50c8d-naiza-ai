import OpenAI from "openai";
import { formatScore, formatSigned } from "../engine/format";
import type { ScenarioResult } from "../engine/types";

export function compareFallback(left: ScenarioResult, right: ScenarioResult, leftName: string, rightName: string): string {
  const lead = left.score === right.score ? "Баллы совпали." : left.score > right.score ? `Выше ${leftName}.` : `Выше ${rightName}.`;
  const gap = formatSigned(left.score - right.score);
  return [
    `${lead} ${leftName}: Score ${formatScore(left.score)}, слабый район ${formatScore(left.floor)}, провалов ${left.nCrit}, цена ${left.cost}.`,
    `${rightName}: Score ${formatScore(right.score)}, слабый район ${formatScore(right.floor)}, провалов ${right.nCrit}, цена ${right.cost}.`,
    `Разница Score ${gap}. Остаток бюджета на балл не влияет.`,
  ].join(" ");
}

export async function compareBrief(left: ScenarioResult, right: ScenarioResult, leftName: string, rightName: string): Promise<{ text: string; source: "council" | "fallback" }> {
  const fallback = compareFallback(left, right, leftName, rightName);
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { text: fallback, source: "fallback" };
  try {
    const client = new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" });
    const packet = {
      left: summary(left, leftName),
      right: summary(right, rightName),
    };
    const response = await client.chat.completions.create(
      {
        model: process.env.XAI_MODEL || "grok-4.7",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Сравни два городских набора по-русски, в 4-6 предложениях. Используй только числа из JSON. Не выдумывай меры и баллы. Объясни, кто выиграл за счёт среднего, слабого района или меньшего числа провалов ниже 40.",
          },
          { role: "user", content: JSON.stringify(packet) },
        ],
      },
      { signal: AbortSignal.timeout(20_000) },
    );
    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return { text: fallback, source: "fallback" };
    return { text, source: "council" };
  } catch {
    return { text: fallback, source: "fallback" };
  }
}

function summary(result: ScenarioResult, name: string) {
  return {
    name,
    score: result.score,
    mean: result.mean,
    floor: result.floor,
    floorDistrict: result.districts.find((item) => item.id === result.floorDistrictId)?.name,
    nCrit: result.nCrit,
    cost: result.cost,
    reserve: result.reserve,
    measures: result.measures.map((item) => `${item.title}${item.districtName ? ` (${item.districtName})` : ""}`),
    synergies: result.synergies.map((item) => item.text),
  };
}
