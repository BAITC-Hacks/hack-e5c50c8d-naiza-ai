function mix(from: string, to: string, t: number) {
  const parse = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const [a, b] = [parse(from), parse(to)];
  const value = a.map((channel, index) => Math.round(channel + (b[index] - channel) * t));
  return `rgb(${value[0]}, ${value[1]}, ${value[2]})`;
}

export function scoreColor(score: number) {
  const t = Math.min(1, Math.max(0, (score - 45) / 25));
  if (t < 0.5) return mix("#8C2F2F", "#C4892A", t * 2);
  return mix("#C4892A", "#1E6B52", (t - 0.5) * 2);
}
