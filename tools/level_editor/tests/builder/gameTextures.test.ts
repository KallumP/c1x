import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { eidToString } from "../../builder/entryIds";
import { gameTextureImage, readGameTextures, readStreamTexturePages, writeGameTextures, type GameTexture } from "../../builder/gameTextures";
import { readImage } from "../../builder/images";
import { texinfoBytes, texturePage, TILE } from "../../builder/tpage";
import { readTexinfo } from "../../scripts/cutLevel/textures";

// a texture page whose pixel at (x, y) is palette colour (x + y) % 16, each colour a shade of red
// (5 bit red, so index * 16 in 8 bit; never 0, which the game takes as see-through)
const PAGE_EID = 0x12345671;
const redShade = (index: number) => Math.max(index * 2, 1);
const palette = Array.from({ length: 16 }, (_, index) => redShade(index));
const pixels = Array.from({ length: TILE * TILE }, (_, index) => ((index % TILE) + Math.floor(index / TILE)) % 16);
const { page, places } = texturePage(PAGE_EID, [{ pixels, palette }]);

// a streams folder holding s0000004.nsf, whose only page is that texture page
function streamsWithPage(): string {
  const streams = mkdtempSync(join(tmpdir(), "game-textures-streams-"));
  writeFileSync(join(streams, "s0000004.nsf"), page);
  return streams;
}

// the region of the page's tile from (x, y), w by h, as a polygon's texture info has it
function tileRegion(x: number, y: number, w: number, h: number): GameTexture {
  const header = Buffer.concat([Buffer.alloc(64), texinfoBytes(places[0], 0, { x, y, w, h })]); // texinfos start at 64
  const { colourMode, x: pageX, y: pageY, clutX, clutY } = readTexinfo(header, 0);
  return { stream: "s0000004", page: eidToString(PAGE_EID), colourMode, x: pageX, y: pageY, w, h, clutX, clutY };
}

const ROCK: GameTexture = { stream: "s0000004", page: "abcde", colourMode: 1, x: 64, y: 32, w: 32, h: 16, clutX: 3, clutY: 120 };

// a level source's folder, with a game_textures.json of text if it's given
function sourceFolder(text?: string): string {
  const folder = mkdtempSync(join(tmpdir(), "game-textures-"));
  if (text !== undefined) {
    writeFileSync(join(folder, "game_textures.json"), text);
  }
  return folder;
}

const readWith = (textures: object) => () => readGameTextures(sourceFolder(JSON.stringify(textures)));
const readRock = (changes: object) => readWith({ "rock.png": { ...ROCK, ...changes } });

