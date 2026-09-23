import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { city } from "../engine/city";
import { round2 } from "../engine/format";
import { recommend } from "../engine/recommend";
import type { ScenarioResult } from "../engine/types";
import type { Briefing } from "./briefing";
import { foreignFigures, unknownEvidence } from "./evidence";
import { buildFallback } from "./fallback";
import { economistPrompt, riskPrompt, secretaryPrompt, urbanistPrompt, voicePrompt } from "./prompts";
import { observationSchema, quotesSchema, secretarySchema, type Observation, type Quotes } from "./schemas";

type Packet = ReturnType<typeof compact>;

function modelName() {
  return process.env.XAI_MODEL || "grok-4.7";
}

function makeClient() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" });
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("В ответе нет JSON");
  }
}

function compact(result: ScenarioResult, teamName: string) {
  const advice = recommend(result.choices);
  const neighbors = [...advice.improvements, ...(advice.floorPick ? [advice.floorPick] : [])].map((item) => ({
    id: item.id,
    measureId: item.measureId,
    districtId: item.districtId,
    replaces: item.replaces,
    toTitle: city.measures.find((measure) => measure.id === item.measureId)?.title ?? item.measureId,
    cost: item.cost,
    score: item.score,
    delta: item.delta,
    floor: item.floor,
    floorDelta: item.floorDelta,
  }));
  const evidenceIds = [...result.evidenceIds, ...neighbors.map((item) => `neighbor.${item.id}`)];
  return {
    teamName,
    version: result.version,
    score: result.score,
    delta: result.delta,
    mean: result.mean,
    floor: result.floor,
    floorDistrictId: result.floorDistrictId,
    floorDistrict: result.districts.find((item) => item.id === result.floorDistrictId)?.name,
    baselineScore: result.baselineScore,
    nCrit: result.nCrit,
    cost: result.cost,
    reserve: result.reserve,
    budget: 100,
    choices: result.measures.map((item) => ({
      id: item.id,
      title: item.title,
      direction: item.direction,
      districtId: item.districtId,
      districtName: item.districtName,
      cost: item.cost,
      lag: item.lag,
      factor: item.factor,
    })),
    districts: result.districts.map((item) => ({
      id: item.id,
      name: item.name,
      beforeScore: round2(item.beforeScore),
      afterScore: round2(item.afterScore),
      delta: round2(item.delta),
    })),
    biggestMovers: result.biggestMovers,
    personas: city.personas.map((item) => ({ districtId: item.districtId, persona: item.name, detail: item.detail })),
    criticals: result.criticals,
    synergies: result.synergies,
    neighbors,
    evidenceIds,
  };
}

async function askJson<T>(
  client: OpenAI,
  system: string,
  packet: Packet,
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  accept: (value: T) => string | null,
  timeoutMs: number,
): Promise<T> {
  let reason = "пустой ответ";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await client.chat.completions.create(
      {
        model: modelName(),
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content:
              attempt === 0
                ? JSON.stringify(packet)
                : `${JSON.stringify(packet)}\n\nПредыдущий ответ отклонён: ${reason}. Верни только JSON по схеме.`,
          },
        ],
      },
      { signal: AbortSignal.timeout(timeoutMs) },
    );
    try {
      const parsed = schema.safeParse(extractJson(response.choices[0]?.message?.content ?? ""));
      if (!parsed.success) {
        reason = "ответ не совпал со схемой";
        continue;
      }
      const problem = accept(parsed.data);
      if (problem) {
        reason = problem;
        continue;
      }
      return parsed.data;
    } catch {
      reason = "ответ не разобран как JSON";
    }
  }
  throw new Error(reason);
}

function evidenceProblem(data: Observation, allowed: string[], haystack: string): string | null {
  const ids = data.observations.flatMap((item) => item.evidenceIds);
  const unknown = unknownEvidence(ids, allowed);
  if (unknown.length) return `неизвестные evidenceIds: ${unknown.join(", ")}`;
  const figures = foreignFigures(data.observations.map((item) => item.claim).join(" "), haystack);
  return figures.length ? `числа вне журнала: ${figures.join(", ")}` : null;
}

function quotesProblem(data: Quotes, packet: Packet): string | null {
  const movers = new Set(packet.biggestMovers.map((item) => item.districtId));
  for (const quote of data.quotes) {
    if (!movers.has(quote.districtId)) return "цитата не из районов, которые сдвинулись сильнее других";
    const persona = packet.personas.find((item) => item.districtId === quote.districtId);
    if (!persona || persona.persona !== quote.persona) return "имя жителя не из карточки района";
  }
  return null;
}

