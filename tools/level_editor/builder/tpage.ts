// texture pages (tpag) for custom levels: images as 16 colour tiles on a page
// the game loads into vram, and the texture infos that put a part of a tile on
// a polygon. see src/pc/gfx/tex.c for how the game reads them

export const TILE = 64;    // tiles are TILE x TILE pixels, the largest texture region (uv_map in src/gfx.c)
export const COLOURS = 16; // 4 bit textures: each tile has a palette of 16 colours

export type Rgb = [number, number, number];

// a tile: its pixels row by row as palette indices, and its palette of COLOURS 16 bit colours
export interface Tile {
  pixels: number[];
  palette: number[];
}

// an (r, g, b) colour (0-255) as the game's 16 bit colour: 5 bits each of red,
// green and blue from the low bits up (pixel_5551_8888 in src/pc/gfx/pixel.h).
// 0 is drawn transparent, so black is nudged off it
export function colour5551([red, green, blue]: Rgb): number {
  return ((red >> 3) | ((green >> 3) << 5) | ((blue >> 3) << 10)) || 1;
}

// a texture page is the whole 64 KB page (header included) read as ROWS rows
// of ROW_BYTES bytes: 1024 4 bit pixels, or 256 16 bit colours. it's split
// into TILE x TILE slots; the first holds the header in its top row, so it
// holds the tiles' palettes instead, one a row from row 1 (16 colours are
// 32 bytes, just the slot's width)
export const PAGE_SIZE = 0x10000;
const ROWS = 128;
const ROW_BYTES = 512;
const SLOTS_ACROSS = (ROW_BYTES * 2) / TILE;
export const TILES_PER_PAGE = SLOTS_ACROSS * (ROWS / TILE) - 1;
const MAGIC_PAGE = 0x1234;
const PAGE_TEXTURE = 1;
const ENTRY_TPAG = 5;

// where a tile is on its page, as a texture info gives it: x in units of 8
// pixels (4 bit) as segment * 32 + offsX, y in units of 4 rows as offsY, and
// its palette at 16 bit colour (clutX * 16, clutY)
export interface Place {
  segment: number;
  offsX: number;
  offsY: number;
  clutX: number;
  clutY: number;
}

function writeTilePixels(page: Buffer, pixels: number[], slotX: number, slotY: number): void {
  for (let y = 0; y < TILE; y++) {
    const row = (slotY + y) * ROW_BYTES;
    for (let x = 0; x < TILE; x += 2) {
      const even = pixels[y * TILE + x];
      const odd = pixels[y * TILE + x + 1];
      page[row + (slotX + x) / 2] = even | (odd << 4); // even pixels in the low nibble
    }
  }
}

function writePalette(page: Buffer, palette: number[], row: number): void {
  palette.forEach((colour, index) => page.writeUInt16LE(colour, row * ROW_BYTES + 2 * index));
}

function writePageHeader(page: Buffer, eid: number): void {
  page.writeUInt16LE(MAGIC_PAGE, 0);
  page.writeUInt16LE(PAGE_TEXTURE, 2);
  page.writeUInt32LE(eid, 4);
  page.writeUInt32LE(ENTRY_TPAG, 8);
  page.writeUInt32LE(0, 12);
}

// a texture page holding tiles: its bytes, and each tile's place on it
export function texturePage(eid: number, tiles: Tile[]): { page: Buffer; places: Place[] } {
  if (tiles.length > TILES_PER_PAGE) {
    throw new Error(`${tiles.length} tiles, more than a page holds (${TILES_PER_PAGE})`);
  }
  const page = Buffer.alloc(PAGE_SIZE);
  const places = tiles.map((tile, index) => {
    const slot = index + 1; // slot 0 holds the header and palettes
    const slotX = (slot % SLOTS_ACROSS) * TILE;
    const slotY = Math.floor(slot / SLOTS_ACROSS) * TILE;
    const paletteRow = 1 + index;
    writeTilePixels(page, tile.pixels, slotX, slotY);
    writePalette(page, tile.palette, paletteRow);
    const unit = slotX / 8;
    return { segment: Math.floor(unit / 32), offsX: unit % 32, offsY: slotY / 4, clutX: 0, clutY: paletteRow };
  });
  writePageHeader(page, eid);
  return { page, places };
}

