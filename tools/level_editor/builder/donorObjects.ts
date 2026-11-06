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

// the level each enemy jungle rollers doesn't have is taken from
export const ENEMY_DONORS: Partial<Record<EnemyType, DonorLevel>> = { crab: N_SANITY_BEACH, turtle: N_SANITY_BEACH };

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
// readOtherLevel, for the kinds that come from another level
export function enemyDonorLevels(objects: LevelObject[], readOtherLevel?: (lid: number) => Level): Map<EnemyType, Level> {
  const levels = new Map<EnemyType, Level>();
  for (const type of new Set(objects.flatMap((object) => (object.kind === "enemy" && object.enemy ? [object.enemy] : [])))) {
    const donor = ENEMY_DONORS[type];
    if (donor) {
      levels.set(type, readDonorLevel(type, donor, readOtherLevel));
    }
  }
  return levels;
}

// each kind of enemy's object, from the level it's taken from
export const enemyDonorObjects = (levels: Map<EnemyType, Level>): DonorObject[] =>
  [...levels].map(([type, level]) => donorObject(level, ENEMY_ENTITIES[type][0]));
