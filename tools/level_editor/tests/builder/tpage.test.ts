import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  colour5551, LAYOUTS, texinfoBytes, texturePage, TILES_PER_PAGE, uvIndex, type Place, type Tile,
} from "../../builder/tpage";

const EID = 0x12345679;

describe("colours", () => {
  test("5551 is red in the low bits, then green, then blue", () => {
    expect(colour5551([255, 128, 64])).toBe(31 | (16 << 5) | (8 << 10)); // pixel_5551_8888 in src/pc/gfx/pixel.h
  });

  test("black isn't transparent", () => {
    expect(colour5551([0, 0, 0])).not.toBe(0);
    expect(colour5551([7, 7, 7])).not.toBe(0);
  });
});

// a 4 bit pixel of a page, read as TextureCopy in src/pc/gfx/tex.c does
function pixelAt(page: Buffer, x: number, y: number): number {
  const index = x + y * 1024;
  return (page[Math.floor(index / 2)] >> (index % 2 ? 4 : 0)) & 0xf;
}

function paletteAt(page: Buffer, place: Place): number[] {
  const start = 2 * (place.clutX * 16 + place.clutY * 256);
  return Array.from({ length: 16 }, (_, colour) => page.readUInt16LE(start + 2 * colour));
}

// the pixel x the game finds a region at: (segment * 32 + offs_x) * 8 for 4 bits
const regionX = (place: Place) => (place.segment * 32 + place.offsX) * 8;

function testTiles(count: number): Tile[] {
  return Array.from({ length: count }, (_, k) => ({
    pixels: Array.from({ length: 64 * 64 }, (_, i) => (i + k) % 16),
    palette: Array.from({ length: 16 }, (_, colour) => k * 100 + colour + 1),
  }));
}

const header = (page: Buffer) => [page.readUInt16LE(0), page.readUInt16LE(2), page.readUInt32LE(4), page.readUInt32LE(8)];

describe("texture pages", () => {
  test("a page is 64 KB with a texture page header", () => {
    const { page } = texturePage(EID, testTiles(1));
    expect(page.length).toBe(0x10000);
    expect(header(page)).toEqual([0x1234, 1, EID, 5]);
  });

  test("tiles are where their places say", () => {
    const tiles = testTiles(20);
    const { page, places } = texturePage(EID, tiles);
    tiles.forEach((tile, k) => {
      const x = regionX(places[k]);
      const y = places[k].offsY * 4;
      for (const py of [0, 1, 63]) {
        for (const px of [0, 1, 62, 63]) {
          expect(pixelAt(page, x + px, y + py)).toBe(tile.pixels[px + py * 64]);
        }
      }
      expect(paletteAt(page, places[k])).toEqual(tile.palette);
    });
  });

  test("tiles and palettes don't overlap the header or each other", () => {
    const { places } = texturePage(EID, testTiles(TILES_PER_PAGE));
    expect(new Set(places.map((place) => `${regionX(place)},${place.offsY}`)).size).toBe(places.length);
    expect(new Set(places.map((place) => `${place.clutX},${place.clutY}`)).size).toBe(places.length);
    for (const place of places) {
      expect(place.clutY).toBeGreaterThan(0); // row 0 has the header
      expect(regionX(place) >= 64 || place.offsY * 4 >= 64).toBe(true); // not in the palettes' slot
    }
  });

  test("more tiles than a page holds is an error", () => {
    expect(() => texturePage(EID, testTiles(TILES_PER_PAGE + 1))).toThrow();
  });
});

// the 600 quads of uv_map in src/gfx.c, as 8 numbers each
function readUvMap(): number[][] {
  const source = readFileSync(fileURLToPath(new URL("../../../../src/gfx.c", import.meta.url)), "utf8");
  const body = source.slice(source.indexOf("uv_map[600] = {"));
  const pair = String.raw`\{\s*(\d+),\s*(\d+)\s*\}`;
  const quad = new RegExp(String.raw`\{\s*` + Array(4).fill(pair).join(String.raw`,\s*`) + String.raw`\s*\}`, "g");
  return [...body.matchAll(quad)].slice(0, 600).map((match) => match.slice(1).map(Number));
}

// which corner of a width by height region each of a uv_map quad's first three points is: [0 or 1, 0 or 1]
function cornerLayout(quad: number[], width: number, height: number): number[][] {
  return [0, 1, 2].map((point) => [Math.floor(quad[2 * point] / (width - 1)), Math.floor(quad[2 * point + 1] / (height - 1))]);
}

// a texture info's colinfo and rgninfo fields; bitfields are listed high bits first in src/geom.h
function decodeTexinfo(data: Buffer) {
  const flags = data[3];
  const region = data.readUInt32LE(4);
  return {
    colour: { type: flags >> 7, semiTrans: (flags >> 5) & 3, noCull: (flags >> 4) & 1, clutX: flags & 15 },
    region: {
      uvIndex: region >>> 22, colourMode: (region >> 20) & 3, segment: (region >> 18) & 3,
      offsX: (region >> 13) & 31, clutY: (region >> 6) & 127, offsY: region & 31,
    },
  };
}

describe("texture infos", () => {
  const uvMap = readUvMap();

  test("the layouts are the game's", () => {
    expect(uvMap.length).toBe(600);
    LAYOUTS.forEach((corners, layout) => {
      const quad = uvMap[layout * 25 + 24]; // the 64x64 one
      expect(cornerLayout(quad, 64, 64)).toEqual(corners);
    });
  });

  test("uvIndex picks the layout and size", () => {
    for (const layout of [0, 7, 23]) {
      for (const [w, h] of [[4, 4], [32, 64], [64, 8]]) {
        const quad = uvMap[uvIndex(layout, w, h)];
        const xs = [quad[0], quad[2], quad[4]];
        const ys = [quad[1], quad[3], quad[5]];
        expect([Math.max(...xs), Math.max(...ys)]).toEqual([w - 1, h - 1]); // triangles use 3 points
        expect(cornerLayout(quad, w, h)).toEqual(LAYOUTS[layout]);
      }
    }
  });

  test("a texture info points at the tile's region and palette", () => {
    const place: Place = { segment: 1, offsX: 8, offsY: 16, clutX: 0, clutY: 5 }; // x (32 + 8) * 8 = 320, y 64
    const { colour, region } = decodeTexinfo(texinfoBytes(place, 3, { x: 32, y: 16, w: 32, h: 16 }));
    expect(colour).toEqual({ type: 1, semiTrans: 3, noCull: 0, clutX: 0 });
    expect(region.uvIndex).toBe(uvIndex(3, 32, 16));
    expect(region.colourMode).toBe(0); // 4 bit
    expect((region.segment * 32 + region.offsX) * 8).toBe(320 + 32);
    expect(region.offsY * 4).toBe(64 + 16);
    expect(region.clutY).toBe(5);
  });

  test("a region has to fit the game's steps", () => {
    const place: Place = { segment: 0, offsX: 8, offsY: 0, clutX: 0, clutY: 1 };
    for (const [x, y, w, h] of [[4, 0, 32, 32], [0, 2, 32, 32], [0, 0, 24, 32], [0, 0, 32, 2], [48, 0, 32, 32]]) {
      expect(() => texinfoBytes(place, 0, { x, y, w, h })).toThrow();
    }
  });
});
