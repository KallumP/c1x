// how the editor styles objects in the viewport: boxes coloured like the game's, by type
import { BOX_TYPES, type BoxType, type LevelObject } from "./objects";

export interface BoxStyle {
  colour: string;
  wireframe: boolean; // drawn as its edges (outline boxes, until a switch fills them in)
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
};

export const SPAWN_COLOUR = "#ff9a1f";
export const END_COLOUR = "#7c4dff";
export const SELECTED_COLOUR = "#ffffff";
export const WARNING_COLOUR = "#ff3b30";

export function boxTypeName(box: NonNullable<LevelObject["box"]>): BoxType {
  if (typeof box === "string") return box;
  return (Object.keys(BOX_TYPES) as BoxType[]).find((t) => BOX_TYPES[t] === box)!;
}

export function boxStyle(box: NonNullable<LevelObject["box"]>): BoxStyle {
  const type = boxTypeName(box);
  return { colour: COLOURS[type], wireframe: type === "outline" };
}
