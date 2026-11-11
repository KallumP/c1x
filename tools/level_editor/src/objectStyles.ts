// how the editor styles objects in the viewport: boxes coloured like the game's, by type, and enemies
import { boxTypeName, type BoxType, type EnemyType, type LevelObject, type ObstacleType } from "./objects";

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
  snake: "#3d6fc4",
  crab: "#f06a3c",
  turtle: "#2aa198",
  native: "#c98a3b",
  badger: "#9a8fb0",
  warthog: "#8a5a44",
  spider: "#6b3fa0",
  walking_spider: "#a0407a",
  monkey: "#c0763a",
  blue_river_plant: "#4a7fa0",
  green_river_plant: "#6fae2e",
  fish: "#3a6fc0",
  bat: "#5b4a6e",
  leader_bats: "#8a3b5e",
  lizard: "#7fa83a",
  red_lizard: "#b8433a",
  walking_lizard: "#5f7a2a",
  robot_dog: "#7a7f8c",
  barrel_roller: "#9a6b2e",
  camera_robot: "#8c8f99",
  bird: "#7a5230",
  electric_scientist: "#3ad0d8",
  gunman: "#4a4458",
  blob: "#d9c23a",
  flying_camera: "#6f7564",
  lab_assistant: "#c9ccd6",
};

export const OBSTACLE_COLOURS: Record<ObstacleType, string> = {
  lily_pad: "#2f6b2a",
  leaf: "#2e7a2c",
  wooden_peg: "#8a5a32",
  rolling_stone: "#8d8a5f",
  mossy_slide: "#5f7a3a",
  rising_spiked_log: "#7a5530",
  falling_spiked_log: "#6a4a2a",
  fire_pit: "#b8321e",
  dropping_pillar: "#4f6b3a",
  sliding_pillar: "#5a7a44",
};

export const SPAWN_COLOUR = "#ff9a1f";
export const END_COLOUR = "#7c4dff";
export const SELECTED_COLOUR = "#ffffff";
export const WARNING_COLOUR = "#ff3b30";

export function boxStyle(box: NonNullable<LevelObject["box"]>): BoxStyle {
  const type = boxTypeName(box);
  return { colour: COLOURS[type], wireframe: WIREFRAMES.includes(type) };
}
