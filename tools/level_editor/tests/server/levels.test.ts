import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eidToString } from "../../builder/entryIds";
import { texturePage, TILE } from "../../builder/tpage";
import { levelFileMakingGameTextures, levelFilePath, listLevels, readObjects, writeObjects } from "../../server/levels";

let root: string;

function level(name: string, files: Record<string, string>) {
  mkdirSync(join(root, name), { recursive: true });
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(join(root, name, file, ".."), { recursive: true });
    writeFileSync(join(root, name, file), text);
  }
}

beforeEach(() => { root = mkdtempSync(join(tmpdir(), "level_src-")); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

describe("listLevels", () => {
  test("lists folders holding one .obj, by name, with its .obj", () => {
    level("b_level", { "map.obj": "", "map.mtl": "" });
    level("a_level", { "a.obj": "" });
    expect(listLevels(root)).toEqual([
      { name: "a_level", obj: "a.obj", scale: 400, songs: [] },
      { name: "b_level", obj: "map.obj", scale: 400, songs: [] },
    ]);
  });

  test("leaves out folders with no .obj or more than one, and files", () => {
    level("none", { "readme.txt": "" });
    level("two", { "a.obj": "", "b.obj": "" });
    writeFileSync(join(root, "README.md"), "");
    expect(listLevels(root)).toEqual([]);
  });

  test("takes the scale from level.cfg", () => {
    level("big", { "big.obj": "", "level.cfg": "scale = 2000\n" });
    expect(listLevels(root)[0].scale).toBe(2000);
  });

  test("lists the audio files in a level's folder, for it to pick as its song", () => {
    level("cave", { "cave.obj": "", "Theme.MP3": "", "b.ogg": "", "a.wav": "", "c.flac": "", "music.mid": "", "notes.txt": "", "sub/d.mp3": "" });
    expect(listLevels(root)[0].songs).toEqual(["a.wav", "b.ogg", "c.flac", "Theme.MP3"]);
  });
});

describe("levelFilePath", () => {
  test("is a file inside the level's folder", () => {
    level("lvl", { "lvl.obj": "", "textures/grass.png": "" });
    expect(levelFilePath(root, "lvl", "textures/grass.png")).toBe(join(root, "lvl", "textures", "grass.png"));
  });

  test("is null outside the level's folder, or for a missing file or level", () => {
    level("lvl", { "lvl.obj": "" });
    level("other", { "secret.txt": "" });
    expect(levelFilePath(root, "lvl", "../other/secret.txt")).toBeNull();
    expect(levelFilePath(root, "../lvl", "lvl.obj")).toBeNull();
    expect(levelFilePath(root, "lvl", "missing.png")).toBeNull();
    expect(levelFilePath(root, "nope", "lvl.obj")).toBeNull();
  });
});

describe("objects.json", () => {
  test("reads a level's objects.json", () => {
    level("lvl", { "lvl.obj": "", "objects.json": "[{\"kind\": \"spawn\", \"at\": [0, 0, 0]}]" });
    expect(readObjects(root, "lvl")).toBe("[{\"kind\": \"spawn\", \"at\": [0, 0, 0]}]");
  });

  test("reads an empty list when the level has none", () => {
    level("lvl", { "lvl.obj": "" });
    expect(readObjects(root, "lvl")).toBe("[]\n");
  });

  test("writes a level's objects.json", () => {
    level("lvl", { "lvl.obj": "" });
    writeObjects(root, "lvl", "[]\n");
    expect(readFileSync(join(root, "lvl", "objects.json"), "utf8")).toBe("[]\n");
  });

  test("keeps the line endings the file had (a windows checkout has crlf)", () => {
    level("lvl", { "lvl.obj": "", "objects.json": "[\r\n]\r\n" });
    writeObjects(root, "lvl", "[\n  {}\n]\n");
    expect(readFileSync(join(root, "lvl", "objects.json"), "utf8")).toBe("[\r\n  {}\r\n]\r\n");
  });

  test("won't read or write a level that isn't listed", () => {
    expect(() => readObjects(root, "nope")).toThrow("no level source nope");
    expect(() => writeObjects(root, "../x", "[]")).toThrow("no level source ../x");
  });
});

describe("levelFileMakingGameTextures", () => {
  // a streams folder whose s0000004.nsf is one texture page; a level whose rock.png is a region of it
  const PAGE_EID = 0x12345671;
  function streams(): string {
    const folder = mkdtempSync(join(tmpdir(), "streams-"));
    const tile = { pixels: Array(TILE * TILE).fill(3), palette: Array(16).fill(0x7c00) };
    writeFileSync(join(folder, "s0000004.nsf"), texturePage(PAGE_EID, [tile]).page);
    return folder;
  }
  const rock = (stream: string) => JSON.stringify({ "rock.png": { stream, page: eidToString(PAGE_EID), colourMode: 0, x: 0, y: 0, w: 16, h: 16, clutX: 0, clutY: 0 } });

  test("a game texture that isn't there is made from the game's files, then given", () => {
    level("cave", { "cave.obj": "", "game_textures.json": rock("s0000004") });
    expect(levelFileMakingGameTextures(root, streams(), "cave", "rock.png", () => {})).toBe(join(root, "cave", "rock.png"));
    expect(existsSync(join(root, "cave", "rock.png"))).toBe(true);
  });

  test("one that can't be made is warned about and not found", () => {
    level("cave", { "cave.obj": "", "game_textures.json": rock("s0000014") });
    const warnings: string[] = [];
    expect(levelFileMakingGameTextures(root, streams(), "cave", "rock.png", (line) => warnings.push(line))).toBeNull();
    expect(warnings).toEqual([expect.stringMatching(/^cave: rock\.png is from the game's s0000014\.nsf, which isn't in /)]);
  });

  test("other files are as levelFilePath gives them, without the game's files", () => {
    level("cave", { "cave.obj": "", "game_textures.json": rock("s0000014") });
    const warnings: string[] = [];
    expect(levelFileMakingGameTextures(root, join(root, "no-streams"), "cave", "cave.obj", (line) => warnings.push(line))).toBe(join(root, "cave", "cave.obj"));
    expect(levelFileMakingGameTextures(root, join(root, "no-streams"), "cave", "nope.png", (line) => warnings.push(line))).toBeNull();
    expect(warnings).toEqual([]);
  });
});
