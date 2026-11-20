// the objects placed in a custom level (where crash starts, where the level
// ends, boxes), from the objects.json in its level source. it's read with the
// editor's parseObjects (src/objects.ts), so the editor and the build agree
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { objectName } from "../src/objectNames";
import { switchlessOutlines } from "../src/switchWarnings";
import { BOX_TYPES, objectType, parseObjects, type LevelObject } from "../src/objects";
import { IRON_OUTLINE, PLAIN_OUTLINE } from "./entities";
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

// the game's own outline boxes: a plain box's and an iron box's, by the subtype they fill in as
const OUTLINE_SUBTYPES = new Map<number, number>([[BOX_TYPES.basic, PLAIN_OUTLINE], [BOX_TYPES.iron, IRON_OUTLINE]]);

// the second init flag that hides any other box until its switch is hit (road to nowhere's life boxes'): seen in
// the game, its bit 1 hides it (the game has no outline of it), and 2, 4, 8, 16 or 32 alone don't
const OUTLINE_INIT_FLAG_B = 3;

// a box's subtype number as its type name or the number it was given has it
function ownSubtype(object: LevelObject): number {
  const box = object.box!;
  return typeof box === "number" ? box : BOX_TYPES[box];
}

// whether the game has an outline box of the box's own type
const hasOutlineSubtype = (object: LevelObject) => OUTLINE_SUBTYPES.has(ownSubtype(object));

// a box's subtype number: its own, or for an outline the game's outline of it, if it has one
export function boxSubtype(object: LevelObject): number {
  const own = ownSubtype(object);
  if (object.outline === undefined) {
    return own;
  }
  return OUTLINE_SUBTYPES.get(own) ?? own;
}

// a box's second init flag: OUTLINE_INIT_FLAG_B for an outline the game has no outline box of, else 0
export function boxInitFlagB(object: LevelObject): number {
  if (object.outline === undefined || hasOutlineSubtype(object)) {
    return 0;
  }
  return OUTLINE_INIT_FLAG_B;
}

// what makes two objects duplicates: the same kind and type, in the same
// spot, raised the same (a copied switch's own number doesn't count)
const duplicateKey = (object: LevelObject) =>
  JSON.stringify([object.kind, object.box, objectType(object), object.at, object.raise]);

// what an object is called in a warning or an error: its palette name, with "box" after a box's type
function messageName(object: LevelObject): string {
  if (object.kind === "box") {
    return `${objectName(object)} box`;
  }
  return objectName(object);
}

// a warning for each object that's a duplicate of one before it (numbered
// from 1, as in objects.json), most likely pasted and not moved
export function duplicateWarnings(objects: LevelObject[]): string[] {
  const firstNumbers = new Map<string, number>();
  const warnings: string[] = [];
  objects.forEach((object, index) => {
    const key = duplicateKey(object);
    const first = firstNumbers.get(key);
    if (first === undefined) {
      firstNumbers.set(key, index + 1);
      return;
    }
    warnings.push(`warning: object ${index + 1} (${messageName(object)}) is a duplicate of object ${first}, in the same spot`);
  });
  return warnings;
}

// an error naming the first outline (numbered from 1, as in objects.json)
// whose switch isn't in the level, as its box could never be gotten
export function checkOutlinesHaveSwitches(objects: LevelObject[]): void {
  const [index] = switchlessOutlines(objects);
  if (index === undefined) {
    return;
  }
  const outline = objects[index];
  const switchNumber = outline.outline;
  throw new Error(`object ${index + 1} (${messageName(outline)}) is an outline of switch ${switchNumber}, but the level has no switch ${switchNumber}`);
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
