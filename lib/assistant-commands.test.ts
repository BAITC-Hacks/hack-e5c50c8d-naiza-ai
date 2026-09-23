import { describe, expect, it } from "vitest";
import { interpret } from "./assistant-commands";

describe("команды помощника", () => {
  it("узнаёт язык и оформление", () => {
    expect(interpret("переключи на қазақша")).toEqual({ lang: "kk" });
    expect(interpret("please use english")).toEqual({ lang: "en" });
    expect(interpret("ночная тема")).toEqual({ theme: "night" });
    expect(interpret("english and night theme")).toEqual({ lang: "en", theme: "night" });
    expect(interpret("какой балл у Нуры")).toBeNull();
  });
});
