// objects custom levels take from a real level other than the base level (their
// donor), such as an enemy jungle rollers doesn't have: its code and what that
// uses there (models, animations, sounds and texture pages), and any object it spawns
import type { EnemyType, LevelObject } from "../src/objects";
import { packEntries, rawPagesById, reachableEids } from "./cutLevel";
import { withEndCaps } from "./endCaps";
import { ENEMY_ENTITIES, MOVED_ENEMY_CODE } from "./entities";
import { EID_NONE, eidToString, stringToEid } from "./entryIds";
import { ENTRY_GOOL, entriesById, PAGE_ENTRIES, PAGE_SOUNDS, PAGE_TEXTURE, soundPage, type Entry, type Level, type Page } from "./levelFiles";
import { entryBytes } from "./levelWriting";

// a real level an enemy is taken from: its id, name, and its files in streams/
export interface DonorLevel {
  lid: number;
  name: string;
  file: string;
}

const N_SANITY_BEACH: DonorLevel = { lid: 0x9, name: "N. Sanity Beach", file: "s0000009" };
const THE_GREAT_GATE: DonorLevel = { lid: 0x12, name: "The Great Gate", file: "s0000012" };
const ROAD_TO_NOWHERE: DonorLevel = { lid: 0x14, name: "Road to Nowhere", file: "s0000014" };
const FUMBLING_IN_THE_DARK: DonorLevel = { lid: 0x2a, name: "Fumbling in the Dark", file: "s000002a" };
const UP_THE_CREEK: DonorLevel = { lid: 0x18, name: "Up the Creek", file: "s0000018" };
// its code is temple ruins' too, but its copy reaches only its bats and leader
// bats, so it brings two texture pages where temple ruins' brings three
const SUNSET_VISTA: DonorLevel = { lid: 0x23, name: "Sunset Vista", file: "s0000023" };
const THE_LOST_CITY: DonorLevel = { lid: 0x20, name: "The Lost City", file: "s0000020" };
// its lab assistants' code differs from the lab's, whose walkers spawn an object
// (by exec slot 9) that crashes a custom level
const STORMY_ASCENT: DonorLevel = { lid: 0x22, name: "Stormy Ascent", file: "s0000022" };
const TEMPLE_RUINS: DonorLevel = { lid: 0x1c, name: "Temple Ruins", file: "s000001c" };
// its robot dogs' code is PoRoC, as the lab's walkers' child object is, but not the same
const HEAVY_MACHINERY: DonorLevel = { lid: 0x6, name: "Heavy Machinery", file: "s0000006" };
const TOXIC_WASTE: DonorLevel = { lid: 0x7, name: "Toxic Waste", file: "s0000007" };
const CORTEX_POWER: DonorLevel = { lid: 0x3, name: "Cortex Power", file: "s0000003" };
const CASTLE_MACHINERY: DonorLevel = { lid: 0x37, name: "Castle Machinery", file: "s0000037" };
const SLIPPERY_CLIMB: DonorLevel = { lid: 0x2e, name: "Slippery Climb", file: "s000002e" };
const THE_LAB: DonorLevel = { lid: 0x29, name: "The Lab", file: "s0000029" };

// the level each enemy jungle rollers doesn't have is taken from
export const ENEMY_DONORS: Partial<Record<EnemyType, DonorLevel>> = {
  crab: N_SANITY_BEACH,
  turtle: N_SANITY_BEACH,
  native: THE_GREAT_GATE,
  monkey: THE_GREAT_GATE,
  warthog: ROAD_TO_NOWHERE,
  spider: FUMBLING_IN_THE_DARK,
  walking_spider: FUMBLING_IN_THE_DARK,
  blue_river_plant: UP_THE_CREEK,
  green_river_plant: UP_THE_CREEK,
  fish: UP_THE_CREEK,
  bat: SUNSET_VISTA,
  leader_bats: SUNSET_VISTA,
  lizard: THE_LOST_CITY,
  red_lizard: THE_LOST_CITY,
  walking_lizard: THE_LOST_CITY,
  lab_assistant: STORMY_ASCENT,
  snake: TEMPLE_RUINS,
  robot_dog: HEAVY_MACHINERY,
  barrel_roller: TOXIC_WASTE,
  gunman: CORTEX_POWER,
  camera_robot: CASTLE_MACHINERY,
  bird: SLIPPERY_CLIMB,
  electric_scientist: THE_LAB,
};