describe("a level source's game textures", () => {
  test("each image's stream, texture page and region, by its file name", () => {
    const textures = readGameTextures(sourceFolder(JSON.stringify({ "rock.png": ROCK })));
    expect([...textures]).toEqual([["rock.png", ROCK]]);
  });

  test("a source without game_textures.json has none", () => {
    expect(readGameTextures(sourceFolder()).size).toBe(0);
  });

  test("a game_textures.json that isn't json is an error", () => {
    expect(() => readGameTextures(sourceFolder("{ rock"))).toThrow(/^game_textures\.json isn't valid JSON/);
  });

  test("its images are .png files in the source's folder", () => {
    expect(readWith({ "rock.jpg": ROCK })).toThrow("game_textures.json: rock.jpg has to be a .png in the level's folder");
    expect(readWith({ "sub/rock.png": ROCK })).toThrow("game_textures.json: sub/rock.png has to be a .png in the level's folder");
    expect(readWith({ "..\\rock.png": ROCK })).toThrow("has to be a .png in the level's folder");
  });

  test("the stream is one of the game's files, like s0000004", () => {
    expect(readRock({ stream: "jungle" })).toThrow(`game_textures.json: rock.png's stream has to be one of the game's files, like s0000004, not "jungle"`);
  });

  test("the page is a texture page's entry name", () => {
    expect(readRock({ page: "" })).toThrow("game_textures.json: rock.png's page has to be a texture page's entry name");
    expect(readRock({ page: 7 })).toThrow("rock.png's page has to be a texture page's entry name");
  });

  test("its numbers are whole numbers", () => {
    expect(readRock({ x: 1.5 })).toThrow("game_textures.json: rock.png's x has to be a whole number, not 1.5");
    expect(readRock({ clutY: "3" })).toThrow(`rock.png's clutY has to be a whole number, not "3"`);
    expect(readRock({ h: undefined })).toThrow("rock.png's h has to be a whole number, not undefined");
  });

  test("the colour mode is 4, 8 or 15 bit", () => {
    expect(readRock({ colourMode: 3 })).toThrow("game_textures.json: rock.png's colourMode has to be 0, 1 or 2, not 3");
  });

  test("its size is one of a region's", () => {
    expect(readRock({ w: 24 })).toThrow("game_textures.json: rock.png's w has to be 4, 8, 16, 32 or 64, not 24");
  });

  test("the region is on its page", () => {
    expect(readRock({ colourMode: 2, x: 240 })).toThrow("game_textures.json: rock.png's region goes off its page, which is 256 by 128 at its colour mode");
    expect(readRock({ y: 120 })).toThrow("rock.png's region goes off its page, which is 512 by 128 at its colour mode");
    expect(readRock({ colourMode: 0, x: 992, w: 32 })).not.toThrow();
  });

  test("the palette is on its page", () => {
    expect(readRock({ clutX: 16 })).toThrow("game_textures.json: rock.png's clutX has to be 0 to 15, not 16");
    expect(readRock({ clutY: 128 })).toThrow("game_textures.json: rock.png's clutY has to be 0 to 127, not 128");
  });
});

describe("a game texture's image", () => {
  test("a stream's texture pages are by entry name", () => {
    const pages = readStreamTexturePages(streamsWithPage(), "s0000004");
    expect([...pages.keys()]).toEqual([eidToString(PAGE_EID)]);
  });

  test("is its region of its page, in its palette's colours", () => {
    const pages = readStreamTexturePages(streamsWithPage(), "s0000004");
    const image = gameTextureImage("rock.png", tileRegion(0, 0, 8, 4), pages);
    expect([image.width, image.height]).toEqual([8, 4]);
    // pixel (3, 2) is colour 5: red 10 of 31, 80 in 8 bit
    expect([...image.rgb.subarray((2 * 8 + 3) * 3, (2 * 8 + 3) * 3 + 3)]).toEqual([80, 0, 0]);
  });

  test("a stream that isn't in the streams folder is an error", () => {
    expect(() => readStreamTexturePages(streamsWithPage(), "s0000014")).toThrow(/^s0000014\.nsf isn't in .*game-textures-streams-/);
  });

  test("a page that isn't one of its stream's texture pages is an error", () => {
    const pages = readStreamTexturePages(streamsWithPage(), "s0000004");
    expect(() => gameTextureImage("rock.png", { ...tileRegion(0, 0, 8, 4), page: "nopes" }, pages))
      .toThrow("rock.png's page nopes isn't one of s0000004's texture pages");
  });
});

describe("writing a level source's game textures", () => {
  const sourceWith = (textures: Record<string, GameTexture>) => sourceFolder(JSON.stringify(textures));

  test("each image that isn't in its folder is made from the game, as a png", () => {
    const folder = sourceWith({ "rock.png": tileRegion(0, 0, 8, 4) });
    expect(writeGameTextures(folder, streamsWithPage())).toEqual(["rock.png"]);
    const image = readImage(join(folder, "rock.png"));
    const fromGame = gameTextureImage("rock.png", tileRegion(0, 0, 8, 4), readStreamTexturePages(streamsWithPage(), "s0000004"));
    expect([image.width, image.height, [...image.rgb]]).toEqual([8, 4, [...fromGame.rgb]]);
  });

  test("an image already there is left as it is", () => {
    const folder = sourceWith({ "rock.png": tileRegion(0, 0, 8, 4), "moss.png": tileRegion(8, 0, 8, 8) });
    writeFileSync(join(folder, "rock.png"), "mine");
    expect(writeGameTextures(folder, streamsWithPage())).toEqual(["moss.png"]);
    expect(readFileSync(join(folder, "rock.png"), "utf8")).toBe("mine");
  });

  test("a source without game textures has nothing written, and needs no streams", () => {
    expect(writeGameTextures(sourceFolder(), join(tmpdir(), "no-such-streams"))).toEqual([]);
  });

  test("an image from a stream that isn't in the streams folder is an error saying which", () => {
    const folder = sourceWith({ "rope.png": { ...tileRegion(0, 0, 8, 4), stream: "s0000014" } });
    expect(() => writeGameTextures(folder, streamsWithPage()))
      .toThrow(/^rope\.png is from the game's s0000014\.nsf, which isn't in .*game-textures-streams-.* \(see doc\/running\.md\)$/);
    expect(existsSync(join(folder, "rope.png"))).toBe(false);
  });
});
