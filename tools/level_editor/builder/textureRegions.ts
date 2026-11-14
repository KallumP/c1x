// a region of one of the game's texture pages as an image: its pixels, in its
// colour mode, through its palette for 4 and 8 bit regions
import type { RgbImage } from "./images";

type Rgb = [number, number, number];

// where a region is on its page, and how its pixels are read
export interface TextureRegion {
  colourMode: number; // 0 4 bit, 1 8 bit, 2 15 bit
  x: number;          // the region on the page, in pixels at its colour mode
  y: number;
  w: number;
  h: number;
  clutX: number;      // its palette, in 16 colours across and rows down
  clutY: number;
}

const ROW_BYTES = 512;           // a texture page's rows (see tpage.ts)
const PALETTE_BYTES_ACROSS = 32; // clutX steps 16 colours

const field = (word: number, shift: number, bits: number) => (word >>> shift) & ((1 << bits) - 1);

// the game's 16 bit colour (5 bits each of red, green, blue) as 8 bit
function colour8888(colour: number): Rgb {
  return [field(colour, 0, 5) << 3, field(colour, 5, 5) << 3, field(colour, 10, 5) << 3];
}

function paletteColour(page: Buffer, region: TextureRegion, index: number): number {
  return page.readUInt16LE(region.clutY * ROW_BYTES + region.clutX * PALETTE_BYTES_ACROSS + 2 * index);
}

// a 4 bit pixel from its byte: even pixels are in the low nibble
function nibble(byte: number, x: number): number {
  if (x % 2 === 0) {
    return byte & 0xf;
  }
  return byte >> 4;
}

// the 16 bit colour of the pixel at (x, y) on the page, as the region's colour mode reads it
function pixelColour(page: Buffer, region: TextureRegion, x: number, y: number): number {
  const row = y * ROW_BYTES;
  if (region.colourMode === 2) {
    return page.readUInt16LE(row + 2 * x);
  }
  if (region.colourMode === 1) {
    return paletteColour(page, region, page[row + x]);
  }
  return paletteColour(page, region, nibble(page[row + Math.floor(x / 2)], x));
}

// a region of a page, as an image
export function regionImage(page: Buffer, region: TextureRegion): RgbImage {
  const rgb = new Uint8Array(region.w * region.h * 3);
  for (let y = 0; y < region.h; y++) {
    for (let x = 0; x < region.w; x++) {
      rgb.set(colour8888(pixelColour(page, region, region.x + x, region.y + y)), (y * region.w + x) * 3);
    }
  }
  return { width: region.w, height: region.h, rgb };
}
