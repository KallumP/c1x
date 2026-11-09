// a cut level's textures: each polygon's texture info (texinfo2 in src/geom.h)
// read back into its region of a texture page, the inverse of texinfoBytes in
// builder/tpage.ts, and that region as an image
import type { RgbImage } from "../../builder/images";
import { LAYOUTS, SIZES } from "../../builder/tpage";
import { TEXINFOS_AT, type BuiltPolygon } from "../../builder/worldGeometry";
import type { CutWorld } from "./readCutLevel";

type Rgb = [number, number, number];

export interface TextureInfo {
  textured: boolean;
  colour: Rgb;       // its flat colour, or the colour its texture is shaded by
  colourMode: number; // 0 4 bit, 1 8 bit, 2 15 bit
  layout: number;     // which of the region's corners go on a triangle's (LAYOUTS)
  x: number;          // the region on the page, in pixels
  y: number;
  w: number;
  h: number;
  clutX: number;      // its palette, in 16 colours across and rows down
  clutY: number;
}

// a polygon's texture: its texture info, and the texture page it's on
export type PolygonTexture = TextureInfo & { page: number };

const ROW_BYTES = 512;                 // a texture page's rows (see tpage.ts)
const UNIT_BYTES = 4;                  // a region's x is in units of 4 bytes
const BITS_PER_PIXEL = [4, 8, 16];     // by colour mode
const PALETTE_BYTES_ACROSS = 32;       // clutX steps 16 colours
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

// the game's 16 bit colour (5 bits each of red, green, blue) as 8 bit
function colour8888(colour: number): Rgb {
  return [field(colour, 0, 5) << 3, field(colour, 5, 5) << 3, field(colour, 10, 5) << 3];
}

function paletteColour(page: Buffer, info: TextureInfo, index: number): number {
  return page.readUInt16LE(info.clutY * ROW_BYTES + info.clutX * PALETTE_BYTES_ACROSS + 2 * index);
}

// the 16 bit colour of the pixel at (x, y) on the page, as the region's colour mode reads it
function pixelColour(page: Buffer, info: TextureInfo, x: number, y: number): number {
  const row = y * ROW_BYTES;
  if (info.colourMode === 2) {
    return page.readUInt16LE(row + 2 * x);
  }
  if (info.colourMode === 1) {
    return paletteColour(page, info, page[row + x]);
  }
  return paletteColour(page, info, nibble(page[row + Math.floor(x / 2)], x));
}

// a 4 bit pixel from its byte: even pixels are in the low nibble
function nibble(byte: number, x: number): number {
  if (x % 2 === 0) {
    return byte & 0xf;
  }
  return byte >> 4;
}

// a textured region of a page, as an image
export function regionImage(page: Buffer, info: TextureInfo): RgbImage {
  const rgb = new Uint8Array(info.w * info.h * 3);
  for (let y = 0; y < info.h; y++) {
    for (let x = 0; x < info.w; x++) {
      rgb.set(colour8888(pixelColour(page, info, info.x + x, info.y + y)), (y * info.w + x) * 3);
    }
  }
  return { width: info.w, height: info.h, rgb };
}

// where each of a triangle's corners is on its region (0 left or top, 1 right or bottom), in layout's order
export function triangleUVs(layout: number): [number, number][] {
  return LAYOUTS[layout].map(([u, v]) => [u, v]);
}