async function askSecretary(client: OpenAI, packet: Packet, notes: unknown, result: ScenarioResult): Promise<Briefing> {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: secretaryPrompt },
    { role: "user", content: JSON.stringify({ packet, notes }) },
  ];
  const trace: string[] = [];
  let toolUses = 0;
  let reason = "секретарь не собрал доклад";
  const haystack = JSON.stringify(packet);

  for (let step = 0; step < 4; step += 1) {
    const response = await client.chat.completions.create(
      {
        model: modelName(),
        temperature: 0.4,
        messages,
        tools:
          toolUses < 2
            ? [
                {
                  type: "function",
                  function: {
                    name: "readDistrict",
                    description: "Срез уже посчитанного журнала по одному району",
                    parameters: {
                      type: "object",
                      properties: { districtId: { type: "string" } },
                      required: ["districtId"],
                      additionalProperties: false,
                    },
                  },
                },
              ]
            : undefined,
        tool_choice: toolUses < 2 ? "auto" : undefined,
        response_format: toolUses >= 2 || step >= 2 ? { type: "json_object" } : undefined,
      },
      { signal: AbortSignal.timeout(25_000) },
    );
    const message = response.choices[0]?.message;
    if (message?.tool_calls?.length && toolUses < 2) {
      messages.push({ role: "assistant", content: message.content, tool_calls: message.tool_calls });
      for (const call of message.tool_calls) {
        if (call.type !== "function" || toolUses >= 2) continue;
        toolUses += 1;
        const args = JSON.parse(call.function.arguments || "{}") as { districtId?: string };
        const districtId = args.districtId ?? "";
        trace.push(districtId);
        const slice = result.districts.find((item) => item.id === districtId);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(
            slice
              ? {
                  id: slice.id,
                  name: slice.name,
                  beforeScore: round2(slice.beforeScore),
                  afterScore: round2(slice.afterScore),
                  delta: round2(slice.delta),
                }
              : { error: "нет такого района" },
          ),
        });
      }
      continue;
    }

    try {
      const parsed = secretarySchema.safeParse(extractJson(message?.content ?? ""));
      if (!parsed.success) {
        reason = "схема доклада";
        messages.push({ role: "user", content: "Верни только JSON доклада по схеме, без новых чисел." });
        continue;
      }
      const prose = [...parsed.data.strengths, ...parsed.data.risks, parsed.data.consequences].join(" ");
      const figures = foreignFigures(prose, haystack);
      if (figures.length) {
        reason = `числа вне журнала: ${figures.join(", ")}`;
        messages.push({ role: "user", content: `Убери числа, которых нет в журнале: ${figures.join(", ")}. Верни JSON ещё раз.` });
        continue;
      }
      const known = new Set(packet.neighbors.map((item) => item.id));
      return {
        source: "council",
        strengths: parsed.data.strengths,
        risks: parsed.data.risks,
        consequences: parsed.data.consequences,
        quotes: [],
        shadowNotes: parsed.data.shadowNotes.filter((item) => known.has(item.neighborId)),
        trace: trace.filter(Boolean),
      };
    } catch {
      reason = "доклад не разобран";
    }
  }
  throw new Error(reason);
}

export async function runCouncil(result: ScenarioResult, teamName: string): Promise<Briefing> {
  const client = makeClient();
  const fallback = buildFallback(result);
  if (!client) {
    return { ...fallback, note: "Совет работает по журналу модели: ключ не задан." };
  }
  try {
    const packet = compact(result, teamName);
    const haystack = JSON.stringify(packet);
    const [urbanist, economist, voice, risk] = await Promise.all([
      askJson(client, urbanistPrompt, packet, observationSchema, (data) => evidenceProblem(data, packet.evidenceIds, haystack), 20_000),
      askJson(client, economistPrompt, packet, observationSchema, (data) => evidenceProblem(data, packet.evidenceIds, haystack), 20_000),
      askJson(client, voicePrompt, packet, quotesSchema, (data) => quotesProblem(data, packet), 20_000),
      askJson(client, riskPrompt, packet, observationSchema, (data) => evidenceProblem(data, packet.evidenceIds, haystack), 20_000),
    ]);
    const secretary = await askSecretary(client, packet, { urbanist, economist, voice, risk }, result);
    return { ...secretary, quotes: voice.quotes };
  } catch {
    return { ...fallback, note: "Совет не успел. Доклад собран по журналу модели." };
  }
}
