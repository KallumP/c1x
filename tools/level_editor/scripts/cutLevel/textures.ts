// a cut level's textures: each polygon's texture info (texinfo2 in src/geom.h)
// read back into its region of a texture page, the inverse of texinfoBytes in
// builder/tpage.ts; builder/textureRegions.ts makes that region an image
import type { TextureRegion } from "../../builder/textureRegions";
import { LAYOUTS, SIZES } from "../../builder/tpage";
import { TEXINFOS_AT, type BuiltPolygon } from "../../builder/worldGeometry";
import type { CutWorld } from "./readCutLevel";

export { regionImage } from "../../builder/textureRegions";

type Rgb = [number, number, number];

export interface TextureInfo extends TextureRegion {
  textured: boolean;
  colour: Rgb;    // its flat colour, or the colour its texture is shaded by
  layout: number; // which of the region's corners go on a triangle's (LAYOUTS)
}

// a polygon's texture: its texture info, and the texture page it's on
export type PolygonTexture = TextureInfo & { page: number };

const UNIT_BYTES = 4;                  // a region's x is in units of 4 bytes
const BITS_PER_PIXEL = [4, 8, 16];     // by colour mode
const TEXTURED = 0x80;                 // the colour info's flags byte: type 1, textured

const field = (word: number, shift: number, bits: number) => (word >>> shift) & ((1 << bits) - 1);

// region, size and layout from uv_map's index (uvIndex in tpage.ts)
function uvShape(uvIndex: number) {
  const size = uvIndex % 25;
  return { layout: Math.floor(uvIndex / 25), w: SIZES[size % 5], h: SIZES[Math.floor(size / 5)] };
}

// the texture info at word wordIndex of a world mesh's header
export function readTexinfo(header: Buffer, wordIndex: number): TextureInfo {
  const at = TEXINFOS_AT + 4 * wordIndex;
  const colour: Rgb = [header[at], header[at + 1], header[at + 2]];
  const flags = header[at + 3];
  const flat = { textured: false, colour, colourMode: 0, layout: 0, x: 0, y: 0, w: 0, h: 0, clutX: 0, clutY: 0 };
  if (!(flags & TEXTURED)) {
    return flat;
  }
  const region = header.readUInt32LE(at + 4);
  const colourMode = field(region, 20, 2);
  const unit = field(region, 18, 2) * 32 + field(region, 13, 5);
  return {
    ...flat,
    textured: true,
    colourMode,
    ...uvShape(field(region, 22, 10)),
    x: (unit * UNIT_BYTES * 8) / BITS_PER_PIXEL[colourMode],
    y: field(region, 0, 5) * 4,
    clutX: field(flags, 0, 4),
    clutY: field(region, 6, 7),
  };
}

export function polygonTexture(world: CutWorld, polygon: BuiltPolygon): PolygonTexture {
  return { ...readTexinfo(world.header, polygon.texinfo), page: world.pages[polygon.page] };
}

// where each of a triangle's corners is on its region (0 left or top, 1 right or bottom), in layout's order
export function triangleUVs(layout: number): [number, number][] {
  return LAYOUTS[layout].map(([u, v]) => [u, v]);
}
