import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { unzipRelease } from "../../launcher/releaseUnzip";

let parent: string; // a stand-in for the folder c1x-1.3 is in

beforeEach(() => { parent = mkdtempSync(join(tmpdir(), "games-")); });
afterEach(() => { rmSync(parent, { recursive: true, force: true }); });

// a zip of files, each with its own path as its text
function zipOf(paths: string[]): Uint8Array {
  return zipSync(Object.fromEntries(paths.map((path) => [path, strToU8(path)])));
}

const RELEASE = [
  "c1x-1.4/c1x_launcher.exe",
  "c1x-1.4/build/c1x.exe",
  "c1x-1.4/level_src/1_tide_ruins/map.obj",
];

describe("unzipping a release", () => {
  test("puts it beside the current folder, as its own folder", () => {
    expect(unzipRelease(parent, zipOf(RELEASE), "1.4")).toEqual({
      folder: join(parent, "c1x-1.4"),
    });
  });

  test("keeps the folders inside it", () => {
    unzipRelease(parent, zipOf(RELEASE), "1.4");
    expect(readFileSync(join(parent, "c1x-1.4", "build", "c1x.exe"), "utf8")).toBe(
      "c1x-1.4/build/c1x.exe",
    );
  });
});

describe("a release that isn't unzipped", () => {
  test("is one whose folder is already there, which is left as it was", () => {
    mkdirSync(join(parent, "c1x-1.4"));
    writeFileSync(join(parent, "c1x-1.4", "mine.txt"), "mine");
    expect(unzipRelease(parent, zipOf(RELEASE), "1.4")).toEqual({
      problem: `${join(parent, "c1x-1.4")} is already there: delete or rename it first.`,
    });
    expect(existsSync(join(parent, "c1x-1.4", "c1x_launcher.exe"))).toBe(false);
  });

  test("is one whose zip isn't that version's folder", () => {
    expect(unzipRelease(parent, zipOf(["c1x-1.5/c1x_launcher.exe"]), "1.4")).toEqual({
      problem: "The download isn't c1x 1.4.",
    });
  });

  test("is one with a file that could leave its folder", () => {
    const zip = zipOf([...RELEASE, "c1x-1.4/../escape.exe"]);
    expect(unzipRelease(parent, zip, "1.4")).toEqual({
      problem: "The download isn't c1x 1.4.",
    });
    expect(existsSync(join(parent, "escape.exe"))).toBe(false);
  });

  test("is one with no files", () => {
    expect(unzipRelease(parent, zipSync({}), "1.4")).toEqual({
      problem: "The download isn't c1x 1.4.",
    });
  });

  test("is one that isn't a zip", () => {
    expect(unzipRelease(parent, new Uint8Array([1, 2, 3]), "1.4")).toEqual({
      problem: "The download isn't a zip.",
    });
  });
});
