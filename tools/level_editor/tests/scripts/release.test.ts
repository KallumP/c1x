import { describe, expect, test } from "vitest";
import { releaseFiles } from "../../scripts/release";

const GIT_FILES = [
  "Makefile",
  "src/main.c",
  "level_src/README.md",
  "level_src/1_tide_ruins/level.cfg",
  "level_src/1_tide_ruins/tide_ruins.obj",
  "tools/level_editor/package.json",
  "tools/level_editor/src/music.ts",
  "tools/level_editor/tests/src/music.test.ts",
  "doc/building.md",
  "doc/controls.md",
];
const BUILD_FILES = ["c1x.exe", "build-level.exe", "SDL2.dll", "libgcc_s_dw2-1.DLL", "tests.exe", "event_log.txt", "test_config.cfg"];

const destinations = (gitFiles = GIT_FILES, buildFiles = BUILD_FILES) => releaseFiles(gitFiles, buildFiles).map((file) => file.to);
const sourceOf = (to: string) => releaseFiles(GIT_FILES, BUILD_FILES).find((file) => file.to === to)?.from;

describe("the release zip's files", () => {
  test("the launcher is at the top, with the licence and the example cfgs", () => {
    expect(destinations()).toEqual(expect.arrayContaining(["c1x_launcher.exe", "LICENSE", "settings.example.cfg", "controls.example.cfg"]));
  });

  test("the player readme is the top-level README.md", () => {
    expect(sourceOf("README.md")).toBe("doc/release/README.md");
  });

  test("the game, build-level.exe and the game's dlls are in build/", () => {
    expect(destinations()).toEqual(expect.arrayContaining(["build/c1x.exe", "build/build-level.exe", "build/SDL2.dll", "build/libgcc_s_dw2-1.DLL"]));
  });

  test("nothing else in build/ goes in: no tests, logs or test files", () => {
    const build = destinations().filter((to) => to.startsWith("build/"));
    expect(build.sort()).toEqual(["build/SDL2.dll", "build/build-level.exe", "build/c1x.exe", "build/libgcc_s_dw2-1.DLL"]);
  });

  test("streams/ has only its readme", () => {
    expect(destinations().filter((to) => to.startsWith("streams/"))).toEqual(["streams/README.md"]);
  });

  test("level_src/ has only the level sources git has, so not a player's own", () => {
    expect(destinations().filter((to) => to.startsWith("level_src/")).sort()).toEqual(["level_src/1_tide_ruins/level.cfg", "level_src/1_tide_ruins/tide_ruins.obj", "level_src/README.md"]);
  });

  test("the level editor is the files git has, without its tests", () => {
    expect(destinations().filter((to) => to.startsWith("tools/")).sort()).toEqual(["tools/level_editor/package.json", "tools/level_editor/src/music.ts"]);
  });

  test("doc/ has the docs for players, not the ones for building c1x", () => {
    const docs = destinations().filter((to) => to.startsWith("doc/"));
    expect(docs.sort()).toEqual(["doc/changelog.md", "doc/controls.md", "doc/custom_levels.md", "doc/launcher.md", "doc/running.md", "doc/settings.md"]);
  });

  test("the source code doesn't go in", () => {
    expect(destinations()).not.toContain("Makefile");
    expect(destinations()).not.toContain("src/main.c");
  });

  test("each file comes from the same place in the repo, apart from the player readme", () => {
    releaseFiles(GIT_FILES, BUILD_FILES)
      .filter((file) => file.to !== "README.md")
      .forEach((file) => expect(file.from).toBe(file.to));
  });

  test("a build without the game or build-level.exe is an error", () => {
    expect(() => releaseFiles(GIT_FILES, ["build-level.exe"])).toThrow("build/c1x.exe isn't built: run make first");
    expect(() => releaseFiles(GIT_FILES, ["c1x.exe"])).toThrow("build/build-level.exe isn't built: run make first");
  });
});
