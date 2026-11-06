// objects custom levels take from a real level other than the base level (their
// donor), such as an enemy jungle rollers doesn't have: its code and what that
// uses there (models, animations, sounds and texture pages), and any object it spawns
import { rawPagesById, reachableEids } from "./cutLevel";
import { EID_NONE } from "./entryIds";
import { ENTRY_GOOL, entriesById, PAGE_ENTRIES, PAGE_SOUNDS, PAGE_TEXTURE, type Entry, type Level, type Page } from "./levelFiles";

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
