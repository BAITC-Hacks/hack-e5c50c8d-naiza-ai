export type Quote = { districtId: string; persona: string; line: string };
export type ShadowNote = { neighborId: string; text: string };

export type Briefing = {
  source: "fallback" | "council";
  strengths: string[];
  risks: string[];
  consequences: string;
  quotes: Quote[];
  shadowNotes: ShadowNote[];
  trace: string[];
  note?: string;
};
