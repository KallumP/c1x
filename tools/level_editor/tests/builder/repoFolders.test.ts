import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { repoFolders, repoOfExe } from "../../builder/repoFolders";

describe("the level build's folders", () => {
  test("are the repo's level_src, streams and build/levels", () => {
    expect(repoFolders(join("games", "c1x"))).toEqual({
      sourcesDir: join("games", "c1x", "level_src"),
      streamsDir: join("games", "c1x", "streams"),
      levelsDir: join("games", "c1x", "build", "levels"),
    });
  });

  test("build-level.exe's repo is the folder above its build folder", () => {
    expect(repoOfExe(join("games", "c1x", "build", "build-level.exe"))).toBe(join("games", "c1x"));
  });
});
