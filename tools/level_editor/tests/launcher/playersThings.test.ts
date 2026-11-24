import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { copyPlayersThings } from "../../launcher/playersThings";

let games: string; // a stand-in for the folder both versions are in
let current: string; // c1x-1.3, the player's
let newer: string; // c1x-1.4, just unzipped

beforeEach(() => {
  games = mkdtempSync(join(tmpdir(), "games-"));
  current = join(games, "c1x-1.3");
  newer = join(games, "c1x-1.4");
});
afterEach(() => { rmSync(games, { recursive: true, force: true }); });

function write(folder: string, path: string, text: string): void {
  mkdirSync(dirname(join(folder, path)), { recursive: true });
  writeFileSync(join(folder, path), text);
}

const read = (folder: string, path: string) => readFileSync(join(folder, path), "utf8");

describe("copying the player's things into the new version", () => {
  test.each([
    "settings.cfg",
    "controls.cfg",
    "imgui.ini", // the launcher's window layout
    "modio_token.json", // the level editor's mod.io sign-in
    "streams/s0000003.nsd", // the game's files from their disc
    "memory_card/BASCUS-94900/save",
  ])("copies %s", (path) => {
    write(current, path, "mine");
    copyPlayersThings(current, newer);
    expect(read(newer, path)).toBe("mine");
  });

  test("keeps the new version's own file where the player has one by its name", () => {
    write(current, "streams/README.md", "old readme");
    write(newer, "streams/README.md", "new readme");
    copyPlayersThings(current, newer);
    expect(read(newer, "streams/README.md")).toBe("new readme");
  });

  test("copies the levels the new version doesn't have", () => {
    write(current, "level_src/facing_castle/map.obj", "castle");
    copyPlayersThings(current, newer);
    expect(read(newer, "level_src/facing_castle/map.obj")).toBe("castle");
  });

  test("leaves a level the new version has as the new version has it", () => {
    write(current, "level_src/1_tide_ruins/old_texture.png", "old");
    write(newer, "level_src/1_tide_ruins/map.obj", "new");
    copyPlayersThings(current, newer);
    expect(existsSync(join(newer, "level_src/1_tide_ruins/old_texture.png"))).toBe(false);
  });

  test("copies nothing the player doesn't have", () => {
    mkdirSync(current);
    mkdirSync(newer);
    copyPlayersThings(current, newer);
    expect(readdirSync(newer)).toEqual([]);
  });
});