// texture infos (texinfo2 in src/geom.h, 8 bytes in a world mesh's header): a
// region of a texture page and which of its corners go on a triangle's three
// corners. LAYOUTS are uv_map's 24 orders (src/gfx.c): every ordered pick of 3
// of the region's 4 corners, as (x, y) with 0 left/top, 1 right/bottom
type Corner = [number, number];

export const LAYOUTS: Corner[][] = [
  [[0, 0], [1, 0], [0, 1]], [[0, 0], [0, 1], [1, 0]], [[1, 0], [0, 1], [0, 0]],
  [[1, 0], [0, 0], [0, 1]], [[0, 1], [0, 0], [1, 0]], [[0, 1], [1, 0], [0, 0]],
  [[0, 0], [1, 0], [1, 1]], [[0, 0], [1, 1], [1, 0]], [[1, 0], [1, 1], [0, 0]],
  [[1, 0], [0, 0], [1, 1]], [[1, 1], [0, 0], [1, 0]], [[1, 1], [1, 0], [0, 0]],
  [[1, 0], [1, 1], [0, 1]], [[1, 0], [0, 1], [1, 1]], [[1, 1], [0, 1], [1, 0]],
  [[1, 1], [1, 0], [0, 1]], [[0, 1], [1, 0], [1, 1]], [[0, 1], [1, 1], [1, 0]],
  [[0, 0], [1, 1], [0, 1]], [[0, 0], [0, 1], [1, 1]], [[1, 1], [0, 1], [0, 0]],
  [[1, 1], [0, 0], [0, 1]], [[0, 1], [0, 0], [1, 1]], [[0, 1], [1, 1], [0, 0]],
];
export const SIZES = [4, 8, 16, 32, 64]; // region widths and heights
const SEMI_TRANS = 3;                    // as n. sanity beach's world textures

// a region of a tile, in pixels
export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

// uv_map's index for a layout and a w x h region
export function uvIndex(layout: number, w: number, h: number): number {
  return layout * 25 + SIZES.indexOf(h) * 5 + SIZES.indexOf(w);
}

// regions are a power of two 4 to 64 pixels a side, at x on 8 pixels (the step
// for 4 bit textures) and y on 4, inside the tile
function isAddressable({ x, y, w, h }: Region): boolean {
  const isSize = SIZES.includes(w) && SIZES.includes(h);
  const isOnStep = x % 8 === 0 && y % 4 === 0;
  const isInside = x >= 0 && y >= 0 && x + w <= TILE && y + h <= TILE;
  return isSize && isOnStep && isInside;
}

// a texture info for a region of the tile at place, put on a triangle's corners in layout
export function texinfoBytes(place: Place, layout: number, region: Region): Buffer {
  if (!isAddressable(region)) {
    throw new Error(`region ${JSON.stringify(region)} isn't one the game can address in a tile`);
  }
  const unit = place.segment * 32 + place.offsX + region.x / 8;
  const flags = (1 << 7) | (SEMI_TRANS << 5) | place.clutX; // type 1 (textured), no_cull 0
  const regionInfo = (uvIndex(layout, region.w, region.h) << 22)
    | (0 << 20) // 4 bit colour
    | (Math.floor(unit / 32) << 18)
    | ((unit % 32) << 13)
    | (place.clutY << 6)
    | (place.offsY + region.y / 4);
  const data = Buffer.alloc(8);
  data[3] = flags;
  data.writeUInt32LE(regionInfo >>> 0, 4);
  return data;
}
