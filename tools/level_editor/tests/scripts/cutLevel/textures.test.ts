import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { texinfoBytes, texturePage, TILE } from "../../../builder/tpage";
import { readCutLevel } from "../../../scripts/cutLevel/readCutLevel";
import { polygonTexture, readTexinfo, regionImage, triangleUVs } from "../../../scripts/cutLevel/textures";

// a tile whose pixel at (x, y) is palette colour (x + y) % 16, each colour a shade of red
const palette = Array.from({ length: 16 }, (_, index) => (index * 2) || 1); // 5 bit red: index * 16 in 8 bit
const pixels = Array.from({ length: TILE * TILE }, (_, index) => ((index % TILE) + Math.floor(index / TILE)) % 16);
const { page, places } = texturePage(0x12345671, [{ pixels, palette }]);
const header = (texinfo: Buffer) => Buffer.concat([Buffer.alloc(64), texinfo]); // texinfos start at 64, word 0 here

describe("a cut level's textures", () => {
  test("a texture info gives its region of the page: where, how big, its palette and the order of its corners", () => {
    const info = readTexinfo(header(texinfoBytes(places[0], 5, { x: 8, y: 4, w: 16, h: 32 })), 0);
    expect(info).toMatchObject({ textured: true, colourMode: 0, layout: 5, x: 64 + 8, y: 4, w: 16, h: 32, clutX: 0, clutY: 1 });
  });

  test("a region's image is its pixels in their palette's colours", () => {
    const info = readTexinfo(header(texinfoBytes(places[0], 0, { x: 0, y: 0, w: 8, h: 4 })), 0);
    const image = regionImage(page, info);
    expect([image.width, image.height]).toEqual([8, 4]);
    // pixel (3, 2) is colour 5: red 10 of 31, 80 in 8 bit
    expect([...image.rgb.subarray((2 * 8 + 3) * 3, (2 * 8 + 3) * 3 + 3)]).toEqual([80, 0, 0]);
  });

  test("an untextured texture info is a flat colour", () => {
    const flat = Buffer.from([200, 100, 50, 0, 0, 0, 0, 0]);
    expect(readTexinfo(header(flat), 0)).toMatchObject({ textured: false, colour: [200, 100, 50] });
  });

  test("a triangle's corners take the region's corners in its layout's order", () => {
    expect(triangleUVs(0)).toEqual([[0, 0], [1, 0], [0, 1]]);
    expect(triangleUVs(5)).toEqual([[0, 1], [1, 0], [0, 0]]);
  });
});

const ACID_CAVE = fileURLToPath(new URL("../../../../../streams/s0000004.nsf", import.meta.url));

describe.skipIf(!existsSync(ACID_CAVE))("the acid cave's textures", () => {
  const level = readCutLevel(ACID_CAVE);

  test("every textured polygon's region is on one of its texture pages", () => {
    for (const world of level.worlds) {
      for (const polygon of world.polygons) {
        const texture = polygonTexture(world, polygon);
        if (texture.textured) {
          expect(level.texturePages.has(texture.page)).toBe(true);
        }
      }
    }
  });
});
