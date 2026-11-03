// entities (zone_entity in src/formats/zdat.h): parent zone, spawn flags,
// group, id, point count, 3 init flags, type, subtype, then the points, in
// units of 4 zone units relative to the zone
import { BOX_TYPES } from "../src/objects";
import type { Vec3 } from "./vectors";

const ENTITY_ID = 8;
export const ENTITY_INIT_FLAGS = 12; // init_flags_a, _b, _c (int16 each)
const ENTITY_TYPE = 18;
const ENTITY_POINTS = 20;
export const ENTITY_IDS_MAX = 303;  // ids index spawns[GOOL_SPAWN_COUNT] in src/gool.c
const ENTITY_MAIN_IDS = [1, 2, 3, 4]; // ids that make the main object (crash): GoolObjectSpawn in src/gool.c

export const CRASH: [number, number] = [0, 0];
export const WARP_PAD: [number, number] = [32, 1]; // WarpC: the warp pad that ends a level, as on n. sanity beach
export const BOX_TYPE = 34;      // BoxsC: boxes, by subtype
export const BOX_HEIGHT = 400;   // a box on top of another is this much higher (GoolObjectSpawn in src/gool.c)
export const UNBREAKABLE_BOXES: number[] = [BOX_TYPES.iron, BOX_TYPES.switch]; // not in the level's total

// a switch (! box) makes the outline boxes solid along a chain of ids in their
// entities' init_flags_c: the switch's is the first outline box's id, each
// outline box's the next one's, and the last's 0. the first is marked 12 in its
// init_flags_b, the rest 4 (as on n. sanity beach)
const OUTLINE_FIRST = 12;
const OUTLINE_REST = 4;

// an entity's type (its exec map slot) and subtype
export const entityType = (item: Buffer): [number, number] => [item[ENTITY_TYPE], item[ENTITY_TYPE + 1]];

export const entityId = (item: Buffer) => item.readUInt16LE(ENTITY_ID);

function withField(item: Buffer, write: (copy: Buffer) => void): Buffer {
  const copy = Buffer.from(item);
  write(copy);
  return copy;
}

export const withEntityId = (item: Buffer, id: number) => withField(item, (copy) => copy.writeUInt16LE(id, ENTITY_ID));
export const withSubtype = (item: Buffer, subtype: number) => withField(item, (copy) => { copy[ENTITY_TYPE + 1] = subtype; });

// the entity with its first point at (x, y, z), zone units relative to its zone
export function withPosition(item: Buffer, [x, y, z]: Vec3): Buffer {
  return withField(item, (copy) => {
    [x, y, z].forEach((coordinate, axis) => copy.writeInt16LE(Math.floor(coordinate / 4), ENTITY_POINTS + 2 * axis));
  });
}

// where an entity's first point is, zone units relative to its zone
export function entityPosition(item: Buffer): Vec3 {
  return [0, 1, 2].map((axis) => 4 * item.readInt16LE(ENTITY_POINTS + 2 * axis)) as Vec3;
}

const withInitFlagB = (item: Buffer, value: number) => withField(item, (copy) => copy.writeInt16LE(value, ENTITY_INIT_FLAGS + 2));
const withInitFlagC = (item: Buffer, value: number) => withField(item, (copy) => copy.writeInt16LE(value, ENTITY_INIT_FLAGS + 4));

// count ids for new entities, from the lowest up: not taken, nor the main object's, and at most ENTITY_IDS_MAX
export function newEntityIds(count: number, taken: Set<number>): number[] {
  const free = [];
  for (let id = 1; id <= ENTITY_IDS_MAX; id++) {
    if (!ENTITY_MAIN_IDS.includes(id) && !taken.has(id)) {
      free.push(id);
    }
  }
  if (free.length < count) {
    throw new Error(`${count + taken.size} objects, more than the game can have in a level (${free.length + taken.size})`);
  }
  return free.slice(0, count);
}

// a box placed in a level: its subtype, the zone it's in, its index in the zone's entities, and its id
export interface PlacedBox {
  subtype: number;
  zone: number;
  index: number;
  id: number;
}

// chains the outline boxes and points every switch at the first, so any
// switch makes them all solid; in place, in entities (a list per zone)
export function linkSwitches(entities: Buffer[][], placedBoxes: PlacedBox[]): void {
  const outlines = placedBoxes.filter((box) => box.subtype === BOX_TYPES.outline);
  const switches = placedBoxes.filter((box) => box.subtype === BOX_TYPES.switch);
  const firstOutline = outlines.length ? outlines[0].id : 0;
  for (const { zone, index } of switches) {
    entities[zone][index] = withInitFlagC(entities[zone][index], firstOutline);
  }
  outlines.forEach(({ zone, index }, place) => {
    const nextOutline = place + 1 < outlines.length ? outlines[place + 1].id : 0;
    const chained = withInitFlagC(entities[zone][index], nextOutline);
    entities[zone][index] = withInitFlagB(chained, place ? OUTLINE_REST : OUTLINE_FIRST);
  });
}