export interface DonorObject {
  code: [slot: number, eid: number][]; // each piece of code it brings, in its exec slot in the donor
  entries: Entry[];                    // its code, models, animations and the like, from entry pages
  sounds: Entry[];                     // the sounds it plays, from the donor's sound pages
  texturePages: Page[];                // the texture pages its models use
}

// the entries of the given kind of page that are among eids
function entriesInPages(donor: Level, pageType: number, eids: Set<number>): Entry[] {
  return donor.pages.filter((page) => page.type === pageType).flatMap((page) => page.entries.filter(({ eid }) => eids.has(eid)));
}

// the exec slot of each piece of code among entries, as the donor's exec map has it
function codeSlots(donor: Level, entries: Entry[]): [number, number][] {
  const execMap = donor.nsd.ldat.execMap;
  return entries.filter((entry) => entry.type === ENTRY_GOOL)
    .map((entry): [number, number] => [execMap.indexOf(entry.eid), entry.eid])
    .filter(([slot]) => slot >= 0);
}

// the code in exec slot slot in the donor level; an error if there's none
function codeInSlot(donor: Level, slot: number): number {
  const code = donor.nsd.ldat.execMap[slot];
  if (code === undefined || code === EID_NONE || !entriesById(donor).has(code)) {
    throw new Error(`the donor level (${donor.nsd.ldat.lid.toString(16)}) has no code in exec slot ${slot}`);
  }
  return code;
}

// the object whose code is in exec slot slot in the donor level, and what it
// uses there, with the code in childSlots: objects it spawns by their exec slot
// (which its entries don't name), and what they use; but not the entries in
// leftOut, which its entries name but it never uses, nor what only they use
export function donorObject(donor: Level, slot: number, childSlots: number[] = [], leftOut: number[] = []): DonorObject {
  const used = reachableEids(donor, [slot, ...childSlots].map((codeSlot) => codeInSlot(donor, codeSlot)), new Set(leftOut));
  const entries = entriesInPages(donor, PAGE_ENTRIES, used);
  const texturePages = [...rawPagesById(donor)].filter(([eid, page]) => used.has(eid) && page.type === PAGE_TEXTURE).map(([, page]) => page);
  return { code: codeSlots(donor, entries), entries, sounds: entriesInPages(donor, PAGE_SOUNDS, used), texturePages };
}

const CODE_HEADER = 0; // a code entry's item holding its header, its exec slot (its type) first

// a code header naming exec slot slot
function headerInSlot(header: Buffer, slot: number): Buffer {
  const moved = Buffer.from(header);
  moved.writeUInt32LE(slot, 0);
  return moved;
}

// object with its code in exec slot from moved to exec slot to, named eid there
// (for code whose own slot and name a custom level's other code has, such as
// temple ruins' cobra and jungle rollers' plant, both PlanC in slot 25). an
// error if it has no code in from
export function withCodeMoved(object: DonorObject, from: number, to: number, eid: number): DonorObject {
  const code = object.code.find(([slot]) => slot === from)?.[1];
  if (code === undefined) {
    throw new Error(`the object has no code in exec slot ${from} to move`);
  }
  const moveEntry = (entry: Entry): Entry => {
    if (entry.eid !== code) {
      return entry;
    }
    return { ...entry, eid, items: entry.items.map((item, index) => (index === CODE_HEADER ? headerInSlot(item, to) : item)) };
  };
  return {
    ...object,
    code: object.code.map(([slot, codeEid]): [number, number] => (slot === from ? [to, eid] : [slot, codeEid])),
    entries: object.entries.map(moveEntry),
  };
}

// what each eid in the level holds, to tell an entry already there from a clashing one
function levelContents(level: Level): Map<number, Buffer> {
  const contents = new Map<number, Buffer>();
  for (const page of level.pages) {
    if (page.type === PAGE_TEXTURE) {
      contents.set(page.eid, page.data);
    }
    page.entries.forEach((entry) => contents.set(entry.eid, entryBytes(entry)));
  }
  return contents;
}

