import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
  const folderEntries = Object.fromEntries(
    folders.map((folder) => [folder, new Uint8Array()]),
  );
  return zipSync({ ...folderEntries, ...files });
}

// the mod.io level the zip is from, as the download notes it
const TIDE_RUINS_MOD = {
  modId: 17302,
  page: "https://mod.io/g/crash-1-n-hanced/m/tide-ruins",
};
const TIDE_RUINS = ["1_tide_ruins/tide_ruins.obj", "1_tide_ruins/level.cfg"];
const filesIn = (name: string) => readdirSync(join(root, name)).sort();

describe("unzipping a level", () => {
  test("puts its folder in level_src, and says its name", () => {
    expect(unzipLevel(root, zipOf(TIDE_RUINS), TIDE_RUINS_MOD)).toEqual({
      name: "1_tide_ruins",
    });
    expect(readFileSync(join(root, "1_tide_ruins", "tide_ruins.obj"), "utf8")).toBe(
      "1_tide_ruins/tide_ruins.obj",
    );
  });

  test("notes which mod.io level it is, and its page", () => {
    unzipLevel(root, zipOf(TIDE_RUINS), TIDE_RUINS_MOD);
    const note = readFileSync(join(root, "1_tide_ruins", ".modio.json"), "utf8");
    expect(JSON.parse(note)).toEqual(TIDE_RUINS_MOD);
  });

  test("skips folders inside the level's folder", () => {
    unzipLevel(
      root,
      zipOf([...TIDE_RUINS, "1_tide_ruins/backup/old.obj"]),
      TIDE_RUINS_MOD,
    );
    expect(filesIn("1_tide_ruins")).toEqual([
      ".modio.json",
      "level.cfg",
      "tide_ruins.obj",
    ]);
  });

  test.each([
    "1_tide_ruins/..\\escape.obj",
    "1_tide_ruins/C:escape.obj",
    "1_tide_ruins/..",
  ])(
    "skips a file whose name could leave the level's folder: %j",
    (path) => {
      unzipLevel(root, zipOf([...TIDE_RUINS, path]), TIDE_RUINS_MOD);
      expect(filesIn("1_tide_ruins")).toEqual([
        ".modio.json",
        "level.cfg",
        "tide_ruins.obj",
      ]);
      expect(readdirSync(root)).toEqual(["1_tide_ruins"]);
    },
  );

  test("replaces the level downloaded from the same mod.io level before", () => {
    unzipLevel(root, zipOf([...TIDE_RUINS, "1_tide_ruins/old.png"]), TIDE_RUINS_MOD);
    unzipLevel(root, zipOf(TIDE_RUINS), TIDE_RUINS_MOD);
    expect(filesIn("1_tide_ruins")).toEqual([
      ".modio.json",
      "level.cfg",
      "tide_ruins.obj",
    ]);
  });
});

describe("a zip that can't be unzipped as a level", () => {
  test("has its files outside a folder", () => {
    expect(unzipLevel(root, zipOf(["tide_ruins.obj"]), TIDE_RUINS_MOD)).toEqual({
      problem: "The zip doesn't hold one level's folder.",
    });
  });

  test("holds two folders", () => {
    expect(unzipLevel(root, zipOf(["a/a.obj", "b/b.obj"]), TIDE_RUINS_MOD)).toEqual({
      problem: "The zip doesn't hold one level's folder.",
    });
  });

  test("has no map", () => {
    expect(unzipLevel(root, zipOf(["1_tide_ruins/level.cfg"]), TIDE_RUINS_MOD)).toEqual({
      problem: "1_tide_ruins has no map (a .obj) in it.",
    });
  });

  test("has a folder the game can't boot by its name", () => {
    const zip = zipOf(["tide ruins/tide_ruins.obj"]);
    expect(unzipLevel(root, zip, TIDE_RUINS_MOD)).toEqual({
      problem: "The level's folder, tide ruins, can only have letters, digits, _ and - in its name.",
    });
  });

  test("would replace a level that isn't from mod.io", () => {
    mkdirSync(join(root, "1_tide_ruins"));
    writeFileSync(join(root, "1_tide_ruins", "mine.obj"), "mine");
    expect(unzipLevel(root, zipOf(TIDE_RUINS), TIDE_RUINS_MOD)).toEqual({
      problem: "There's already a level called 1_tide_ruins: rename its folder in level_src first.",
    });
    expect(filesIn("1_tide_ruins")).toEqual(["mine.obj"]);
  });

  test("would replace a level whose mod.io note can't be read", () => {
    mkdirSync(join(root, "1_tide_ruins"));
    writeFileSync(join(root, "1_tide_ruins", ".modio.json"), "{ not json");
    expect(unzipLevel(root, zipOf(TIDE_RUINS), TIDE_RUINS_MOD)).toEqual({
      problem: "There's already a level called 1_tide_ruins: rename its folder in level_src first.",
    });
  });

  test("would replace a level from another mod.io level", () => {
    unzipLevel(root, zipOf(TIDE_RUINS), { modId: 1, page: "https://mod.io/m/other" });
    expect(unzipLevel(root, zipOf(TIDE_RUINS), TIDE_RUINS_MOD)).toEqual({
      problem: "There's already a level called 1_tide_ruins: rename its folder in level_src first.",
    });
  });

  test("isn't a zip", () => {
    expect(unzipLevel(root, new Uint8Array([1, 2, 3]), TIDE_RUINS_MOD)).toEqual({
      problem: "The download isn't a zip.",
    });
  });
});
