import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { copyReleaseFiles, releaseFiles, releaseFolder, zipCommand, zipFolder } from "../../scripts/release";

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
  "doc/building.md",
  "doc/controls.md",
];
const BUILD_FILES = ["c1x.exe", "c1x_tools.exe", "SDL2.dll", "libgcc_s_dw2-1.DLL", "tests.exe", "event_log.txt", "test_config.cfg"];
const EDITOR_PAGE_FILES = ["index.html", "assets/index-abc.js", "assets/index-abc.css"];

const files = (buildFiles = BUILD_FILES, editorPageFiles = EDITOR_PAGE_FILES) => releaseFiles(GIT_FILES, buildFiles, editorPageFiles);
const destinations = () => files().map((file) => file.to);
const sourceOf = (to: string) => files().find((file) => file.to === to)?.from;

describe("the release zip's files", () => {
  test("the launcher is at the top, with the licence and the example cfgs", () => {
    expect(destinations()).toEqual(expect.arrayContaining(["c1x_launcher.exe", "LICENSE.txt", "settings.example.cfg", "controls.example.cfg"]));
  });

  test("the licence is a text file, which a browser shows", () => {
    expect(sourceOf("LICENSE.txt")).toBe("LICENSE");
  });

  test("the player readme is the top-level README.html, a page made from it", () => {
    expect(sourceOf("README.html")).toBe("doc/release/README.md");
    expect(files().find((file) => file.to === "README.html")?.asPage).toBe(true);
  });

  test("the game, the tools and the game's dlls are in build/", () => {
    expect(destinations()).toEqual(expect.arrayContaining(["build/c1x.exe", "build/c1x_tools.exe", "build/SDL2.dll", "build/libgcc_s_dw2-1.DLL"]));
  });

  test("the level editor's built page is in build/editor/, for the tools to serve", () => {
    expect(destinations().filter((to) => to.startsWith("build/editor/")).sort())
      .toEqual(["build/editor/assets/index-abc.css", "build/editor/assets/index-abc.js", "build/editor/index.html"]);
  });

  test("nothing else in build/ goes in: no tests, logs or test files", () => {
    const build = destinations().filter((to) => to.startsWith("build/") && !to.startsWith("build/editor/"));
    expect(build.sort()).toEqual(["build/SDL2.dll", "build/c1x.exe", "build/c1x_tools.exe", "build/libgcc_s_dw2-1.DLL"]);
  });

  test("streams/ has only its readme", () => {
    expect(destinations().filter((to) => to.startsWith("streams/"))).toEqual(["streams/README.html"]);
  });

  test("level_src/ has only the level sources git has, so not a player's own", () => {
    expect(destinations().filter((to) => to.startsWith("level_src/")).sort()).toEqual(["level_src/1_tide_ruins/level.cfg", "level_src/1_tide_ruins/tide_ruins.obj", "level_src/README.html"]);
  });

  test("doc/ has the docs for players, not the ones for building c1x", () => {
    const docs = destinations().filter((to) => to.startsWith("doc/"));
    expect(docs.sort()).toEqual(["doc/changelog.html", "doc/controls.html", "doc/custom_levels.html", "doc/launcher.html", "doc/running.html", "doc/settings.html"]);
  });

  test("each doc is a page made from its markdown, and nothing else is", () => {
    files().forEach((file) => expect(Boolean(file.asPage)).toBe(file.from.endsWith(".md")));
  });

  test("no markdown goes in: every doc is a page", () => {
    expect(destinations().filter((to) => to.endsWith(".md"))).toEqual([]);
  });

  test("the source code doesn't go in: the game's, or the editor's and level build's", () => {
    expect(destinations()).not.toContain("Makefile");
    expect(destinations()).not.toContain("src/main.c");
    expect(destinations().filter((to) => to.startsWith("tools/"))).toEqual([]);
  });

  test("each file comes from the same place in the repo, apart from the player readme and the licence", () => {
    const sameNamed = (path: string) => path.replace(/\.md$/, ".html");
    files()
      .filter((file) => !["README.html", "LICENSE.txt"].includes(file.to))
      .forEach((file) => expect(sameNamed(file.from)).toBe(file.to));
  });

  test("a build without the game, the tools or the editor's page is an error", () => {
    expect(() => files(["c1x_tools.exe"])).toThrow("build/c1x.exe isn't built: run make first");
    expect(() => files(["c1x.exe"])).toThrow("build/c1x_tools.exe isn't built: run make first");
    expect(() => files(BUILD_FILES, ["assets/index-abc.js"])).toThrow("build/editor/index.html isn't built: run make first");
  });
});

describe("the release folder", () => {
  test("is named for the version, in release/ beside release.bat", () => {
    expect(releaseFolder("c1x", "0.1.0")).toBe(join("c1x", "release", "c1x-0.1.0"));
  });

  test("a version that isn't like 1.2.3 is an error", () => {
    ["v0.1.0", "0.1", "", "1.2.3-beta"].forEach((version) =>
      expect(() => releaseFolder("c1x", version)).toThrow(`the version has to be like 1.2.3, not "${version}"`));
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

  test("a doc is written as its page", () => {
    const { repo, release } = repoAndRelease();
    writeFileSync(join(repo, "running.md"), "# Running

See [Controls](controls.md).
");
    copyReleaseFiles(repo, [{ from: "running.md", to: "running.html", asPage: true }], release);
    const page = readFileSync(join(release, "running.html"), "utf8");
    expect(page).toMatch(/^<!doctype html>/);
    expect(page).toContain('<a href="controls.html">Controls</a>');
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