// whether an eid holding contents is new to the level (and so now there); false
// if the level has it already, the same. an error if the level's is different
function isNewTo(present: Map<number, Buffer>, eid: number, contents: Buffer): boolean {
  const there = present.get(eid);
  if (there && !there.equals(contents)) {
    throw new Error(`${eidToString(eid)}, from another level, is different from the ${eidToString(eid)} the level already has`);
  }
  present.set(eid, contents);
  return !there;
}

// the exec map with each object's code in its slot. a slot already holding other code is an error
function execMapWith(execMap: number[], donors: DonorObject[]): number[] {
  const withCode = [...execMap];
  for (const [slot, eid] of donors.flatMap((donor) => donor.code)) {
    if (withCode[slot] !== EID_NONE && withCode[slot] !== eid) {
      throw new Error(`exec slot ${slot} holds ${eidToString(withCode[slot])}, so ${eidToString(eid)} from another level can't go there`);
    }
    withCode[slot] = eid;
  }
  return withCode;
}

// a copy of level with the objects from other levels added: their entries packed
// into entry pages, their sounds into sound pages of their own, their texture
// pages, and their code in its exec slots. what the level already has the same isn't added again
export function withDonorObjects(level: Level, donors: DonorObject[]): Level {
  const present = levelContents(level);
  const newEntries = (pick: (donor: DonorObject) => Entry[]) =>
    donors.flatMap(pick).filter((entry) => isNewTo(present, entry.eid, entryBytes(entry)));
  const entries = newEntries((donor) => donor.entries);
  const sounds = newEntries((donor) => donor.sounds);
  const texturePages = donors.flatMap((donor) => donor.texturePages).filter((page) => isNewTo(present, page.eid, page.data));
  const ldat = { ...level.nsd.ldat, execMap: execMapWith(level.nsd.ldat.execMap, donors) };
  return {
    nsd: { ...level.nsd, ldat },
    pages: [...level.pages, ...packEntries(entries), ...packEntries(sounds, soundPage), ...texturePages],
  };
}

const enemyName = (type: EnemyType) => type.replace("_", " ");

function readDonorLevel(type: EnemyType, donor: DonorLevel, readOtherLevel?: (lid: number) => Level): Level {
  const what = `${donor.name} (${donor.file}.nsd)`;
  if (!readOtherLevel) {
    throw new Error(`the level's ${enemyName(type)}s come from ${what}, but there are no other levels to read`);
  }
  try {
    return readOtherLevel(donor.lid);
  } catch (error) {
    throw new Error(`${what} couldn't be read, and the level's ${enemyName(type)}s come from it: ${error instanceof Error ? error.message : error}`);
  }
}

// the level each kind of enemy among objects is taken from, read with
// readOtherLevel, for the kinds that come from another level. a level two kinds
// come from (such as fumbling in the dark's two spiders) is read once
export function enemyDonorLevels(objects: LevelObject[], readOtherLevel?: (lid: number) => Level): Map<EnemyType, Level> {
  const levels = new Map<EnemyType, Level>();
  const read = new Map<number, Level>();
  for (const type of new Set(objects.flatMap((object) => (object.kind === "enemy" && object.enemy ? [object.enemy] : [])))) {
    const donor = ENEMY_DONORS[type];
    if (!donor) {
      continue;
    }
    if (!read.has(donor.lid)) {
      read.set(donor.lid, readDonorLevel(type, donor, readOtherLevel));
    }
    levels.set(type, read.get(donor.lid)!);
  }
  return levels;
}

// one instruction of an object's code changed: its index in the code, what it
// is in the donor level, and what it becomes
interface CodePatch {
  at: number;
  was: number;
  now: number;
}

const CODE_ITEM = 1; // a code entry's item holding its instructions

// the great gate's natives start at the end of their path nearest crash, and
// walk back to the end nearest him when he leaves. these make both their
// path's first node, so its order decides where they stand: each branch on
// which end is nearer (BEQZ) becomes one always taken (BRA) that drops the comparison
const NATIVE_CODE_PATCHES: CodePatch[] = [
  { at: 0x19, was: 0x8227c002, now: 0x82094400 }, // where it starts: on to its first node
  { at: 0x2d, was: 0x8227c003, now: 0x82094403 }, // where it walks back to: past setting its last node
];

