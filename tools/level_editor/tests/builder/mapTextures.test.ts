import { describe, expect, test } from "vitest";
import { ByteWriter } from "../../builder/bytes";
import type { RgbImage } from "../../builder/images";
import { textureWorlds } from "../../builder/mapTextures";
import type { TileRegion, WorldMesh, WorldVertex } from "../../builder/worldMeshes";

const STONE_RGB: [number, number, number] = [90, 90, 100];
const stone = (): RgbImage => ({ width: 32, height: 32, rgb: new Uint8Array(32 * 32 * 3).map((_, index) => STONE_RGB[index % 3]) });

// a mesh header to texture meshes from: its own texinfos (2 words) on its one texture page
const TEMPLATE_TEXINFO_WORDS = 2;
const TEMPLATE_PAGE_COUNT = 1;
const TEMPLATE = new ByteWriter()
  .s32(0).s32(0).s32(0) // its origin
  .u32(0).u32(0) // its polygon and vertex counts
  .u32(TEMPLATE_TEXINFO_WORDS).u32(TEMPLATE_PAGE_COUNT)
  .u32(0) // not a backdrop
  .bytes(Buffer.alloc(32)) // its 8 texture page slots
  .bytes(Buffer.from("TEX!TEX?", "latin1")) // its texinfos
  .toBuffer();
const REGION_TEXINFO_BYTES = 8; // a tile region's texinfo: 2 words

describe("texturing world meshes", () => {
  test("each mesh holds only the texture regions it uses", () => {
    // a mesh header's texinfos are indexed by 12 bits of words, so each mesh lists its own
    const a: TileRegion = { material: "stone", x: 0, y: 0, w: 32, h: 32, layout: 0 };
    const b: TileRegion = { material: "stone", x: 32, y: 0, w: 32, h: 32, layout: 0 };
    const vertices: WorldVertex[] = Array(3).fill({ at: [0, 0, 0], colour: [128, 128, 128] });
    const worlds: WorldMesh[] = [
      { vertices, polygons: [{ corners: [0, 1, 2], texture: a }, { corners: [0, 1, 2], texture: { ...a } }] },
      { vertices, polygons: [{ corners: [0, 1, 2], texture: b }] },
    ];
    const textured = textureWorlds(worlds, new Map([["stone", stone()]]), TEMPLATE);
    expect(textured.texinfos.map((texinfos) => texinfos.length)).toEqual([REGION_TEXINFO_BYTES, REGION_TEXINFO_BYTES]); // one region each
    expect(textured.worlds[0].polygons.map(({ texinfo }) => texinfo)).toEqual([TEMPLATE_TEXINFO_WORDS, TEMPLATE_TEXINFO_WORDS]); // after the template's
    expect(textured.worlds[1].polygons.map(({ texinfo }) => texinfo)).toEqual([TEMPLATE_TEXINFO_WORDS]);
    expect(textured.texinfos[0].equals(textured.texinfos[1])).toBe(false);
  });
});
