import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { zipLevel } from "../../scripts/levelZip";

let root: string; // a stand-in for level_src/

beforeEach(() => { root = mkdtempSync(join(tmpdir(), "level_src-")); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

// level_src/<name> holding files, each with its own name as its text
function makeLevel(name: string, files: string[]): void {
  mkdirSync(join(root, name));
  for (const file of files) {
    writeFileSync(join(root, name, file), file);
  }
}

const zippedNames = (zip: Uint8Array) => Object.keys(unzipSync(zip)).sort();

describe("a level's zip", () => {
  test("holds the level's folder, with its files inside it", () => {
    makeLevel(
      "my_level",
      ["my_level.obj", "my_level.mtl", "grass.png", "level.cfg", "objects.json"],
    );
    expect(zippedNames(zipLevel(root, "my_level"))).toEqual([
      "my_level/grass.png",
      "my_level/level.cfg",
      "my_level/my_level.mtl",
      "my_level/my_level.obj",
      "my_level/objects.json",
    ]);
  });

  test("keeps each file's contents", () => {
    makeLevel("my_level", ["my_level.obj"]);
    const unzipped = unzipSync(zipLevel(root, "my_level"));
    expect(strFromU8(unzipped["my_level/my_level.obj"])).toBe("my_level.obj");
  });

  test("leaves out the game's own images its game_textures.json lists, but keeps the list", () => {
    makeLevel("my_level", ["my_level.obj", "tex_000.png", "grass.png"]);
    const texture = {
      stream: "s0000004",
      page: "PoC1T",
      colourMode: 1,
      x: 192,
      y: 16,
      w: 32,
      h: 16,
      clutX: 0,
      clutY: 9,
    };
    writeFileSync(
      join(root, "my_level", "game_textures.json"),
      JSON.stringify({ "tex_000.png": texture }),
    );
    expect(zippedNames(zipLevel(root, "my_level"))).toEqual([
      "my_level/game_textures.json",
      "my_level/grass.png",
      "my_level/my_level.obj",
    ]);
  });

  test("leaves out its blender files", () => {
    makeLevel("my_level", ["my_level.obj", "my_level.blend", "my_level.blend1"]);
    expect(zippedNames(zipLevel(root, "my_level"))).toEqual(["my_level/my_level.obj"]);
  });

  test("leaves out hidden files", () => {
    makeLevel("my_level", ["my_level.obj", ".modio.json"]);
    expect(zippedNames(zipLevel(root, "my_level"))).toEqual(["my_level/my_level.obj"]);
  });

  test("leaves out folders inside it", () => {
    makeLevel("my_level", ["my_level.obj"]);
    mkdirSync(join(root, "my_level", "backup"));
    writeFileSync(join(root, "my_level", "backup", "old.obj"), "");
    expect(zippedNames(zipLevel(root, "my_level"))).toEqual(["my_level/my_level.obj"]);
  });
});
