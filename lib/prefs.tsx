"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "ru" | "kk" | "en";
export type ThemeName = "paper" | "night" | "steppe";

const copy = {
  ru: {
    brand: "Аким на 5 часов",
    brandSub: "100 единиц · 5 мер · 5 районов",
    navDecide: "Набор",
    navMethod: "Формула",
    navCompare: "Команды",
    homeKicker: "Симулятор одного бюджета",
    homeTitle: "Пять решений. Один город.",
    homeLead: "Семьдесят процентов балла — средний уровень. Тридцать — самый слабый район. Всё, что ниже 40, снимает балл.",
    teamName: "Имя команды",
    teamPlaceholder: "Левый берег",
    start: "Собрать набор",
    step1: "Мера",
    step1text: "Направление и одна инициатива из каталога.",
    step2: "Район",
    step2text: "Если мера не городская, выберите район кнопкой.",
    step3: "Доклад",
    step3text: "Пятая мера открывает балл и объяснение.",
    districtsNow: "Районы сейчас",
    nuraPulls: "Нура тянет пол вниз",
    scoreNow: "Город до ваших решений",
    slotsTitle: "Пять мест в наборе",
    filled: "заполнено",
    ofFive: "из 5",
    spent: "Потрачено",
    left: "осталось",
    ofBudget: "из 100",
    freeSlots: "Свободно мест",
    ready: "Набор готов",
    openReport: "Открыть доклад",
    example: "Пример",
    cheap: "Дешевле",
    clear: "Очистить",
    catalog: "Каталог",
    search: "Найти меру",
    onlyWeak: "Только меры для",
    chat: "Спросить город",
    chatHint: "Можно спросить про балл, меры и правила. Фразы «қазақша», «english» и «ночная тема» переключают язык и оформление.",
    chatPlaceholder: "Напишите вопрос",
    send: "Отправить",
    close: "Закрыть",
    you: "Вы",
    city: "Город",
    lang: "Язык",
    theme: "Оформление",
    paper: "Бумага",
    night: "Ночь",
    steppe: "Степь",
  },
  kk: {
    brand: "5 сағаттық әкім",
    brandSub: "100 бірлік · 5 шара · 5 аудан",
    navDecide: "Жинақ",
    navMethod: "Формула",
    navCompare: "Командалар",
    homeKicker: "Бір бюджет симуляторы",
    homeTitle: "Бес шешім. Бір қала.",
    homeLead: "Баллдың жетпіс пайызы — орташа деңгей. Отызы — ең әлсіз аудан. 40-тан төмен әр көрсеткіш баллды түсіреді.",
    teamName: "Команда аты",
    teamPlaceholder: "Сол жағалау",
    start: "Жинақты бастау",
    step1: "Шара",
    step1text: "Бағытты және каталогтан бір бастаманы таңдаңыз.",
    step2: "Аудан",
    step2text: "Шара қалалық болмаса, ауданды батырмамен таңдаңыз.",
    step3: "Баяндама",
    step3text: "Бесінші шара балл мен түсіндірмені ашады.",
    districtsNow: "Аудандар қазір",
    nuraPulls: "Нура төменгі шекті тартады",
    scoreNow: "Шешімге дейінгі қала",
    slotsTitle: "Жинақтағы бес орын",
    filled: "толтырылды",
    ofFive: "5-тен",
    spent: "Жұмсалды",
    left: "қалды",
    ofBudget: "100-ден",
    freeSlots: "Бос орын",
    ready: "Жинақ дайын",
    openReport: "Баяндаманы ашу",
    example: "Үлгі",
    cheap: "Арзан",
    clear: "Тазалау",
    catalog: "Каталог",
    search: "Шараны табу",
    onlyWeak: "Тек осы ауданға",
    chat: "Қаладан сұрау",
    chatHint: "Балл, шара және ереже туралы сұраңыз. «русский», «english», «ночная тема» тіл мен безендіруді ауыстырады.",
    chatPlaceholder: "Сұрағыңызды жазыңыз",
    send: "Жіберу",
    close: "Жабу",
    you: "Сіз",
    city: "Қала",
    lang: "Тіл",
    theme: "Безендіру",
    paper: "Қағаз",
    night: "Түн",
    steppe: "Дала",
  },
  en: {
    brand: "Mayor for 5 hours",
    brandSub: "100 units · 5 measures · 5 districts",
    navDecide: "Plan",
    navMethod: "Formula",
    navCompare: "Teams",
    homeKicker: "One shared budget",
    homeTitle: "Five decisions. One city.",
    homeLead: "Seventy percent of the score is the city average. Thirty percent is the weakest district. Anything under 40 costs a point.",
    teamName: "Team name",
    teamPlaceholder: "Left bank",
    start: "Build the plan",
    step1: "Measure",
    step1text: "Pick a direction and one action from the catalog.",
    step2: "District",
    step2text: "If it is not citywide, choose the district with a button.",
    step3: "Briefing",
    step3text: "The fifth measure opens the score and the explanation.",
    districtsNow: "Districts now",
    nuraPulls: "Nura holds the floor down",
    scoreNow: "The city before your decisions",
    slotsTitle: "Five seats in the plan",
    filled: "filled",
    ofFive: "of 5",
    spent: "Spent",
    left: "left",
    ofBudget: "of 100",
    freeSlots: "Seats left",
    ready: "Plan is ready",
    openReport: "Open the briefing",
    example: "Example",
    cheap: "Cheaper",
    clear: "Clear",
    catalog: "Catalog",
    search: "Find a measure",
    onlyWeak: "Only measures for",
    chat: "Ask the city",
    chatHint: "Ask about the score, measures, and rules. Phrases like «қазақша», «русский», and «night theme» switch language and look.",
    chatPlaceholder: "Write a question",
    send: "Send",
    close: "Close",
    you: "You",
    city: "City",
    lang: "Language",
    theme: "Look",
    paper: "Paper",
    night: "Night",
    steppe: "Steppe",
  },
} as const;

export type CopyKey = keyof (typeof copy)["ru"];

type Prefs = {
  lang: Lang;
  theme: ThemeName;
  setLang: (lang: Lang) => void;
  setTheme: (theme: ThemeName) => void;
  t: (key: CopyKey) => string;
};

const PrefsContext = createContext<Prefs | null>(null);
const STORAGE = "akim-prefs-v1";

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("ru");
  const [theme, setTheme] = useState<ThemeName>("paper");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { lang?: Lang; theme?: ThemeName };
      if (parsed.lang === "ru" || parsed.lang === "kk" || parsed.lang === "en") setLang(parsed.lang);
      if (parsed.theme === "paper" || parsed.theme === "night" || parsed.theme === "steppe") setTheme(parsed.theme);
    } catch {
      /* keep defaults */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "kk" ? "kk" : lang;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE, JSON.stringify({ lang, theme }));
  }, [lang, theme]);

  const t = (key: CopyKey) => copy[lang][key] ?? copy.ru[key];
  return <PrefsContext.Provider value={{ lang, theme, setLang, setTheme, t }}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const value = useContext(PrefsContext);
  if (!value) throw new Error("usePrefs outside provider");
  return value;
}
