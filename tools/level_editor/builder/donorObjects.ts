// objects custom levels take from a real level other than the base level (their
// donor), such as an enemy jungle rollers doesn't have: its code and what that
// uses there (models, animations, sounds and texture pages), and any object it spawns
import type { EnemyType, LevelObject } from "../src/objects";
import { packEntries, rawPagesById, reachableEids } from "./cutLevel";
import { ENEMY_ENTITIES } from "./entities";
import { EID_NONE, eidToString } from "./entryIds";
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

// the object whose code is in exec slot slot in the donor level, and what it uses there
export function donorObject(donor: Level, slot: number): DonorObject {
  const code = donor.nsd.ldat.execMap[slot];
  if (code === undefined || code === EID_NONE || !entriesById(donor).has(code)) {
    throw new Error(`the donor level (${donor.nsd.ldat.lid.toString(16)}) has no code in exec slot ${slot}`);
  }
  const used = reachableEids(donor, [code]);
  const entries = entriesInPages(donor, PAGE_ENTRIES, used);
  const texturePages = [...rawPagesById(donor)].filter(([eid, page]) => used.has(eid) && page.type === PAGE_TEXTURE).map(([, page]) => page);
  return { code: codeSlots(donor, entries), entries, sounds: entriesInPages(donor, PAGE_SOUNDS, used), texturePages };
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

const ENEMY_CODE_PATCHES: Partial<Record<EnemyType, CodePatch[]>> = {
  native: NATIVE_CODE_PATCHES,
  blue_river_plant: RIVER_CODE_PATCHES,
  green_river_plant: RIVER_CODE_PATCHES,
  fish: RIVER_CODE_PATCHES,
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

// a kind of enemy's object from the level it's taken from, its code changed to suit custom levels
function enemyDonorObject(type: EnemyType, level: Level): DonorObject {
  const slot = ENEMY_ENTITIES[type][0];
  const object = donorObject(level, slot);
  const patches = ENEMY_CODE_PATCHES[type];
  return patches ? withPatchedCode(type, object, level.nsd.ldat.execMap[slot], patches) : object;
}

// each kind of enemy's object, from the level it's taken from
export const enemyDonorObjects = (levels: Map<EnemyType, Level>): DonorObject[] =>
  [...levels].map(([type, level]) => enemyDonorObject(type, level));
