import type { Choice } from "./engine/types";

export type Draft = {
  teamName: string;
  choices: Choice[];
};

const KEY = "akim-draft-v2";

export function emptyDraft(): Draft {
  return { teamName: "", choices: [] };
}

export function loadDraft(): Draft {
  if (typeof window === "undefined") return emptyDraft();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as Partial<Draft>;
    const choices = Array.isArray(parsed.choices)
      ? parsed.choices.filter((item): item is Choice => Boolean(item) && typeof item.measureId === "string")
      : [];
    return {
      teamName: typeof parsed.teamName === "string" ? parsed.teamName : "",
      choices: choices.map((item) => ({ measureId: item.measureId, districtId: item.districtId ?? null })),
    };
  } catch {
    return emptyDraft();
  }
}

export function saveDraft(draft: Draft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(draft));
}