// up the creek's green river plant (RivOC subtype 7), landed on, bites once
// crash isn't going up and has come back down within 400 of its height. off
// it onto anything higher (such as a box), it wouldn't bite until he came back
// down, so that check always passes: it bites 20 frames after he landed on it,
// once he isn't going up, wherever he is. RivOC is all three river enemies'
// code, so each has the same patch (their copies of it have to be the same)
const RIVER_CODE_PATCHES: CodePatch[] = [
  { at: 0x47, was: 0x09e1fd49, now: 0x06e1f801 }, // SLT pop(), player[0x84] becomes ORL pop(), 0x100: always true
];

// stormy ascent's lab assistant (LabAC subtype 0, state 6) throws where its
// entity says. its setup picked a throw from its code's presets by flag c (in
// a custom level, all back along the game's x) and faced along x by its speed's
// sign; now flag a is its facing (an angle, 4096 a turn), flag b its vials'
// speed along x and c along z (each vial reads its thrower's flag c, where it
// had 0), their speed up and fuse custom levels' first preset's, and it throws
// at its code's own rate (flag a was how often)
const LAB_ASSISTANT_CODE_PATCHES: CodePatch[] = [
  { at: 0x202, was: 0x8225c003, now: 0x15016e17 }, // SHA ireg[0x58], obj[0xbc]: flag a, as written
  { at: 0x203, was: 0x15016e17, now: 0x11e1fe0c }, // MOVE pop(), obj[0x90]: its facing
  { at: 0x204, was: 0x11e1fe44, now: 0x11017e44 }, // MOVE ireg[0x5c], obj[0x170]: how often it throws, its code's default
  { at: 0x205, was: 0x82094001, now: 0x11800e45 }, // MOVE 0, obj[0x174]: its timer from 0
  { at: 0x206, was: 0x11017e44, now: 0x11e18e17 }, // MOVE obj[0xc0], obj[0xbc]: flag b, its vials' speed along x
  { at: 0x207, was: 0x15016e18, now: 0x1102be18 }, // MOVE ireg[0xac], obj[0xc0]: their speed up
  { at: 0x208, was: 0x11e1fe45, now: 0x11020e46 }, // MOVE ireg[0x80], obj[0x178]: their fuse
  { at: 0x209, was: 0x1fbe0800, now: 0x8209403f }, // BRA to 0x249, past its presets
  { at: 0x24d, was: 0x09800e17, now: 0x82094004 }, // BRA past facing along x by flag a's sign
  { at: 0x28a, was: 0x11800e13, now: 0x11d19e13 }, // MOVE creator[0xc4], obj[0xac]: a vial's speed along z
];

// cortex power's gunman (MafiC subtype 0) starts shooting once crash is nearer
// than his code's 16 m (ireg[0xc4]) and not more than 5 m past him; now he
// reads how near from his init flag c (in game units, as the game shifts it)
const GUNMAN_CODE_PATCHES: CodePatch[] = [
  { at: 0x1d, was: 0x09031e1f, now: 0x09e19e1f }, // SLT ireg[0xc4], pop() becomes SLT obj[0xc4], pop(): his flag c
];

// the code each enemy spawns by its exec slot, which its entries don't name:
// toxic waste's barrel roller throws his barrels (BaraC, slot 16)
const ENEMY_CHILD_SLOTS: Partial<Record<EnemyType, number[]>> = {
  barrel_roller: [16],
  electric_scientist: [9],
};

// the code an enemy spawns by exec slot that moves to another slot under another
// name, as an enemy's own code can (see MOVED_ENEMY_CODE): the lab's walking lab
// assistant's spark, the lab's PoRoC, as heavy machinery's (the robot dog's) has slot 9 and the name
const MOVED_CHILD_CODE: Partial<Record<EnemyType, { from: number; to: number; name: string }[]>> = {
  electric_scientist: [{ from: 9, to: 44, name: "SprkC" }],
};

// entries an enemy's entries name but its code never uses, left out: toxic
// waste's barrel roller's data names its WateC, which differs from up the
// creek's (the river enemies') in the same exec slot, so the two would clash.
// the lost city's ruins objects' code (RWaOC) names all their models, but a
// walking lizard (subtype 5) only uses its own (Ig1wG, walking Ig1wV): the rest
// would bring three more texture pages
const RUINS_OBJECT_MODELS = ["Li1w", "Rw1w", "Rw2w", "Rw3w", "Rw4w", "Rp1w", "Rp2w", "Rp3w", "Rp4w", "Rp5w", "Rp7w"];
const ENEMY_UNUSED_ENTRIES: Partial<Record<EnemyType, string[]>> = {
  barrel_roller: ["WateC"],
  walking_lizard: RUINS_OBJECT_MODELS.flatMap((model) => [`${model}G`, `${model}V`]),
};

