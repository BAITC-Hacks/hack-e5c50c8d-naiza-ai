import type { Choice } from "./engine/types";
import { districtById, measureById } from "./engine/city";

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
      ? parsed.choices
          .filter((item): item is Choice => Boolean(item) && typeof item.measureId === "string")
          .map((item) => ({ measureId: item.measureId, districtId: typeof item.districtId === "string" ? item.districtId : null }))
          .filter((item) => {
            const measure = measureById(item.measureId);
            if (!measure) return false;
            if (measure.scope === "city") return item.districtId === null;
            return item.districtId !== null && Boolean(districtById(item.districtId));
          })
          .slice(0, 5)
      : [];
    return {
      teamName: typeof parsed.teamName === "string" ? parsed.teamName : "",
      choices,
    };
  } catch {
    return emptyDraft();
  }
}

export function saveDraft(draft: Draft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(draft));
}
