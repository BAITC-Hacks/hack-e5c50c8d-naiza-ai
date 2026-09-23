export function unknownEvidence(ids: string[], allowed: string[]): string[] {
  const known = new Set(allowed);
  return ids.filter((id) => !known.has(id));
}

export function foreignFigures(text: string, haystack: string): string[] {
  const found = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return found.filter((raw) => {
    const normalized = raw.replace(",", ".");
    const value = Number(normalized);
    if (Number.isNaN(value)) return false;
    if (value < 10 && !raw.includes(",") && !raw.includes(".")) return false;
    const variants = [raw, normalized, normalized.replace(".", ",")];
    return !variants.some((item) => haystack.includes(item));
  });
}