// models that come with end caps (see endCaps.ts), and the animation whose first
// frame has their vertices: toxic waste's barrels are open tubes, as the game
// only shows them rolling straight at the camera, but custom levels' don't
const ENEMY_CAPPED_MODELS: Partial<Record<EnemyType, [model: string, animation: string][]>> = {
  barrel_roller: [["BaV7G", "BaV7V"], ["BaD7G", "BaD7V"]],
};

// object with its model named model capped at its ends, as animation's first
// frame has it (if the object has that model)
function withCappedModel(object: DonorObject, [model, animation]: [string, string]): DonorObject {
  const entryNamed = (name: string) => object.entries.find(({ eid }) => eid === stringToEid(name));
  const [modelEntry, animationEntry] = [entryNamed(model), entryNamed(animation)];
  if (!modelEntry) {
    return object;
  }
  if (!animationEntry) {
    throw new Error(`${animation} should come with ${model}, to cap its ends`);
  }
  const capped = withEndCaps(modelEntry, animationEntry.items[0]);
  return { ...object, entries: object.entries.map((entry) => (entry === modelEntry ? capped : entry)) };
}

// a branch (BRA) from instruction from to instruction to, which goes up to 512 either way
function branch(from: number, to: number): number {
  const BRA = 0x82094000;
  return (BRA | ((to - (from + 1)) & 0x3ff)) >>> 0;
}

// instructions added after the end of an enemy's code, for its patches to
// branch out to: the code's length (which they need it to be) and the instructions
interface CodeAddition {
  after: number;
  instructions: number[];
}

// the lost city's lizards (LizaC) leap and hop along their path's points, but
// only ever set their x (the lost city's paths all run along x); their z keeps
// within 1 m of a line where they started (obj[0x188]), drifting in the air
// towards crash's. so they follow a custom level's path however it runs, each
// frame of a green one's leap sets its z as it does its x and moves its line
// there, and a red one's hop moves its line (it still drifts towards crash)
const LIZARD_CODE_LENGTH = 0x20c;
const GREEN_LEAP_SETS_X = 0x55;
const RED_HOP_SETS_X = 0xa6;
const GREEN_LEAP_Z = LIZARD_CODE_LENGTH;     // the instructions added for each, after the code's end
const RED_HOP_Z = LIZARD_CODE_LENGTH + 9;
const MOVE_TO_X = 0x11e1fe08;                // MOVE pop(), obj[0x80]: its x, as the code sets it

const LIZARD_CODE_PATCHES: CodePatch[] = [
  { at: GREEN_LEAP_SETS_X, was: MOVE_TO_X, now: branch(GREEN_LEAP_SETS_X, GREEN_LEAP_Z) },
  { at: RED_HOP_SETS_X, was: MOVE_TO_X, now: branch(RED_HOP_SETS_X, RED_HOP_Z) },
];

// a leap's frame: start x, z at 0xc($fp), 0x10; its target point at 0x14 (x), 0x18, 0x1c (z); its frame at
// 0x20 (in 256ths). a hop's has one more word first, so each is 4 on. x is start x + (target x - start x) ×
// frame / ireg[0x34] (its frames); the same for z
const LIZARD_CODE_ADDITION: CodeAddition = {
  after: LIZARD_CODE_LENGTH,
  instructions: [
    MOVE_TO_X,  // a green lizard's leap: its x, as the code set it
    0x01b04b07, // SUB 0x10($fp), 0x1c($fp): target z less start z
    0x1500cb08, // SHA ireg[0x30], 0x20($fp): the leap's frame
    0x02e1fe1f, // MULT pop(), pop()
    0x0300de1f, // DIV ireg[0x34], pop(): over its frames
    0x00e1fb04, // ADD pop(), 0x10($fp): from start z
    0x11e1fe0a, // MOVE pop(), obj[0x88]: its z
    0x11e0ae4a, // MOVE obj[0x88], obj[0x188]: the line its z keeps near
    branch(GREEN_LEAP_Z + 8, GREEN_LEAP_SETS_X + 1),
    MOVE_TO_X,  // a red lizard's hop: its x, as the code set it
    0x01b05b08, // SUB 0x14($fp), 0x20($fp): target z less start z
    0x1500cb09, // SHA ireg[0x30], 0x24($fp): the hop's frame
    0x02e1fe1f, // MULT pop(), pop()
    0x0300de1f, // DIV ireg[0x34], pop(): over its frames
    0x00e1fb05, // ADD pop(), 0x14($fp): from start z
    0x11e1fe4a, // MOVE pop(), obj[0x188]: the line its z keeps near
    branch(RED_HOP_Z + 7, RED_HOP_SETS_X + 1),
  ],
};

