import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { copyReleaseFiles, releaseFiles, releaseFolderName, zipCommand, zipFolder } from "../../scripts/release";

// a repo with a few files in it, and an empty folder to release into
function repoAndRelease() {
  const repo = mkdtempSync(join(tmpdir(), "release-repo-"));
  mkdirSync(join(repo, "build"));
  writeFileSync(join(repo, "c1x_launcher.exe"), "launcher");
  writeFileSync(join(repo, "build", "c1x.exe"), "game");
  return { repo, release: join(mkdtempSync(join(tmpdir(), "release-out-")), "c1x-1.0.0") };
}

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

describe("the release folder", () => {
  test("is named for the version", () => {
    expect(releaseFolderName("0.1.0")).toBe("c1x-0.1.0");
  });

  test("a version that isn't like 1.2.3 is an error", () => {
    ["v0.1.0", "0.1", "", "1.2.3-beta"].forEach((version) =>
      expect(() => releaseFolderName(version)).toThrow(`the version has to be like 1.2.3, not "${version}"`));
  });

  test("has each file copied to its place in it", () => {
    const { repo, release } = repoAndRelease();
    copyReleaseFiles(repo, [{ from: "c1x_launcher.exe", to: "c1x_launcher.exe" }, { from: "build/c1x.exe", to: "build/c1x.exe" }], release);
    expect(readFileSync(join(release, "c1x_launcher.exe"), "utf8")).toBe("launcher");
    expect(readFileSync(join(release, "build", "c1x.exe"), "utf8")).toBe("game");
  });

  test("an earlier release's folder is emptied first", () => {
    const { repo, release } = repoAndRelease();
    mkdirSync(release);
    writeFileSync(join(release, "old.txt"), "old");
    copyReleaseFiles(repo, [{ from: "c1x_launcher.exe", to: "c1x_launcher.exe" }], release);
    expect(existsSync(join(release, "old.txt"))).toBe(false);
  });

  test("a file that isn't there is an error", () => {
    const { repo, release } = repoAndRelease();
    expect(() => copyReleaseFiles(repo, [{ from: "LICENSE", to: "LICENSE" }], release)).toThrow("LICENSE isn't there, so it can't go in the release");
  });
});

describe("the release zip", () => {
  test("is made with windows' own tar, which writes zips, not one msys2 may put first on the path", () => {
    expect(zipCommand("c1x-1.0.0", "win32", "D:\\Win")).toEqual({
      program: join("D:\\Win", "System32", "tar.exe"),
      args: ["-a", "-c", "-f", "c1x-1.0.0.zip", "c1x-1.0.0"],
    });
  });

  test("windows' tar is in C:\\Windows when the system root isn't set", () => {
    expect(zipCommand("c1x-1.0.0", "win32", undefined).program).toBe(join("C:\\Windows", "System32", "tar.exe"));
  });

  test("is made with zip elsewhere", () => {
    expect(zipCommand("c1x-1.0.0", "linux", undefined)).toEqual({ program: "zip", args: ["-q", "-r", "c1x-1.0.0.zip", "c1x-1.0.0"] });
  });

  test.runIf(process.platform === "win32")("holds the release folder, next to it", () => {
    const { repo, release } = repoAndRelease();
    copyReleaseFiles(repo, [{ from: "build/c1x.exe", to: "build/c1x.exe" }], release);
    const zip = zipFolder(release);
    expect(zip).toBe(`${release}.zip`);
    const listing = execFileSync(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe"), ["-t", "-f", zip], { encoding: "utf8" });
    expect(listing).toContain("c1x-1.0.0/build/c1x.exe");
  });
});
