// the objects placed in a custom level (where crash starts, where the level
// ends, boxes), from the objects.json in its level source. it's read with the
// editor's parseObjects (src/objects.ts), so the editor and the build agree
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BOX_TYPES, parseObjects, type LevelObject } from "../src/objects";
import { turned } from "./obj";
import type { Vec3 } from "./vectors";

export const OBJECTS_JSON = "objects.json";

// where at (a position in blender: x, y, z with z up, in metres) is in the
// level (zone units, (x, y up, z)), as a vertex there in the .obj is: the .obj
// has blender's (x, z, -y), which readObj scales and turns by turn degrees and
// fit moves by offset
export function toZone(at: Vec3, scale: number, turn: number, offset: Vec3): Vec3 {
  const [x, z] = turned(at[0] * scale, -at[1] * scale, turn);
  const y = at[2] * scale;
  return [x - offset[0], y - offset[1], z - offset[2]];
}

// a box's subtype number, from its type name or the number it was given
export function boxSubtype(object: LevelObject): number {
  const box = object.box!;
  return typeof box === "number" ? box : BOX_TYPES[box];
}

// the objects the objects.json in folder places (none without one); a bad one is an error naming it
export function readObjectsFile(folder: string): LevelObject[] {
  const path = join(folder, OBJECTS_JSON);
  if (!existsSync(path)) {
    return [];
  }
  try {
    return parseObjects(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${path}: ${error instanceof Error ? error.message : error}`);
  }
}