const ENEMY_CODE_ADDITIONS: Partial<Record<EnemyType, CodeAddition>> = {
  lizard: LIZARD_CODE_ADDITION,
  red_lizard: LIZARD_CODE_ADDITION,
};

// toxic waste's barrels (BaraC) stop flattening crash 5 points short of their
// path's end, where they fall off the walkway's end there. a custom level's
// trail ends on the floor, its points spaced out by its speed, so that left
// its last stretch harmless (about 10 m of acid_cave's): now they flatten him
// all the way to the end
const BARREL_CODE_PATCHES: CodePatch[] = [
  { at: 0x2f, was: 0x01805e2e, now: 0x01800e2e }, // SUB 0x500, obj[0x118] becomes SUB 0, obj[0x118]: its path's whole length
];

// the code each enemy spawns by its exec slot, changed to suit custom levels
const ENEMY_CHILD_CODE_PATCHES: Partial<Record<EnemyType, [slot: number, patches: CodePatch[]][]>> = {
  barrel_roller: [[16, BARREL_CODE_PATCHES]],
};

const ENEMY_CODE_PATCHES: Partial<Record<EnemyType, CodePatch[]>> = {
  native: NATIVE_CODE_PATCHES,
  blue_river_plant: RIVER_CODE_PATCHES,
  green_river_plant: RIVER_CODE_PATCHES,
  fish: RIVER_CODE_PATCHES,
  lab_assistant: LAB_ASSISTANT_CODE_PATCHES,
  gunman: GUNMAN_CODE_PATCHES,
  lizard: LIZARD_CODE_PATCHES,
  red_lizard: LIZARD_CODE_PATCHES,
};

// instructions with an addition after their end; an error if they aren't as long as it needs
function withAddedInstructions(type: EnemyType, instructions: Buffer, addition: CodeAddition): Buffer {
  if (instructions.length !== addition.after * 4) {
    throw new Error(`the ${enemyName(type)}'s code isn't as long as expected, so it can't be changed to suit custom levels`);
  }
  const added = Buffer.alloc(addition.instructions.length * 4);
  addition.instructions.forEach((instruction, index) => added.writeUInt32LE(instruction, index * 4));
  return Buffer.concat([instructions, added]);
}

// instructions patched, with the enemy's addition (if it has one) after their end
function changedInstructions(type: EnemyType, instructions: Buffer, patches: CodePatch[]): Buffer {
  const patched = patchedInstructions(type, instructions, patches);
  const addition = ENEMY_CODE_ADDITIONS[type];
  if (!addition) {
    return patched;
  }
  return withAddedInstructions(type, patched, addition);
}

// instructions with patches made; an error if one isn't what the patch expects
function patchedInstructions(type: EnemyType, instructions: Buffer, patches: CodePatch[]): Buffer {
  const patched = Buffer.from(instructions);
  for (const { at, was, now } of patches) {
    if (at * 4 + 4 > patched.length || patched.readUInt32LE(at * 4) !== was) {
      throw new Error(`the ${enemyName(type)}'s code isn't as expected at instruction ${at.toString(16)}, so it can't be changed to suit custom levels`);
    }
    patched.writeUInt32LE(now, at * 4);
  }
  return patched;
}

// object with its code (code, an eid) patched, the rest as it was
function withPatchedCode(object: DonorObject, code: number, change: (instructions: Buffer) => Buffer): DonorObject {
  const patchEntry = (entry: Entry): Entry => {
    const items = entry.items.map((item, index) => (index === CODE_ITEM ? change(item) : item));
    return { ...entry, items };
  };
  return { ...object, entries: object.entries.map((entry) => (entry.eid === code ? patchEntry(entry) : entry)) };
}

