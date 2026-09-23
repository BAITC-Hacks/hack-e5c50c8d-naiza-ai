import { NextResponse } from "next/server";
import OpenAI from "openai";
import { describeSnapshot, stripCode } from "@/lib/plain-speech";

export const runtime = "nodejs";

type Turn = { role: "user" | "assistant"; content: string };

const languageName = { ru: "русском", kk: "казахском", en: "английском" } as const;

function fallback(lang: string, snapshot: unknown): string {
  const facts = describeSnapshot(snapshot, lang);
  if (lang === "en") {
    return `${facts} Seventy percent of the score is the city average, thirty percent is the weakest district, and each indicator under 40 costs one point.`;
  }
  if (lang === "kk") {
    return `${facts} Баллдың 70 пайызы орташа деңгей, 30 пайызы ең әлсіз аудан. 40-тан төмен әр көрсеткіш бір балл алып тастайды.`;
  }
  return `${facts} Семьдесят процентов балла — средний город, тридцать — самый слабый район. Каждый показатель ниже 40 снимает один балл.`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    messages?: Turn[];
    lang?: string;
    snapshot?: unknown;
  } | null;
  const messages = Array.isArray(body?.messages) ? body.messages.slice(-8) : [];
  const lang = body?.lang === "kk" || body?.lang === "en" ? body.lang : "ru";
  const last = messages.filter((item) => item.role === "user").at(-1)?.content?.trim();
  if (!last) return NextResponse.json({ error: "empty" }, { status: 400 });

  const plain = fallback(lang, body?.snapshot ?? {});
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return NextResponse.json({ text: plain, source: "fallback" });

  try {
    const client = new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" });
    const response = await client.chat.completions.create(
      {
        model: process.env.XAI_MODEL || "grok-4.7",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: `Ты секретарь города в симуляторе «Аким на 5 часов». Отвечай на ${languageName[lang]} обычными предложениями, 3-6 фраз, как человеку в кабинете. Не пиши код, JSON, формулы в скобках, имена файлов, функций и текст в обратных кавычках. Если называешь балл, район или цену, бери их только из снимка ниже. Не выдумывай Score. Правила можно сказать словами: бюджет сто, ровно пять мер, не больше двух в одном направлении, мера включается после лага, синергия не режется лагом.`,
          },
          {
            role: "user",
            content: `${describeSnapshot(body?.snapshot ?? {}, lang)}\n\nВопрос: ${last}`,
          },
        ],
      },
      { signal: AbortSignal.timeout(20_000) },
    );
    const text = stripCode(response.choices[0]?.message?.content ?? "");
    return NextResponse.json({ text: text.length > 20 ? text : plain, source: text.length > 20 ? "council" : "fallback" });
  } catch {
    return NextResponse.json({ text: plain, source: "fallback" });
  }
}
