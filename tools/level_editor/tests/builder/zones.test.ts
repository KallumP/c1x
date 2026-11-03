import { describe, expect, test } from "vitest";
import { readWords } from "../../builder/bytes";
import { EID_NONE, stringToEid } from "../../builder/entryIds";
import { entryPage, texturePage, type Level } from "../../builder/levelFiles";
import { pgid } from "../../builder/levelWriting";
import {
  loadTexturePages, ZONE_HEADER_SIZE, ZONE_LOADLIST, ZONE_MIDI, ZONE_NEIGHBORS, ZONE_PATHS_IDX, zoneHeaderBytes,
} from "../../builder/zones";

const EMPTY_HEADER = Buffer.alloc(ZONE_HEADER_SIZE);

describe("zone headers", () => {
  test("their fields", () => {
    const world = stringToEid("Flr0W");
    const self = stringToEid("Flr0Z");
    const header = zoneHeaderBytes(EMPTY_HEADER, self, [{ eid: world, origin: [1, 2, 3] }], 1, 1);
    expect(header.readUInt32LE(0)).toBe(1);
    expect([header.readUInt32LE(4), header.readInt32LE(8), header.readInt32LE(12), header.readInt32LE(16)]).toEqual([world, 1, 2, 3]);
    expect(readWords(header, ZONE_PATHS_IDX, 4)).toEqual([2, 1, 1, 1]);
    expect(header.readUInt32LE(ZONE_NEIGHBORS)).toBe(self);
    expect([header.readInt32LE(ZONE_LOADLIST), header.readInt32LE(ZONE_LOADLIST + 4)]).toEqual([0, 0]);
    expect(header.readUInt32LE(ZONE_MIDI)).toBe(EID_NONE);
  });

  test("a zone lists itself, then its neighbours", () => {
    // as on n. sanity beach: itself, the zone before, the zone after
    const [self, before, after] = ["Bm01Z", "Bm00Z", "Bm02Z"].map(stringToEid);
    const header = zoneHeaderBytes(EMPTY_HEADER, self, [], 1, 0, [before, after]);
    expect(header.readUInt32LE(ZONE_PATHS_IDX + 12)).toBe(3);
    expect(readWords(header, ZONE_NEIGHBORS, 4)).toEqual([self, before, after, 0]);
  });

  test("the template isn't changed", () => {
    const template = Buffer.alloc(ZONE_HEADER_SIZE, 0x11);
    zoneHeaderBytes(template, stringToEid("Flr0Z"), [], 0, 0);
    expect(template.every((byte) => byte === 0x11)).toBe(true);
  });
});

describe("load lists", () => {
  test("open every texture page", () => {
    // a zone's texture pages are only put in vram when its load list opens them (LevelUpdate, NSPageOpen)
    const zoneEid = stringToEid("Flr0Z");
    const zone = { eid: zoneEid, type: 7, items: [zoneHeaderBytes(EMPTY_HEADER, zoneEid, [], 0, 0)] };
    const pages = [entryPage([zone]), texturePage(1, Buffer.alloc(0)), entryPage([]), texturePage(3, Buffer.alloc(0))];
    const level = { nsd: null, pages } as unknown as Level;
    loadTexturePages(level, zoneEid);
    const header = zone.items[0];
    expect([header.readInt32LE(ZONE_LOADLIST), header.readInt32LE(ZONE_LOADLIST + 4)]).toEqual([0, 2]);
    expect(readWords(header, ZONE_LOADLIST + 8 + 32, 2)).toEqual([pgid(1), pgid(3)]);
  });
});
