import type { Lang, ThemeName } from "./prefs";

export function interpret(text: string): { lang?: Lang; theme?: ThemeName } | null {
  const value = text.toLowerCase();
  const found: { lang?: Lang; theme?: ThemeName } = {};
  if (/қазақ|казах|kazakh|\bkk\b/.test(value)) found.lang = "kk";
  else if (/english|англ|\ben\b/.test(value)) found.lang = "en";
  else if (/русск|russian|\bru\b/.test(value)) found.lang = "ru";

  if (/ноч|night|dark|қараңғы|түн/.test(value)) found.theme = "night";
  else if (/степ|steppe|жасыл|green/.test(value)) found.theme = "steppe";
  else if (/бумаг|paper|светл|light|қағаз/.test(value)) found.theme = "paper";

  return found.lang || found.theme ? found : null;
}
