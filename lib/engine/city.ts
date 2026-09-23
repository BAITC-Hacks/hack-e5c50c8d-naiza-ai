import raw from "../../data/city.json";
import { INDICATORS, type City, type Indicator, type MeasureDef } from "./types";

export const city = raw as City;

export function measureById(id: string, source: City = city): MeasureDef | undefined {
  return source.measures.find((item) => item.id === id);
}

export function districtById(id: string, source: City = city) {
  return source.districts.find((item) => item.id === id);
}

export function personaFor(districtId: string, source: City = city) {
  return source.personas.find((item) => item.districtId === districtId);
}

export function directionTitle(id: string, source: City = city) {
  return source.directions.find((item) => item.id === id)?.title ?? id;
}

export function indicatorTitle(id: Indicator, source: City = city) {
  return source.indicators.find((item) => item.id === id)?.title ?? id;
}

export function assertCity(source: City = city) {
  if (source.districts.length !== 5) throw new Error("В городе 5 районов");
  if (source.measures.length !== 14) throw new Error("В каталоге 14 мер");
  if (source.indicators.length !== 10) throw new Error("Показателей 10");
  const population = source.districts.reduce((sum, item) => sum + item.population, 0);
  if (Math.abs(population - 1) > 1e-9) throw new Error("Доли населения должны давать 1");
  const weights = INDICATORS.reduce((sum, key) => sum + source.weights[key], 0);
  if (Math.abs(weights - 1) > 1e-9) throw new Error("Веса должны давать 1");
  if (source.budget !== 100) throw new Error("Бюджет 100");
  if (source.horizon !== 8) throw new Error("Горизонт 8 кварталов");
}
