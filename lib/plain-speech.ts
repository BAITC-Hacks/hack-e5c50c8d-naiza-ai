export function stripCode(text: string): string {
  const withoutFences = text.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
  const lines = withoutFences.split(/\r?\n/).filter((line) => {
    const value = line.trim();
    if (!value) return false;
    if (/^[{}[\],;]+$/.test(value)) return false;
    if (/^(import |export |const |let |var |function |class |return |type |interface )/.test(value)) return false;
    if (/^\s*["']?[A-Za-z0-9_]+["']?\s*:/.test(value) && /[{}[\],]/.test(value)) return false;
    if ((value.match(/[{};]/g) ?? []).length >= 2 && /[=()[\]]/.test(value)) return false;
    return true;
  });
  return lines.join(" ").replace(/\s{2,}/g, " ").trim();
}

export function describeSnapshot(snapshot: unknown, lang: string): string {
  const data = snapshot && typeof snapshot === "object" ? (snapshot as Record<string, unknown>) : {};
  const measures = Array.isArray(data.measures) ? data.measures.filter((item) => typeof item === "string").join(", ") : "";
  const team = typeof data.team === "string" && data.team ? data.team : "";
  if (typeof data.score !== "number") {
    const chosen = typeof data.chosen === "number" ? data.chosen : 0;
    if (lang === "en") return `The plan has ${chosen} of 5 measures. The official score appears only after five valid measures. Budget is 100.`;
    if (lang === "kk") return `Жинақта ${chosen} шара бар, бесеуі керек. Ресми балл тек бес жарамды шарадан кейін шығады. Бюджет 100.`;
    return `В наборе ${chosen} из 5 мер. Официальный балл появляется только после пяти допустимых мер. Бюджет 100.`;
  }
  const score = data.score;
  const floorName = typeof data.floorDistrict === "string" ? data.floorDistrict : "";
  const floor = typeof data.floor === "number" ? data.floor : "";
  const mean = typeof data.mean === "number" ? data.mean : "";
  const nCrit = typeof data.nCrit === "number" ? data.nCrit : 0;
  const cost = typeof data.cost === "number" ? data.cost : "";
  const reserve = typeof data.reserve === "number" ? data.reserve : "";
  if (lang === "en") {
    return `${team ? `${team}. ` : ""}Score ${score}. Average ${mean}. Weakest district ${floorName} ${floor}. Indicators under 40: ${nCrit}. Cost ${cost}, reserve ${reserve}. Measures: ${measures}.`;
  }
  if (lang === "kk") {
    return `${team ? `${team}. ` : ""}Балл ${score}. Орташа ${mean}. Ең әлсіз аудан ${floorName} ${floor}. 40-тан төмен көрсеткіш: ${nCrit}. Құны ${cost}, қалдық ${reserve}. Шаралар: ${measures}.`;
  }
  return `${team ? `${team}. ` : ""}Балл ${score}. Средний ${mean}. Самый слабый район ${floorName} ${floor}. Показателей ниже 40: ${nCrit}. Цена ${cost}, остаток ${reserve}. Меры: ${measures}.`;
}
