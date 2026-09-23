import { CHEAP, EXAMPLE } from "./canon";
import { simulate } from "./simulate";

function line(label: string, choices: Parameters<typeof simulate>[0]) {
  const result = simulate(choices);
  const synergy = result.synergies.map((item) => item.id).join(", ") || "нет";
  console.log(
    `${label}: Score ${result.score.toFixed(2)} | средний ${result.mean.toFixed(2)} | пол ${result.floor.toFixed(2)} (${result.floorDistrictId}) | крит ${result.nCrit} | резерв ${result.reserve} | синергии ${synergy}`,
  );
}

line("База", []);
line("Пример", EXAMPLE);
line("Дешёвый", CHEAP);
