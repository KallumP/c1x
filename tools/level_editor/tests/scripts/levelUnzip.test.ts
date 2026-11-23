import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { unzipLevel } from "../../scripts/levelUnzip";

let root: string; // a stand-in for level_src/

beforeEach(() => { root = mkdtempSync(join(tmpdir(), "level_src-")); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

// a zip of files, each with its own path as its text, and the folders given
function zipOf(paths: string[], folders: string[] = []): Uint8Array {
  const files = Object.fromEntries(paths.map((path) => [path, strToU8(path)]));
  const folderEntries = Object.fromEntries(folders.map((folder) => [folder, new Uint8Array()]));
  return zipSync({ ...folderEntries, ...files });
}

const TIDE_RUINS = ["1_tide_ruins/tide_ruins.obj", "1_tide_ruins/level.cfg"];
const filesIn = (name: string) => readdirSync(join(root, name)).sort();

describe("unzipping a level", () => {
  test("puts its folder in level_src, and says its name", () => {
    expect(unzipLevel(root, zipOf(TIDE_RUINS), 17302)).toEqual({ name: "1_tide_ruins" });
    expect(readFileSync(join(root, "1_tide_ruins", "tide_ruins.obj"), "utf8")).toBe("1_tide_ruins/tide_ruins.obj");
  });

  test("notes which mod.io level it is", () => {
    unzipLevel(root, zipOf(TIDE_RUINS), 17302);
    expect(JSON.parse(readFileSync(join(root, "1_tide_ruins", ".modio.json"), "utf8"))).toEqual({ modId: 17302 });
  });

  test("skips the folder entries windows puts in a zip", () => {
    unzipLevel(root, zipOf(TIDE_RUINS, ["1_tide_ruins/"]), 17302);
    expect(filesIn("1_tide_ruins")).toEqual([".modio.json", "level.cfg", "tide_ruins.obj"]);
  });

  test("skips the __MACOSX folder a mac puts in a zip", () => {
    const zip = zipOf([...TIDE_RUINS, "__MACOSX/1_tide_ruins/._level.cfg"]);
    expect(unzipLevel(root, zip, 17302)).toEqual({ name: "1_tide_ruins" });
    expect(existsSync(join(root, "__MACOSX"))).toBe(false);
  });

  test("skips folders inside the level's folder", () => {
    unzipLevel(root, zipOf([...TIDE_RUINS, "1_tide_ruins/backup/old.obj"]), 17302);
    expect(filesIn("1_tide_ruins")).toEqual([".modio.json", "level.cfg", "tide_ruins.obj"]);
  });

  test.each(["1_tide_ruins/..\\escape.obj", "1_tide_ruins/C:escape.obj", "1_tide_ruins/.."])(
    "skips a file whose name could leave the level's folder: %j",
    (path) => {
      unzipLevel(root, zipOf([...TIDE_RUINS, path]), 17302);
      expect(filesIn("1_tide_ruins")).toEqual([".modio.json", "level.cfg", "tide_ruins.obj"]);
      expect(readdirSync(root)).toEqual(["1_tide_ruins"]);
    },
  );

  test("replaces the level downloaded from the same mod.io level before", () => {
    unzipLevel(root, zipOf([...TIDE_RUINS, "1_tide_ruins/old.png"]), 17302);
    unzipLevel(root, zipOf(TIDE_RUINS), 17302);
    expect(filesIn("1_tide_ruins")).toEqual([".modio.json", "level.cfg", "tide_ruins.obj"]);
  });
});

describe("a zip that can't be unzipped as a level", () => {
  test("has its files outside a folder", () => {
    expect(unzipLevel(root, zipOf(["tide_ruins.obj"]), 17302)).toEqual({
      problem: "The zip doesn't hold one level's folder.",
    });
  });

  test("holds two folders", () => {
    expect(unzipLevel(root, zipOf(["a/a.obj", "b/b.obj"]), 17302)).toEqual({
      problem: "The zip doesn't hold one level's folder.",
    });
  });

  test("has no map", () => {
    expect(unzipLevel(root, zipOf(["1_tide_ruins/level.cfg"]), 17302)).toEqual({
      problem: "1_tide_ruins has no map (a .obj) in it.",
    });
  });

  test("has a folder the game can't boot by its name", () => {
    expect(unzipLevel(root, zipOf(["tide ruins/tide_ruins.obj"]), 17302)).toEqual({
      problem: "The level's folder, tide ruins, can only have letters, digits, _ and - in its name.",
    });
  });

  test("would replace a level that isn't from mod.io", () => {
    mkdirSync(join(root, "1_tide_ruins"));
    writeFileSync(join(root, "1_tide_ruins", "mine.obj"), "mine");
    expect(unzipLevel(root, zipOf(TIDE_RUINS), 17302)).toEqual({
      problem: "There's already a level called 1_tide_ruins: rename its folder in level_src first.",
    });
    expect(filesIn("1_tide_ruins")).toEqual(["mine.obj"]);
  });

  test("would replace a level whose mod.io note can't be read", () => {
    mkdirSync(join(root, "1_tide_ruins"));
    writeFileSync(join(root, "1_tide_ruins", ".modio.json"), "{ not json");
    expect(unzipLevel(root, zipOf(TIDE_RUINS), 17302)).toEqual({
      problem: "There's already a level called 1_tide_ruins: rename its folder in level_src first.",
    });
  });

  test("would replace a level from another mod.io level", () => {
    unzipLevel(root, zipOf(TIDE_RUINS), 1);
    expect(unzipLevel(root, zipOf(TIDE_RUINS), 17302)).toEqual({
      problem: "There's already a level called 1_tide_ruins: rename its folder in level_src first.",
    });
  });

  test("isn't a zip", () => {
    expect(unzipLevel(root, new Uint8Array([1, 2, 3]), 17302)).toEqual({ problem: "The download isn't a zip." });
  });
});
