// the names the palette shows for the things to place: what each is, rather
// than its type in objects.json (the cobra is a "snake" there, a bat roost a
// "bat"). a variant of a thing is named the thing, then which in brackets, so
// variants sit together in the list: "Lizard (green)", "Lizard (red)"
import type { Placeable } from "./editor";

const NAMES: Partial<Record<Placeable, string>> = {
  // boxes
  question: "Question mark",
  life: "Extra life",
  aku_aku: "Aku Aku",
  iron_arrow: "Iron (arrow)",
  iron_outline: "Iron (outline)",
  tnt: "TNT",
  switch: "Switch (!)",
  // enemies
  plant: "Biting plant",
  snake: "Cobra",
  fish: "Leaping fish",
  lizard: "Lizard (green)",
  red_lizard: "Lizard (red)",
  walking_lizard: "Lizard (walking)",
  blue_river_plant: "River plant (blue)",
  green_river_plant: "River plant (green)",
  spider: "Spider (hanging)",
  walking_spider: "Spider (walking)",
  bat: "Bats (roost)",
  leader_bats: "Bats (leaders)",
  electric_scientist: "Lab assistant (electric)",
  // obstacles
  leaf: "Floating leaf",
  wooden_peg: "Wood platform (spinnable)",
  mossy_slide: "Slippery slope",
  rising_spiked_log: "Spiked log (rising)",
  falling_spiked_log: "Spiked log (falling)",
  fire_pit: "Fire pit",
  dropping_pillar: "Pillar (drops)",
  sliding_pillar: "Pillar (slides)",
  tall_thin_gate: "Gate (tall, thin)",
  low_wide_gate: "Gate (low, wide)",
  pushing_block: "Block (pushes out)",
  pushing_platform: "Platform (interval, long)",
  short_pushing_platform: "Platform (interval, short)",
  rotating_pots: "Pots (rotating)",
  rotating_platforms: "Platforms (rotating)",
  slamming_walls: "Walls (slamming)",
  rising_pillar: "Pillar (rises)",
  carrying_platform: "Platform (moves on touch)",
  bounce_pad: "Bounce pad",
  steam_vent: "Steam vent",
  moving_platform: "Platform (moves along a path)",
  dropping_platform: "Platform (retracts when stood on)",
  falling_platform: "Platform (falls when stood on)",
  seesaw: "Seesaw",
  timed_plank: "Plank (breaks after a moment)",
  breaking_plank: "Plank (breaks at once)",
  rotating_pegs: "Pegs (rotating)",
  lift_platform: "Platform (lifts up and down)",
  floor_fire: "Fire (bursts from the floor)",
  steady_fire: "Fire (always burning)",
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
