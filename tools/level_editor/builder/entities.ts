// entities (zone_entity in src/formats/zdat.h): parent zone, spawn flags,
// group, id, point count, 3 init flags, type, subtype, then the points, in
// units of 4 zone units relative to the zone
import { BOX_TYPES, type EnemyType } from "../src/objects";
import { padTo4 } from "./bytes";
import type { Vec3 } from "./vectors";

const ENTITY_ID = 8;
const ENTITY_PATH_LENGTH = 10;
export const ENTITY_INIT_FLAGS = 12; // init_flags_a, _b, _c (int16 each)
const ENTITY_TYPE = 18;
const ENTITY_POINTS = 20;
const POINT_BYTES = 6; // x, y, z (int16 each), in units of 4 zone units
export const ENTITY_IDS_MAX = 303;  // ids index spawns[GOOL_SPAWN_COUNT] in src/gool.c
const ENTITY_MAIN_IDS = [1, 2, 3, 4]; // ids that make the main object (crash): GoolObjectSpawn in src/gool.c

export const CRASH: [number, number] = [0, 0];
export const WARP_PAD: [number, number] = [32, 1]; // WarpC: the warp pad that ends a level, as on n. sanity beach
export const BOX_TYPE = 34;      // BoxsC: boxes, by subtype
export const BOX_HEIGHT = 400;   // a box on top of another is this much higher (GoolObjectSpawn in src/gool.c)
// each enemy's entity type (its exec map slot) and subtype: the plant PlanC (subtype
// 1 the hidden plant, as in temple ruins, coming up out of the ground when crash
// comes near), the
// rolling stone JunOC, the crab CrabC, the turtle TurtC, the native SheNC, and
// the badger PillC (an invisible spawner that sends badgers along its path), the
// warthog WartC, and the spiders SpidC: subtype 1 drops from its thread, subtype
// 3 is an invisible spawner, like the badger's, that sends spiders along its path,
// the monkey MonkC, and up the creek's river objects RivOC: subtypes 6 and 7 its
// biting plants with blue and green leaves, subtype 5 its leaping fish, and
// temple ruins' ruins objects RuiOC: subtype 9 a bat roost, which sends out bats
// (subtype 11) along its path, and sunset vista's: subtype 12 a bat roost that
// sends them whether crash is near or not, stopped by killing its two leader
// bats (subtype 14), and the lost city's lizards LizaC: subtype 1 green, leaping
// back and forth along its path, subtype 2 red, hopping along it after crash,
// and stormy ascent's lab assistant LabAC subtype 0, throwing vials across the map
export const ENEMY_ENTITIES: Record<EnemyType, [number, number]> = {
  plant: [25, 0], hidden_plant: [25, 1], rolling_stone: [22, 6], crab: [31, 0], turtle: [19, 0], native: [38, 0], badger: [35, 0], warthog: [7, 1],
  spider: [43, 1], walking_spider: [43, 3], monkey: [1, 2],
  blue_river_plant: [28, 6], green_river_plant: [28, 7], fish: [28, 5], bat: [42, 9], leader_bats: [42, 12], lizard: [47, 1], red_lizard: [47, 2], lab_assistant: [54, 0],
};
// sunset vista's leader bat (RuiOC subtype 14): two hover where a leader bats
// roost's bats come in and go out, and killing both stops it; its first init
// flag is its roost's entity id
export const LEADER_BAT: [number, number] = [42, 14];
// not in the level's total (an iron outline fills in as an iron box)
// a rolling stone's first init flag is where in its cycle along its path and
// back it starts (its script's, seen in the game): 0 at its first point rolling
// forward, this at its last, twice this back at its first. a stone starts
// elsewhere this way, not by turning its path round, which spins it backwards
export const STONE_FAR_END = 128;

// a rolling stone's first init flag for starting start of the way along its path
// (0 to 1), rolling forward, or back towards its first point if reverse
export function stoneStartFlag(start: number, reverse: boolean): number {
  const along = Math.round(STONE_FAR_END * start);
  return reverse ? (2 * STONE_FAR_END - along) % (2 * STONE_FAR_END) : along;
}

export const UNBREAKABLE_BOXES: number[] = [BOX_TYPES.iron, BOX_TYPES.switch, BOX_TYPES.iron_arrow, BOX_TYPES.iron_outline];

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

// all of an entity's points: where it moves along (an enemy) or each place it is, zone units relative to its zone
export function entityPath(item: Buffer): Vec3[] {
  return Array.from({ length: item.readUInt16LE(ENTITY_PATH_LENGTH) }, (_, index) =>
    [0, 1, 2].map((axis) => 4 * item.readInt16LE(ENTITY_POINTS + index * POINT_BYTES + 2 * axis)) as Vec3);
}

// the entity with points (zone units relative to its zone) as its path, in place of its own
export function withPath(item: Buffer, points: Vec3[]): Buffer {
  const header = Buffer.from(item.subarray(0, ENTITY_POINTS));
  header.writeUInt16LE(points.length, ENTITY_PATH_LENGTH);
  const body = Buffer.alloc(points.length * POINT_BYTES);
  points.forEach((point, index) => point.forEach((coordinate, axis) =>
    body.writeInt16LE(Math.floor(coordinate / 4), index * POINT_BYTES + 2 * axis)));
  return padTo4(Buffer.concat([header, body]));
}

// the entity with its whole path moved so that it starts at at (zone units
// relative to its zone), its shape kept, or mirrored along x with xWay -1,
// such as a fish's leap
export function withPathFrom(item: Buffer, at: Vec3, xWay = 1): Buffer {
  const path = entityPath(item);
  const ways: Vec3 = [xWay, 1, 1];
  return withPath(item, path.map((point) => point.map((value, axis) => at[axis] + ways[axis] * (value - path[0][axis])) as Vec3));
}

// a box's first init flag is what it holds beyond the usual (a token, say); 0 for nothing
export const withInitFlagA = (item: Buffer, value: number) => withField(item, (copy) => copy.writeInt16LE(value, ENTITY_INIT_FLAGS));
export const withInitFlagB = (item: Buffer, value: number) => withField(item, (copy) => copy.writeInt16LE(value, ENTITY_INIT_FLAGS + 2));
export const withInitFlagC = (item: Buffer, value: number) => withField(item, (copy) => copy.writeInt16LE(value, ENTITY_INIT_FLAGS + 4));

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

const OUTLINES: number[] = [BOX_TYPES.outline, BOX_TYPES.iron_outline]; // what a switch fills in

// chains the outline boxes (iron ones too, in the order they're placed, as in
// generator room) and points every switch at the first, so any switch makes
// them all solid; in place, in entities (a list per zone)
export function linkSwitches(entities: Buffer[][], placedBoxes: PlacedBox[]): void {
  const outlines = placedBoxes.filter((box) => OUTLINES.includes(box.subtype));
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
