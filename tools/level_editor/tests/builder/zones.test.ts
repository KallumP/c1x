import { describe, expect, test } from "vitest";
import { readWords } from "../../builder/bytes";
import { stringToEid } from "../../builder/entryIds";
import { entryPage, texturePage, type Level } from "../../builder/levelFiles";
import { pgid } from "../../builder/levelWriting";
import { loadTexturePages, ZONE_HEADER_SIZE, ZONE_LOADLIST, ZONE_MIDI, zoneHeaderBytes } from "../../builder/zones";
import { readZoneHeader } from "./zoneReaders";

const EMPTY_HEADER = Buffer.alloc(ZONE_HEADER_SIZE);

describe("zone headers", () => {
  const SELF = stringToEid("Flr0Z");

  test("a zone lists its world meshes and where they are", () => {
    const world = stringToEid("Flr0W");
    const header = zoneHeaderBytes(EMPTY_HEADER, SELF, [{ eid: world, origin: [1, 2, 3] }], 1, 1);
    expect(readZoneHeader(header).worlds).toEqual([{ eid: world, origin: [1, 2, 3] }]);
  });

  test("a zone counts its camera paths and entities", () => {
    const { pathsIndex, pathCount, entityCount } = readZoneHeader(zoneHeaderBytes(EMPTY_HEADER, SELF, [], 3, 5));
    expect(pathsIndex).toBe(2); // its first camera path is the item after the header and its rect
    expect([pathCount, entityCount]).toEqual([3, 5]);
  });

  test("a zone's load list starts empty", () => {
    const template = Buffer.alloc(ZONE_HEADER_SIZE, 0x11);
    expect(readZoneHeader(zoneHeaderBytes(template, SELF, [], 1, 0)).loadList).toEqual({ entryCount: 0, pageCount: 0 });
  });

  test("a zone plays its template's music", () => {
    // jungle rollers' template's: its second track is aku aku's song at three masks
    const template = Buffer.alloc(ZONE_HEADER_SIZE);
    template.writeUInt32LE(stringToEid("So0cM"), ZONE_MIDI);
    const header = zoneHeaderBytes(template, SELF, [], 1, 0);
    expect(readZoneHeader(header).midi).toBe(stringToEid("So0cM"));
  });

  test("a zone lists itself, then its neighbours", () => {
    // as on n. sanity beach: itself, the zone before, the zone after
    const [self, before, after] = ["Bm01Z", "Bm00Z", "Bm02Z"].map(stringToEid);
    const header = zoneHeaderBytes(EMPTY_HEADER, self, [], 1, 0, [before, after]);
    expect(readZoneHeader(header).neighbours).toEqual([self, before, after]);
  });

  test("the template isn't changed", () => {
    const template = Buffer.alloc(ZONE_HEADER_SIZE, 0x11);
    zoneHeaderBytes(template, stringToEid("Flr0Z"), [], 0, 0);
    expect(template.every((byte) => byte === 0x11)).toBe(true);
  });
});

describe("load lists", () => {
  const ZONE_EID = stringToEid("Flr0Z");

  // a level of a zone's entry page then count texture pages, and its zone entry
  function levelWithTexturePages(count: number) {
    const zone = { eid: ZONE_EID, type: 7, items: [zoneHeaderBytes(EMPTY_HEADER, ZONE_EID, [], 0, 0)] };
    const texturePages = Array.from({ length: count }, (_, index) => texturePage(index + 1, Buffer.alloc(0)));
    const level = { nsd: null, pages: [entryPage([zone]), ...texturePages] } as unknown as Level;
    return { level, zone };
  }

  test("open every texture page", () => {
    // a zone's texture pages are only put in vram when its load list opens them (LevelUpdate, NSPageOpen)
    const { level, zone } = levelWithTexturePages(2);
    level.pages.splice(2, 0, entryPage([])); // texture pages anywhere among the others
    loadTexturePages(level, ZONE_EID);
    const header = zone.items[0];
    expect(readZoneHeader(header).loadList).toEqual({ entryCount: 0, pageCount: 2 });
    expect(readWords(header, ZONE_LOADLIST + 8 + 32, 2)).toEqual([pgid(1), pgid(3)]);
  });

  test("more texture pages than the game holds at once is an error saying so", () => {
    // the game keeps 32 texture pages (NS_TEXTURE_PAGE_COUNT in src/ns.h)
    expect(() => loadTexturePages(levelWithTexturePages(32).level, ZONE_EID)).not.toThrow();
    expect(() => loadTexturePages(levelWithTexturePages(33).level, ZONE_EID)).toThrow(/33 texture pages.*32/);
  });
});
