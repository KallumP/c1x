// a level source's game textures (see doc/custom_levels.md): images that are
// regions of the game's own texture pages, named in its game_textures.json and
// made from the player's own copy of the game, so they needn't be shared
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eidToString } from "./entryIds";
import { pngBytes, type RgbImage } from "./images";
import { PAGE_SIZE, PAGE_TEXTURE, readPages } from "./levelFiles";
import { regionImage } from "./textureRegions";
import { SIZES } from "./tpage";

export const GAME_TEXTURES_FILE = "game_textures.json";

// an image's region: which of the game's files (a stream, such as s0000004)
// and texture page it's on, and where (as a polygon's texture info has it)
export interface GameTexture {
  stream: string;
  page: string;       // the texture page's entry name
  colourMode: number; // 0 4 bit, 1 8 bit, 2 15 bit
  x: number;          // the region on the page, in pixels at its colour mode
  y: number;
  w: number;
  h: number;
  clutX: number;      // its palette, in 16 colours across and rows down
  clutY: number;
}

const PAGE_ROW_BYTES = 512;
const PAGE_ROWS = 128;
const BITS_PER_PIXEL = [4, 8, 16]; // by colour mode
const CLUT_X_MAX = 15;
const CLUT_Y_MAX = 127;
const NUMBERS = ["colourMode", "x", "y", "w", "h", "clutX", "clutY"] as const;

const describe = (value: unknown) => (typeof value === "string" ? `"${value}"` : String(value));

// a page's width in pixels at a colour mode
export const pageWidth = (colourMode: number) => (PAGE_ROW_BYTES * 8) / BITS_PER_PIXEL[colourMode];

function checkImageName(name: string): void {
  if (!name.toLowerCase().endsWith(".png") || /[\\/]/.test(name)) {
    throw new Error(`${name} has to be a .png in the level's folder`);
  }
}

function checkStreamAndPage(name: string, { stream, page }: Record<string, unknown>): void {
  if (typeof stream !== "string" || !/^s[0-9a-f]{7}$/.test(stream)) {
    throw new Error(`${name}'s stream has to be one of the game's files, like s0000004, not ${describe(stream)}`);
  }
  if (typeof page !== "string" || page === "") {
    throw new Error(`${name}'s page has to be a texture page's entry name`);
  }
}

function checkWholeNumbers(name: string, texture: Record<string, unknown>): void {
  const notWhole = NUMBERS.find((field) => !Number.isInteger(texture[field]));
  if (notWhole) {
    throw new Error(`${name}'s ${notWhole} has to be a whole number, not ${describe(texture[notWhole])}`);
  }
}

function checkInRange(name: string, field: string, value: number, max: number): void {
  if (value < 0 || value > max) {
    throw new Error(`${name}'s ${field} has to be 0 to ${max}, not ${value}`);
  }
}

function checkRegion(name: string, texture: GameTexture): void {
  if (![0, 1, 2].includes(texture.colourMode)) {
    throw new Error(`${name}'s colourMode has to be 0, 1 or 2, not ${texture.colourMode}`);
  }
  const badSize = (["w", "h"] as const).find((field) => !SIZES.includes(texture[field]));
  if (badSize) {
    throw new Error(`${name}'s ${badSize} has to be ${SIZES.slice(0, -1).join(", ")} or ${SIZES.at(-1)}, not ${texture[badSize]}`);
  }
  const width = pageWidth(texture.colourMode);
  if (texture.x < 0 || texture.y < 0 || texture.x + texture.w > width || texture.y + texture.h > PAGE_ROWS) {
    throw new Error(`${name}'s region goes off its page, which is ${width} by ${PAGE_ROWS} at its colour mode`);
  }
  checkInRange(name, "clutX", texture.clutX, CLUT_X_MAX);
  checkInRange(name, "clutY", texture.clutY, CLUT_Y_MAX);
}

function gameTexture(name: string, value: unknown): GameTexture {
  checkImageName(name);
  const fields = (value ?? {}) as Record<string, unknown>;
  checkStreamAndPage(name, fields);
  checkWholeNumbers(name, fields);
  const texture = Object.fromEntries(["stream", "page", ...NUMBERS].map((field) => [field, fields[field]])) as unknown as GameTexture;
  checkRegion(name, texture);
  return texture;
}

function parseGameTextures(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${GAME_TEXTURES_FILE} isn't valid JSON: ${error instanceof Error ? error.message : error}`);
  }
}

// the game textures a level source's folder names, by image file name; none without a game_textures.json
export function readGameTextures(folder: string): Map<string, GameTexture> {
  const path = join(folder, GAME_TEXTURES_FILE);
  if (!existsSync(path)) {
    return new Map();
  }
  const entries = Object.entries(parseGameTextures(readFileSync(path, "utf8")));
  try {
    return new Map(entries.map(([name, value]) => [name, gameTexture(name, value)]));
  } catch (error) {
    throw new Error(`${GAME_TEXTURES_FILE}: ${error instanceof Error ? error.message : error}`);
  }
}

// a stream's texture pages, by entry name, read from its .nsf alone (as cut levels are; see scripts/cutLevel/readCutLevel.ts)
export function readStreamTexturePages(streamsDir: string, stream: string): Map<string, Buffer> {
  const path = join(streamsDir, `${stream}.nsf`);
  if (!existsSync(path)) {
    throw new Error(`${stream}.nsf isn't in ${streamsDir}`);
  }
  const nsf = readFileSync(path);
  const pages = readPages(nsf, Math.floor(nsf.length / PAGE_SIZE)).filter((page) => page.type === PAGE_TEXTURE);
  return new Map(pages.map((page) => [eidToString(page.eid), page.data]));
}

// the image name's game texture, from its stream's texture pages
export function gameTextureImage(name: string, texture: GameTexture, pages: Map<string, Buffer>): RgbImage {
  const page = pages.get(texture.page);
  if (!page) {
    throw new Error(`${name}'s page ${texture.page} isn't one of ${texture.stream}'s texture pages`);
  }
  return regionImage(page, texture);
}

// each missing image's stream has to be in streamsDir; it says which image needs which
function checkStreamsThere(missing: [string, GameTexture][], streamsDir: string): void {
  const notThere = missing.find(([, texture]) => !existsSync(join(streamsDir, `${texture.stream}.nsf`)));
  if (notThere) {
    const [name, { stream }] = notThere;
    throw new Error(`${name} is from the game's ${stream}.nsf, which isn't in ${streamsDir} (see doc/running.md)`);
  }
}

// writes the game textures a level source's folder names but doesn't have, from
// the game's files in streamsDir; the names of the images it wrote
export function writeGameTextures(folder: string, streamsDir: string): string[] {
  const missing = [...readGameTextures(folder)].filter(([name]) => !existsSync(join(folder, name)));
  checkStreamsThere(missing, streamsDir);
  const pagesByStream = new Map<string, Map<string, Buffer>>();
  const pagesOf = (stream: string) => {
    if (!pagesByStream.has(stream)) {
      pagesByStream.set(stream, readStreamTexturePages(streamsDir, stream));
    }
    return pagesByStream.get(stream)!;
  };
  for (const [name, texture] of missing) {
    writeFileSync(join(folder, name), pngBytes(gameTextureImage(name, texture, pagesOf(texture.stream))));
  }
  return missing.map(([name]) => name);
}
