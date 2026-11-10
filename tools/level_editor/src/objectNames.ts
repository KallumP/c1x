// the names the palette shows for the things to place: what each is, rather
// than its type in objects.json (the cobra is a "snake" there, a bat roost a "bat")
import type { Placeable } from "./editor";

const NAMES: Partial<Record<Placeable, string>> = {
  // boxes
  question: "Question mark",
  life: "Extra life",
  aku_aku: "Aku Aku",
  tnt: "TNT",
  enemy_tnt: "Enemy TNT",
  switch: "Switch (!)",
  // enemies
  plant: "Biting plant",
  spider: "Hanging spider",
  snake: "Cobra",
  fish: "Leaping fish",
  lizard: "Green lizard",
  bat: "Bat roost",
};

// a type's id in words, capitalised: blue_river_plant is "Blue river plant"
function idInWords(what: string): string {
  const words = what.split("_").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// the name a thing to place is shown by
export function placeableName(what: Placeable): string {
  return NAMES[what] ?? idInWords(what);
}

// things to place in alphabetical order of their names
export function placeablesByName<T extends Placeable>(things: T[]): T[] {
  return [...things].sort((first, second) => placeableName(first).localeCompare(placeableName(second)));
}
