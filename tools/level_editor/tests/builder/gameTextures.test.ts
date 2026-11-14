import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { readGameTextures, type GameTexture } from "../../builder/gameTextures";

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