// object with the code it spawns by exec slot patched, as level has it in those slots
function withPatchedChildCode(type: EnemyType, object: DonorObject, level: Level): DonorObject {
  const childPatches = ENEMY_CHILD_CODE_PATCHES[type] ?? [];
  return childPatches.reduce(
    (patched, [slot, patches]) => withPatchedCode(patched, level.nsd.ldat.execMap[slot], (instructions) => patchedInstructions(type, instructions, patches)),
    object,
  );
}

// object with its own code (in slot, as level has it) patched and added to, if the enemy has patches
function withPatchedOwnCode(type: EnemyType, object: DonorObject, level: Level, slot: number): DonorObject {
  const patches = ENEMY_CODE_PATCHES[type];
  if (!patches) {
    return object;
  }
  return withPatchedCode(object, level.nsd.ldat.execMap[slot], (instructions) => changedInstructions(type, instructions, patches));
}

// a kind of enemy's object from the level it's taken from, its code changed to
// suit custom levels, and moved to its own exec slot if it has one there
function enemyDonorObject(type: EnemyType, level: Level): DonorObject {
  const moved = MOVED_ENEMY_CODE[type];
  const slot = moved?.donorSlot ?? ENEMY_ENTITIES[type][0];
  const leftOut = (ENEMY_UNUSED_ENTRIES[type] ?? []).map(stringToEid);
  const object = donorObject(level, slot, ENEMY_CHILD_SLOTS[type] ?? [], leftOut);
  const capped = (ENEMY_CAPPED_MODELS[type] ?? []).reduce(withCappedModel, object);
  const patched = withPatchedOwnCode(type, withPatchedChildCode(type, capped, level), level, slot);
  if (!moved) {
    return patched;
  }
  return withChildCodeMoved(type, withCodeMoved(patched, slot, ENEMY_ENTITIES[type][0], stringToEid(moved.name)), slot);
}

const SPAWN_OPCODES = [0x8a, 0x91]; // CHLD: its exec slot in bits 12-19

// an instruction spawning from a moved exec slot made to spawn from where it moved to
function withSpawnSlotMoved(instruction: number, moves: Map<number, number>): number {
  if (!SPAWN_OPCODES.includes(instruction >>> 24)) {
    return instruction;
  }
  const to = moves.get((instruction >>> 12) & 0xff);
  if (to === undefined) {
    return instruction;
  }
  return ((instruction & ~(0xff << 12)) | (to << 12)) >>> 0;
}

// object with each of its pieces of code spawning from moved exec slots where they moved to
function withSpawnSlotsMoved(object: DonorObject, moves: Map<number, number>): DonorObject {
  const codeEids = new Set(object.code.map(([, eid]) => eid));
  const moveSpawns = (entry: Entry): Entry => {
    const instructions = Buffer.from(entry.items[CODE_ITEM]);
    for (let at = 0; at < instructions.length; at += 4) {
      instructions.writeUInt32LE(withSpawnSlotMoved(instructions.readUInt32LE(at), moves), at);
    }
    return { ...entry, items: entry.items.map((item, index) => (index === CODE_ITEM ? instructions : item)) };
  };
  return { ...object, entries: object.entries.map((entry) => (codeEids.has(entry.eid) ? moveSpawns(entry) : entry)) };
}

// object (its own code moved from donorSlot) with the code it spawns moved too
// (MOVED_CHILD_CODE), and its code spawning from where each moved to
function withChildCodeMoved(type: EnemyType, object: DonorObject, donorSlot: number): DonorObject {
  const childMoves = MOVED_CHILD_CODE[type] ?? [];
  if (childMoves.length === 0) {
    return object;
  }
  const moved = childMoves.reduce((withMoved, { from, to, name }) => withCodeMoved(withMoved, from, to, stringToEid(name)), object);
  const moves = new Map([[donorSlot, ENEMY_ENTITIES[type][0]], ...childMoves.map(({ from, to }): [number, number] => [from, to])]);
  return withSpawnSlotsMoved(moved, moves);
}

// each kind of enemy's object, from the level it's taken from
export const enemyDonorObjects = (levels: Map<EnemyType, Level>): DonorObject[] =>
  [...levels].map(([type, level]) => enemyDonorObject(type, level));
