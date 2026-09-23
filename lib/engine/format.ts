export function round1(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatScore(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

export function formatSigned(value: number): string {
  const text = formatScore(Math.abs(value));
  if (value > 0.005) return `+${text}`;
  if (value < -0.005) return `−${text}`;
  return "0,00";
}

export const TAG_LABELS: Record<string, string> = {
  center: "центр",
  equity: "окраина",
  heavy: "стройка",
  winter_fragile: "зима",
  winter_ok: "к зиме готов",
  cameras: "камеры",
  lighting: "свет",
  safe: "тихий ход",
  light: "лёгкий ход",
};
