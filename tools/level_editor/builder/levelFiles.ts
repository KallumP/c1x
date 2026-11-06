// the game's level files: an .nsd (page table and level header) and an .nsf
// (64 KB pages of entries). the layouts mirror the structs in src/ns.h, which
// the game loads as they are
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readWords } from "./bytes";

export const MAGIC_PAGE = 0x1234;
export const MAGIC_ENTRY = 0x100ffff;
export const PAGE_SIZE = 0x10000;
export const SECTOR_SIZE = 0x800;

export const PAGE_ENTRIES = 0;
export const PAGE_TEXTURE = 1;
export const PAGE_SOUNDS = 3; // sound effects (4 is music's instruments)

// entry types (the subsystem table in src/main.c)
export const ENTRY_WGEO = 3; // world meshes
export const ENTRY_SLST = 4; // sort lists: many of their items are the same, and none is empty
export const ENTRY_ZDAT = 7; // zones
export const ENTRY_GOOL = 11; // object code

export const NSD_PTB_COUNT = 256;
export const NSD_COMPRESSED_PAGE_COUNT = 64;
export const NSD_EXEC_COUNT = 64;
export const LDAT_IMAGE_SIZE = 0xf5f8;

export interface Entry {
  eid: number;
  type: number;
  items: Buffer[];
}

export interface Page {
  type: number;
  pgid: number;       // for entry pages
  eid: number;        // for texture pages
  entries: Entry[];
  data: Buffer;       // the whole page, for pages that aren't entry pages
}

// the level header at the end of the nsd
export interface Ldat {
  magic: number;
  lid: number;
  zoneSpawn: number;
  pathIndexSpawn: number;
  boxTotal: number;   // 0 in the game's own levels; a custom level's boxes to break
  execMap: number[];
  fov: number;
  image: Buffer;
}

export interface Nsd {
  ptbOffsets: number[];
  pageCount: number;
  ldatEid: number;
  hasLoadingImage: number;
  loadingImageWidth: number;
  loadingImageHeight: number;
  pagesOffset: number;
  pageTable: [pgid: number, eid: number][]; // grouped by eid bucket
  ldat: Ldat;
}

export interface Level {
  nsd: Nsd;
  pages: Page[];
}

export function entryPage(entries: Entry[]): Page {
  return { type: PAGE_ENTRIES, pgid: 0, eid: 0, entries, data: Buffer.alloc(0) };
}

export function texturePage(eid: number, data: Buffer): Page {
  return { type: PAGE_TEXTURE, pgid: 0, eid, entries: [], data };
}

// reading

function readLdat(data: Buffer, offset: number): Ldat {
  const execMapAt = offset + 20;
  const fovAt = execMapAt + 4 * NSD_EXEC_COUNT;
  return {
    magic: data.readUInt32LE(offset),
    lid: data.readUInt32LE(offset + 4),
    zoneSpawn: data.readUInt32LE(offset + 8),
    pathIndexSpawn: data.readInt32LE(offset + 12),
    boxTotal: data.readUInt32LE(offset + 16),
    execMap: readWords(data, execMapAt, NSD_EXEC_COUNT),
    fov: data.readUInt32LE(fovAt),
    image: data.subarray(fovAt + 4, fovAt + 4 + LDAT_IMAGE_SIZE),
  };
}

export function readNsd(data: Buffer): Nsd {
  const header = 4 * NSD_PTB_COUNT;
  const tableSize = data.readUInt32LE(header + 4);
  const tableAt = header + 32 + 4 * NSD_COMPRESSED_PAGE_COUNT;
  const pageTable = Array.from({ length: tableSize }, (_, index) =>
    [data.readUInt32LE(tableAt + 8 * index), data.readUInt32LE(tableAt + 8 * index + 4)] as [number, number]);
  return {
    ptbOffsets: readWords(data, 0, NSD_PTB_COUNT),
    pageCount: data.readInt32LE(header),
    ldatEid: data.readUInt32LE(header + 8),
    hasLoadingImage: data.readInt32LE(header + 12),
    loadingImageWidth: data.readUInt32LE(header + 16),
    loadingImageHeight: data.readUInt32LE(header + 20),
    pagesOffset: data.readUInt32LE(header + 24),
    pageTable,
    ldat: readLdat(data, tableAt + 8 * tableSize),
  };
}

// a sort list's items can share their data, so an item ends where the next stored one starts
function sharedItemEnd(offsets: number[], start: number): number {
  const later = offsets.filter((offset) => offset > start);
  return later.length ? Math.min(...later) : start;
}

export function readEntry(data: Buffer, offset: number): Entry {
  const magic = data.readUInt32LE(offset);
  if (magic !== MAGIC_ENTRY) {
    throw new Error(`bad entry magic ${magic.toString(16)} at ${offset.toString(16)}`);
  }
  const type = data.readInt32LE(offset + 8);
  const itemCount = data.readInt32LE(offset + 12);
  const offsets = readWords(data, offset + 16, itemCount + 1);
  const itemEnd = (index: number) => (type === ENTRY_SLST ? sharedItemEnd(offsets, offsets[index]) : offsets[index + 1]);
  const items = Array.from({ length: itemCount }, (_, index) => data.subarray(offset + offsets[index], offset + itemEnd(index)));
  return { eid: data.readUInt32LE(offset + 4), type, items };
}

export function readPage(data: Buffer): Page {
  const magic = data.readUInt16LE(0);
  if (magic !== MAGIC_PAGE) {
    throw new Error(`bad page magic ${magic.toString(16)}`);
  }
  const type = data.readUInt16LE(2);
  if (type === PAGE_TEXTURE) { // one texture, named by its own eid
    return texturePage(data.readUInt32LE(4), data);
  }
  // entry pages (0) and audio pages (3, 4) hold entries the same way
  const count = data.readUInt32LE(8);
  const offsets = readWords(data, 16, count + 1);
  const entries = offsets.slice(0, count).map((offset) => readEntry(data, offset));
  return { type, pgid: data.readUInt32LE(4), eid: 0, entries, data };
}

// the uncompressed pages, which start pagesOffset sectors into the nsf
export function readPages(nsf: Buffer, pageCount: number, pagesOffset = 0): Page[] {
  const start = pagesOffset * SECTOR_SIZE;
  return Array.from({ length: pageCount }, (_, index) =>
    readPage(nsf.subarray(start + index * PAGE_SIZE, start + (index + 1) * PAGE_SIZE)));
}

// path.nsd and path.nsf
export function readLevelFiles(path: string): Level {
  const nsd = readNsd(readFileSync(`${path}.nsd`));
  return { nsd, pages: readPages(readFileSync(`${path}.nsf`), nsd.pageCount, nsd.pagesOffset) };
}

const streamName = (lid: number) => `s${lid.toString(16).padStart(7, "0")}`;

// one of the game's own levels from its streams folder
export function readLevel(streamsDir: string, lid: number): Level {
  return readLevelFiles(join(streamsDir, streamName(lid)));
}

export const entriesById = (level: Level) => new Map(level.pages.flatMap((page) => page.entries).map((entry) => [entry.eid, entry]));
