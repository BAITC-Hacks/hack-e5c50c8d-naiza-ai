import { z } from "zod";

export const observationSchema = z.object({
  observations: z
    .array(
      z.object({
        claim: z.string().min(8),
        evidenceIds: z.array(z.string()).min(1),
      }),
    )
    .length(2),
});

export const quotesSchema = z.object({
  quotes: z
    .array(
      z.object({
        districtId: z.string(),
        persona: z.string(),
        line: z.string().min(8),
      }),
    )
    .length(3),
});

export const secretarySchema = z.object({
  strengths: z.array(z.string().min(8)).length(3),
  risks: z.array(z.string().min(8)).length(3),
  consequences: z.string().min(40),
  shadowNotes: z.array(z.object({ neighborId: z.string(), text: z.string().min(4) })).max(4),
});

export type Observation = z.infer<typeof observationSchema>;
export type Quotes = z.infer<typeof quotesSchema>;
export type Secretary = z.infer<typeof secretarySchema>;
