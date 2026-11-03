import { describe, expect, test } from "vitest";
import { ByteWriter } from "../../builder/bytes";
import { EID_NONE, eidToString, stringToEid } from "../../builder/entryIds";
import { PAGE_SIZE, readNsd, readPages, SECTOR_SIZE } from "../../builder/levelFiles";
import { entryData, nsdData, pageData, texturePageData } from "./levelFiles";

const WILLC = stringToEid("WillC");
const text = (value: string) => Buffer.from(value, "latin1");

describe("entry ids", () => {
  test("a name round trips", () => {
    expect(eidToString(stringToEid("WillC"))).toBe("WillC");
  });

  test("ids are odd", () => {
    expect(stringToEid("WillC") & 1).toBe(1);
  });

  test("no entry is NONE!", () => {
    expect(eidToString(EID_NONE)).toBe("NONE!");
  });

  test("names use all 31 bits", () => {
    expect(stringToEid("!!!!!")).toBe(2 ** 31 - 1);
    expect(eidToString(stringToEid("!!!!!"))).toBe("!!!!!");
  });
});

describe("byte writer", () => {
  test("writes little endian numbers, signed and unsigned, and pads", () => {
    const data = new ByteWriter().u8(1).u16(0x0302).s16(-1).u32(0xfffffffe).s32(-2).padTo(16).toBuffer();
    expect([...data]).toEqual([1, 2, 3, 0xff, 0xff, 0xfe, 0xff, 0xff, 0xff, 0xfe, 0xff, 0xff, 0xff, 0, 0, 0]);
  });
});

describe("reading an nsd", () => {
  test("its page table and level header", () => {
    const zone = stringToEid("a5_9Z");
    const nsd = readNsd(nsdData([[1, WILLC], [3, zone]], 9, zone, [WILLC]));
    expect(nsd.pageCount).toBe(1);
    expect(nsd.pageTable).toEqual([[1, WILLC], [3, zone]]);
    expect(nsd.ldat.lid).toBe(9);
    expect(nsd.ldat.zoneSpawn).toBe(zone);
    expect(nsd.ldat.pathIndexSpawn).toBe(2);
    expect(nsd.ldat.execMap.slice(0, 2)).toEqual([WILLC, EID_NONE]);
  });
});

describe("reading pages", () => {
  test("an entry and its items", () => {
    const pages = readPages(pageData(1, [entryData(WILLC, 11, [text("head"), text("code!!")])]), 1);
    expect(pages.length).toBe(1);
    expect(pages[0].type).toBe(0);
    const [entry] = pages[0].entries;
    expect([entry.eid, entry.type]).toEqual([WILLC, 11]);
    expect(entry.items).toEqual([text("head"), text("code!!")]);
  });

  test("several entries in a page", () => {
    const a = entryData(stringToEid("AaaaA"), 7, [text("1")]);
    const b = entryData(stringToEid("BbbbB"), 3, [text("22"), text("333")]);
    const [page] = readPages(pageData(1, [a, b]), 1);
    expect(page.entries.map((entry) => eidToString(entry.eid))).toEqual(["AaaaA", "BbbbB"]);
    expect(page.entries[1].items).toEqual([text("22"), text("333")]);
  });

  test("a texture page keeps its id and data", () => {
    const tpag = stringToEid("TexP1");
    const [page] = readPages(texturePageData(tpag), 1);
    expect([page.type, page.eid, page.data.length]).toEqual([1, tpag, PAGE_SIZE]);
    expect(page.entries).toEqual([]);
  });

  test("pages start pagesOffset sectors in", () => {
    const nsf = Buffer.concat([Buffer.alloc(2 * SECTOR_SIZE, 0xee), pageData(1, [entryData(WILLC, 11, [text("x")])])]);
    expect(readPages(nsf, 1, 2)[0].entries[0].eid).toBe(WILLC);
  });
});
