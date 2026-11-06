import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { stringToEid } from "../../builder/entryIds";
import { PAGE_SIZE, PAGE_SOUNDS, readEntry, soundPage, readLevelFiles, readNsd, readPages, type Entry, type Level, type Nsd } from "../../builder/levelFiles";
import { entryBytes, entryPageBytes, writeLevel } from "../../builder/levelWriting";
import { entryData, nsdData, pageData, texturePageData } from "./levelFiles";

const WILLC = stringToEid("WillC");
const ZONE = stringToEid("a5_9Z");
const TPAG = stringToEid("TexP1");
const text = (value: string) => Buffer.from(value, "latin1");

function smallLevel(): Level {
  const entries = [entryData(ZONE, 7, [text("zone"), text("rect")]), entryData(WILLC, 11, [text("code")])];
  const pages = [readPages(pageData(1, entries), 1)[0], readPages(texturePageData(TPAG), 1)[0]];
  return { nsd: readNsd(nsdData([], 9, ZONE, [WILLC])), pages };
}

function writtenAndReadBack(level: Level): Level {
  const folder = mkdtempSync(join(tmpdir(), "levels-"));
  writeLevel(level, folder, "small");
  return readLevelFiles(join(folder, "small"));
}

// where the game finds an entry's page: scanning the page table from the entry's bucket, as NSProbe does
function probe(nsd: Nsd, eid: number): number {
  let index = nsd.ptbOffsets[(eid >>> 15) & 0xff];
  while (nsd.pageTable[index][1] !== eid) {
    index++;
  }
  return nsd.pageTable[index][0];
}

const contents = (level: Level) => level.pages.map((page) => page.entries.map(({ eid, type, items }) => [eid, type, items]));

describe("writing a level", () => {
  test("it reads back the same", () => {
    const level = smallLevel();
    const back = writtenAndReadBack(level);
    expect([back.nsd.pageCount, back.nsd.pagesOffset, back.nsd.ldat.lid]).toEqual([2, 0, 9]);
    expect(back.nsd.ldat.zoneSpawn).toBe(level.nsd.ldat.zoneSpawn);
    expect(back.nsd.ldat.execMap).toEqual(level.nsd.ldat.execMap);
    expect(contents(back)).toEqual(contents(level));
    expect(back.pages[1].data.equals(level.pages[1].data)).toBe(true);
  });

  test("its page table finds every entry by bucket", () => {
    const { nsd } = writtenAndReadBack(smallLevel());
    expect(probe(nsd, WILLC)).toBe((0 << 1) | 1);
    expect(probe(nsd, ZONE)).toBe((0 << 1) | 1);
    expect(probe(nsd, TPAG)).toBe((1 << 1) | 1);
  });

  test("a sound page made from entries is written as a sound page holding them", () => {
    const sound = { eid: stringToEid("CC19A"), type: 12, items: [text("snip")] };
    const level = smallLevel();
    level.pages.push(soundPage([sound]));
    const back = writtenAndReadBack(level);
    expect(back.pages[2].type).toBe(PAGE_SOUNDS);
    expect(contents(back)[2]).toEqual([[sound.eid, sound.type, sound.items]]);
    expect(probe(back.nsd, sound.eid)).toBe((2 << 1) | 1);
  });

  test("too many entries for a page is an error", () => {
    expect(() => entryPageBytes([{ eid: WILLC, type: 11, items: [Buffer.alloc(PAGE_SIZE)] }], 0)).toThrow();
  });
});

describe("sort lists' identical items", () => {
  const A = text("AAAA".repeat(3));
  const B = text("BBBB");
  const sortList = (items: Buffer[]): Entry => ({ eid: stringToEid("TestS"), type: 4, items });

  test("are stored once", () => {
    expect(entryBytes(sortList([A, B, A, A])).length).toBe(16 + 4 * 5 + A.length + B.length);
  });

  test("each item's offset points at its data", () => {
    // the loader makes each item offset a pointer on its own (NSPageStruct in src/ns.c)
    const items = [A, B, A, B];
    const data = entryBytes(sortList(items));
    const offsets = Array.from({ length: 5 }, (_, index) => data.readUInt32LE(16 + 4 * index));
    items.forEach((item, index) => expect(data.subarray(offsets[index], offsets[index] + item.length).equals(item)).toBe(true));
    expect(offsets[4]).toBe(data.length);
  });

  test("other entries keep every item, empty ones too", () => {
    // an empty item's offset is the next item's, so only sort lists share
    const items = [A, Buffer.alloc(0), A];
    const data = entryBytes({ eid: stringToEid("TestZ"), type: 7, items });
    expect(data.length).toBe(16 + 4 * 4 + 2 * A.length);
    expect(readEntry(data, 0).items).toEqual(items);
  });

  test("read back", () => {
    const items = [A, B, A, A, B];
    expect(readEntry(entryBytes(sortList(items)), 0).items).toEqual(items);
  });
});
