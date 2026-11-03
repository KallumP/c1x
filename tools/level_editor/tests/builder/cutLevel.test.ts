import { describe, expect, test } from "vitest";
import { cutLevel, packEntries, references } from "../../builder/cutLevel";
import { EID_NONE, eidBucket, stringToEid } from "../../builder/entryIds";
import { entryPage, PAGE_TEXTURE, readNsd, texturePage, type Entry, type Level } from "../../builder/levelFiles";
import { nsdData, texturePageData, words } from "./levelFiles";

const WILLC = stringToEid("WillC");
const MODEL = stringToEid("Mdl0G");
const TEX = stringToEid("TexP1");
const ZONE = stringToEid("a5_9Z");
const WORLD = stringToEid("a5_9W");
const BEACH = stringToEid("BeaOC");
const text = (value: string) => Buffer.from(value, "latin1");
const entry = (eid: number, type: number, items: Buffer[]): Entry => ({ eid, type, items });

// WillC uses a model, which uses a texture page; a zone uses its own world mesh; nothing uses the beach object
function testLevel(): Level {
  const pages = [
    entryPage([entry(WILLC, 11, [text("head"), words(0x10, MODEL)]), entry(MODEL, 2, [words(TEX, 7)])]),
    entryPage([entry(ZONE, 7, [words(WORLD)]), entry(WORLD, 3, [text("mesh")]), entry(BEACH, 11, [text("beach")])]),
    texturePage(TEX, texturePageData(TEX)),
  ];
  return { nsd: readNsd(nsdData([], 9, ZONE, [WILLC, BEACH])), pages };
}

const eidsIn = (level: Level) => new Set(level.pages.flatMap((page) =>
  (page.type === PAGE_TEXTURE ? [page.eid] : page.entries.map(({ eid }) => eid))));

describe("cutting a level down", () => {
  test("references are the eids in an entry's items", () => {
    const willc = entry(WILLC, 11, [text("head"), words(0x10, MODEL, ZONE)]);
    expect(references(willc, new Set([MODEL, ZONE, BEACH]))).toEqual(new Set([MODEL, ZONE]));
  });

  test("it keeps what the kept code uses, and drops the rest", () => {
    expect(eidsIn(cutLevel(testLevel(), [WILLC]))).toEqual(new Set([WILLC, MODEL, TEX]));
  });

  test("the exec map keeps only the kept code", () => {
    expect(cutLevel(testLevel(), [WILLC]).nsd.ldat.execMap.slice(0, 2)).toEqual([WILLC, EID_NONE]);
  });

  test("it leaves the level it was cut from as it was", () => {
    const level = testLevel();
    cutLevel(level, [WILLC]);
    expect(level.nsd.ldat.execMap.slice(0, 2)).toEqual([WILLC, BEACH]);
  });

  test("the kept entries are packed into fewer pages", () => {
    expect(cutLevel(testLevel(), [WILLC]).pages.length).toBe(2); // one entry page, one texture page
  });
});

describe("packing entries into pages", () => {
  test("a page lists its entries in bucket order", () => {
    // NSPageUpdateEntries scans the page table forward from the bucket of a page's first entry
    const eids = ["zzzzZ", "aaaaA", "MMMMM", "00000"].map(stringToEid);
    const [page] = packEntries(eids.map((eid) => entry(eid, 1, [text("x")])));
    const buckets = page.entries.map(({ eid }) => eidBucket(eid));
    expect(buckets).toEqual([...buckets].sort((first, second) => first - second));
    expect(new Set(page.entries.map(({ eid }) => eid))).toEqual(new Set(eids));
  });

  test("a new page starts when one is full", () => {
    const big = [0, 1, 2].map((index) => entry(stringToEid(`Big0${index}`), 1, [Buffer.alloc(40000)]));
    const pages = packEntries(big);
    expect(pages.length).toBe(3);
    expect(pages.flatMap((page) => page.entries)).toEqual(big);
  });
});
