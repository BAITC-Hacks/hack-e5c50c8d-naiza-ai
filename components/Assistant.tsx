"use client";

import { useState } from "react";
import { interpret } from "@/lib/assistant-commands";
import { loadDraft } from "@/lib/draft";
import { simulate } from "@/lib/engine/simulate";
import { usePrefs, type Lang, type ThemeName } from "@/lib/prefs";

type Turn = { role: "user" | "assistant"; content: string };

function snapshot() {
  const draft = loadDraft();
  try {
    if (draft.choices.length === 5) {
      const result = simulate(draft.choices);
      return {
        team: draft.teamName,
        measures: result.measures.map((item) => (item.districtName ? `${item.title} (${item.districtName})` : item.title)),
        score: result.score,
        mean: result.mean,
        floor: result.floor,
        floorDistrict: result.districts.find((item) => item.id === result.floorDistrictId)?.name,
        nCrit: result.nCrit,
        cost: result.cost,
        reserve: result.reserve,
      };
    }
  } catch {
    /* partial set has no official score */
  }
  return { team: draft.teamName, chosen: draft.choices.length, score: null, note: "официальный Score только у пяти допустимых мер" };
}

function switched(lang: Lang | undefined, theme: ThemeName | undefined, t: (key: "paper" | "night" | "steppe") => string) {
  if (lang === "en") return `Switched${lang ? " language" : ""}${theme ? ` and look to ${t(theme)}` : ""}.`;
  if (lang === "kk") return `Ауыстырдым${theme ? `: безендіру — ${t(theme)}` : ""}.`;
  return `Переключил${theme ? `: оформление «${t(theme)}»` : ""}.`;
}

export function Assistant() {
  const { lang, theme, setLang, setTheme, t } = usePrefs();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    setText("");
    const history = [...turns, { role: "user" as const, content }];
    setTurns(history);
    const command = interpret(content);
    if (command) {
      if (command.lang) setLang(command.lang);
      if (command.theme) setTheme(command.theme);
      const replyLang = command.lang ?? lang;
      setTurns([...history, { role: "assistant", content: switched(replyLang, command.theme, (key) => t(key)) }]);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, lang, snapshot: snapshot() }),
      });
      const payload = (await response.json()) as { text?: string };
      setTurns([...history, { role: "assistant", content: payload.text || t("chatHint") }]);
    } catch {
      setTurns([...history, { role: "assistant", content: t("chatHint") }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print fixed bottom-28 right-4 z-40 flex flex-col items-end gap-3">
      {open ? (
        <section className="paper-card flex h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2rem))] flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl">{t("chat")}</h2>
              <p className="mt-1 text-xs leading-5 text-ink-soft">{t("chatHint")}</p>
            </div>
            <button type="button" className="text-sm font-semibold text-ink-soft" onClick={() => setOpen(false)}>{t("close")}</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["ru", "kk", "en"] as const).map((item) => (
              <button key={item} type="button" onClick={() => setLang(item)} className={`btn px-3 py-1 text-xs ${lang === item ? "btn-dark" : "btn-line"}`}>
                {item === "ru" ? "Рус" : item === "kk" ? "Қаз" : "Eng"}
              </button>
            ))}
            {(["paper", "night", "steppe"] as const).map((item) => (
              <button key={item} type="button" onClick={() => setTheme(item)} className={`btn px-3 py-1 text-xs ${theme === item ? "btn-gold" : "btn-line"}`}>
                {t(item)}
              </button>
            ))}
          </div>
          <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
            {turns.length === 0 ? <p className="text-sm text-ink-soft">{t("chatHint")}</p> : null}
            {turns.map((turn, index) => (
              <p key={index} className={`rounded-2xl px-3 py-2 text-sm leading-6 ${turn.role === "user" ? "bg-ink text-paper" : "bg-paper text-ink"}`}>
                <span className="mb-1 block text-xs font-semibold opacity-70">{turn.role === "user" ? t("you") : t("city")}</span>
                {turn.content}
              </p>
            ))}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input value={text} onChange={(event) => setText(event.target.value)} placeholder={t("chatPlaceholder")} className="field field-light" />
            <button type="submit" className="btn btn-dark" disabled={busy || !text.trim()}>{t("send")}</button>
          </form>
        </section>
      ) : null}
      <button type="button" className="btn btn-gold shadow-lg" onClick={() => setOpen((value) => !value)}>
        {t("chat")}
      </button>
    </div>
  );
}
