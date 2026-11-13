import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { levelFilePath, listLevels, readObjects, writeObjects } from "../../server/levels";

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

const NO_SONG = { mid: false, akuMid: false, sf2: false };

describe("listLevels", () => {
  test("lists folders holding one .obj, by name, with its .obj", () => {
    level("b_level", { "map.obj": "", "map.mtl": "" });
    level("a_level", { "a.obj": "" });
    expect(listLevels(root)).toEqual([
      { name: "a_level", obj: "a.obj", scale: 400, song: NO_SONG },
      { name: "b_level", obj: "map.obj", scale: 400, song: NO_SONG },
    ]);
  });

  test("leaves out folders with no .obj or more than one, and files", () => {
    level("none", { "readme.txt": "" });
    level("two", { "a.obj": "", "b.obj": "" });
    writeFileSync(join(root, "README.md"), "");
    expect(listLevels(root)).toEqual([]);
  });

  test("says which of its own song's files it has", () => {
    level("songful", { "songful.obj": "", "music.mid": "", "music.sf2": "" });
    expect(listLevels(root)[0].song).toEqual({ mid: true, akuMid: false, sf2: true });
  });

  test("takes the scale from level.cfg", () => {
    level("big", { "big.obj": "", "level.cfg": "scale = 2000\n" });
    expect(listLevels(root)[0].scale).toBe(2000);
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
