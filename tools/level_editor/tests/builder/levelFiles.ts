// level files written by hand for the level build's tests, as the game lays them out
import { ByteWriter } from "../../builder/bytes";
import { EID_NONE } from "../../builder/entryIds";
import { MAGIC_ENTRY, MAGIC_PAGE, PAGE_SIZE } from "../../builder/levelFiles";

// an entry: header, item offsets (relative to the entry), then the items
export function entryData(eid: number, type: number, items: Buffer[]): Buffer {
  const writer = new ByteWriter().u32(MAGIC_ENTRY).u32(eid).s32(type).s32(items.length);
  let offset = 16 + 4 * (items.length + 1);
  for (const item of items) {
    writer.u32(offset);
    offset += item.length;
  }
  writer.u32(offset);
  items.forEach((item) => writer.bytes(item));
  return writer.toBuffer();
}

// a normal (type 0) page holding entries, padded to 64 KB
export function pageData(pgid: number, entries: Buffer[]): Buffer {
  const writer = new ByteWriter().u16(MAGIC_PAGE).u16(0).u32(pgid).u32(entries.length).u32(0);
  let offset = 16 + 4 * (entries.length + 1);
  for (const entry of entries) {
    writer.u32(offset);
    offset += entry.length;
  }
  writer.u32(offset);
  entries.forEach((entry) => writer.bytes(entry));
  return writer.padTo(PAGE_SIZE).toBuffer();
}

export function texturePageData(eid: number): Buffer {
  const header = new ByteWriter().u16(MAGIC_PAGE).u16(1).u32(eid).u32(5).u32(0).toBuffer();
  return Buffer.concat([header, Buffer.alloc(PAGE_SIZE - header.length, 0x55)]);
}

// an nsd: its page table ((pgid, eid) pairs, all in bucket 0) and the level header
export function nsdData(pageTable: [number, number][], lid: number, zoneSpawn: number, execMap: number[], pagesOffset = 0): Buffer {
  const writer = new ByteWriter();
  for (let bucket = 0; bucket < 256; bucket++) {
    writer.u32(0);
  }
  writer.s32(1).u32(pageTable.length).u32(0).s32(0).u32(0).u32(0).u32(pagesOffset).s32(0);
  for (let page = 0; page < 64; page++) {
    writer.u32(0);
  }
  pageTable.forEach(([pgid, eid]) => writer.u32(pgid).u32(eid));
  writer.u32(1).u32(lid).u32(zoneSpawn).s32(2).u32(0);
  for (let slot = 0; slot < 64; slot++) {
    writer.u32(execMap[slot] ?? EID_NONE);
  }
  return writer.u32(0x1400).bytes(Buffer.alloc(0xf5f8)).toBuffer();
}

export const words = (...values: number[]) => {
  const writer = new ByteWriter();
  values.forEach((value) => writer.u32(value));
  return writer.toBuffer();
};
