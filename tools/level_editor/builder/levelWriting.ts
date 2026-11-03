// writing a level's .nsd and .nsf, laid out as the game loads them (src/ns.h)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ByteWriter } from "./bytes";
import { eidBucket } from "./entryIds";
import {
  ENTRY_SLST, LDAT_IMAGE_SIZE, MAGIC_ENTRY, MAGIC_PAGE, NSD_COMPRESSED_PAGE_COUNT, NSD_PTB_COUNT,
  PAGE_ENTRIES, PAGE_SIZE, PAGE_TEXTURE, type Entry, type Ldat, type Level, type Nsd, type Page,
} from "./levelFiles";

// the page id the loader gives the page at index (see NSInit)
export const pgid = (index: number) => index * 2 + 1;

// an entry: header, item offsets relative to the entry, then the items. a sort
// list's identical items are stored once, their offsets pointing at the same
// data (the loader makes each offset a pointer on its own)
export function entryBytes(entry: Entry): Buffer {
  const isShared = entry.type === ENTRY_SLST;
  const storedAt = new Map<string, number>();
  const stored: Buffer[] = [];
  const offsets: number[] = [];
  let offset = 16 + 4 * (entry.items.length + 1);
  for (const item of entry.items) {
    const key = item.toString("latin1");
    if (!isShared || !storedAt.has(key)) {
      storedAt.set(key, offset);
      stored.push(item);
      offset += item.length;
    }
    offsets.push(storedAt.get(key)!);
  }
  offsets.push(offset);
  const writer = new ByteWriter().u32(MAGIC_ENTRY).u32(entry.eid).s32(entry.type).s32(entry.items.length);
  offsets.forEach((itemOffset) => writer.u32(itemOffset));
  stored.forEach((item) => writer.bytes(item));
  return writer.toBuffer();
}

// a 64 KB page holding entries; it's an error if they don't fit
export function entryPageBytes(entries: Entry[], index: number): Buffer {
  const blobs = entries.map(entryBytes);
  const offsets: number[] = [];
  let offset = 16 + 4 * (blobs.length + 1);
  for (const blob of blobs) {
    offsets.push(offset);
    offset += blob.length;
  }
  offsets.push(offset);
  if (offset > PAGE_SIZE) {
    throw new Error(`entries take ${offset} bytes, more than a page`);
  }
  const writer = new ByteWriter().u16(MAGIC_PAGE).u16(PAGE_ENTRIES).u32(pgid(index)).u32(blobs.length).u32(0);
  offsets.forEach((entryOffset) => writer.u32(entryOffset));
  blobs.forEach((blob) => writer.bytes(blob));
  return writer.padTo(PAGE_SIZE).toBuffer();
}

function pageBytes(page: Page, index: number): Buffer {
  return page.type === PAGE_ENTRIES ? entryPageBytes(page.entries, index) : page.data; // texture and audio pages as they are
}

// (pgid, eid) for every entry and texture page, grouped by bucket, and where
// each bucket's first is (NSProbe scans on from there)
function pageTable(pages: Page[]): { table: [number, number][]; bucketStarts: number[] } {
  const table = pages.flatMap((page, index) => {
    const eids = page.type === PAGE_TEXTURE ? [page.eid] : page.entries.map((entry) => entry.eid);
    return eids.map((eid) => [pgid(index), eid] as [number, number]);
  });
  table.sort((first, second) => eidBucket(first[1]) - eidBucket(second[1]));
  const bucketStarts = Array.from({ length: NSD_PTB_COUNT }, (_, bucket) =>
    table.filter(([, eid]) => eidBucket(eid) < bucket).length);
  return { table, bucketStarts };
}

function writeLdat(writer: ByteWriter, ldat: Ldat): void {
  writer.u32(ldat.magic).u32(ldat.lid).u32(ldat.zoneSpawn).s32(ldat.pathIndexSpawn).u32(ldat.boxTotal);
  ldat.execMap.forEach((eid) => writer.u32(eid));
  writer.u32(ldat.fov).bytes(ldat.image);
  writer.bytes(Buffer.alloc(Math.max(0, LDAT_IMAGE_SIZE - ldat.image.length)));
}

export function nsdBytes(nsd: Nsd, pages: Page[]): Buffer {
  const { table, bucketStarts } = pageTable(pages);
  const writer = new ByteWriter();
  bucketStarts.forEach((start) => writer.u32(start));
  writer.s32(pages.length).u32(table.length).u32(nsd.ldatEid).s32(nsd.hasLoadingImage)
    .u32(nsd.loadingImageWidth).u32(nsd.loadingImageHeight)
    .u32(0).s32(0); // pages start the nsf, and none are compressed
  for (let page = 0; page < NSD_COMPRESSED_PAGE_COUNT; page++) {
    writer.u32(0);
  }
  table.forEach(([pageId, eid]) => writer.u32(pageId).u32(eid));
  writeLdat(writer, nsd.ldat);
  return writer.toBuffer();
}

// writes outDir/name.nsd and outDir/name.nsf
export function writeLevel(level: Level, outDir: string, name: string): void {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${name}.nsf`), Buffer.concat(level.pages.map(pageBytes)));
  writeFileSync(join(outDir, `${name}.nsd`), nsdBytes(level.nsd, level.pages));
}
