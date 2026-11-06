// how the editor styles objects in the viewport: boxes coloured like the game's, by type, and enemies
import { boxTypeName, type BoxType, type EnemyType, type LevelObject } from "./objects";

export interface BoxStyle {
  colour: string;
  wireframe: boolean; // drawn as its edges (outline boxes, iron ones too, until a switch fills them in)
}

const COLOURS: Record<BoxType, string> = {
  basic: "#b5651d",
  arrow: "#e0a040",
  checkpoint: "#4f8fe0",
  iron: "#9aa0a6",
  slatted: "#7b5a3c",
  switch: "#e05050",
  life: "#ff7a3d",
  aku_aku: "#c040c0",
  question: "#f2d230",
  outline: "#64b5f6",
  tnt: "#d81b1b",
  enemy_tnt: "#7f1d1d",
  iron_arrow: "#c8cdd2",
  iron_outline: "#b0bec5",
};

const WIREFRAMES: BoxType[] = ["outline", "iron_outline"];

export const ENEMY_COLOURS: Record<EnemyType, string> = {
  plant: "#3fa34d",
  rolling_stone: "#8d8a5f",
  crab: "#f06a3c",
  turtle: "#2aa198",
};

export const SPAWN_COLOUR = "#ff9a1f";
export const END_COLOUR = "#7c4dff";
export const SELECTED_COLOUR = "#ffffff";
export const WARNING_COLOUR = "#ff3b30";

export function boxStyle(box: NonNullable<LevelObject["box"]>): BoxStyle {
  const type = boxTypeName(box);
  return { colour: COLOURS[type], wireframe: WIREFRAMES.includes(type) };
}
