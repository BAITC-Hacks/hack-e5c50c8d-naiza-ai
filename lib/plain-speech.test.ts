import { describe, expect, it } from "vitest";
import { describeSnapshot, stripCode } from "./plain-speech";

describe("ответ без кода", () => {
  it("убирает блоки кода и оставляет фразы", () => {
    const clean = stripCode("Балл вырос.\n```ts\nconst score = 56;\n```\nНура всё ещё слабый район.");
    expect(clean).toContain("Балл вырос");
    expect(clean).toContain("Нура");
    expect(clean).not.toContain("const");
    expect(clean).not.toContain("```");
  });

  it("описывает набор словами, без JSON", () => {
    const text = describeSnapshot({ team: "Берег", chosen: 2, score: null }, "ru");
    expect(text).toContain("2 из 5");
    expect(text).not.toContain("{");
  });
});
