// objects custom levels take from a real level other than the base level (their
// donor), such as an enemy jungle rollers doesn't have: its code and what that
// uses there (models, animations, sounds and texture pages), and any object it spawns
import type { EnemyType, LevelObject } from "../src/objects";
import { packEntries, rawPagesById, reachableEids } from "./cutLevel";
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
  lab_assistant: STORMY_ASCENT,
  snake: TEMPLE_RUINS,
  robot_dog: HEAVY_MACHINERY,
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

// the code each enemy spawns by its exec slot, which its entries don't name:
// toxic waste's barrel roller throws his barrels (BaraC, slot 16)
const ENEMY_CHILD_SLOTS: Partial<Record<EnemyType, number[]>> = {
  barrel_roller: [16],
};

// entries an enemy's entries name but its code never uses, left out: toxic
// waste's barrel roller's data names its WateC, which differs from up the
// creek's (the river enemies') in the same exec slot, so the two would clash
const ENEMY_UNUSED_ENTRIES: Partial<Record<EnemyType, string[]>> = {
  barrel_roller: ["WateC"],
};

const ENEMY_CODE_PATCHES: Partial<Record<EnemyType, CodePatch[]>> = {
  native: NATIVE_CODE_PATCHES,
  blue_river_plant: RIVER_CODE_PATCHES,
  green_river_plant: RIVER_CODE_PATCHES,
  fish: RIVER_CODE_PATCHES,
  lab_assistant: LAB_ASSISTANT_CODE_PATCHES,
};

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
function withPatchedCode(type: EnemyType, object: DonorObject, code: number, patches: CodePatch[]): DonorObject {
  const patchEntry = (entry: Entry): Entry => {
    const items = entry.items.map((item, index) => (index === CODE_ITEM ? patchedInstructions(type, item, patches) : item));
    return { ...entry, items };
  };
  return { ...object, entries: object.entries.map((entry) => (entry.eid === code ? patchEntry(entry) : entry)) };
}

// a kind of enemy's object from the level it's taken from, its code changed to
// suit custom levels, and moved to its own exec slot if it has one there
function enemyDonorObject(type: EnemyType, level: Level): DonorObject {
  const moved = MOVED_ENEMY_CODE[type];
  const slot = moved?.donorSlot ?? ENEMY_ENTITIES[type][0];
  const leftOut = (ENEMY_UNUSED_ENTRIES[type] ?? []).map(stringToEid);
  const object = donorObject(level, slot, ENEMY_CHILD_SLOTS[type] ?? [], leftOut);
  const patches = ENEMY_CODE_PATCHES[type];
  const patched = patches ? withPatchedCode(type, object, level.nsd.ldat.execMap[slot], patches) : object;
  if (!moved) {
    return patched;
  }
  return withCodeMoved(patched, slot, ENEMY_ENTITIES[type][0], stringToEid(moved.name));
}

// each kind of enemy's object, from the level it's taken from
export const enemyDonorObjects = (levels: Map<EnemyType, Level>): DonorObject[] =>
  [...levels].map(([type, level]) => enemyDonorObject(type, level));
