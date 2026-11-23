import { describe, expect, test } from "vitest";
import { strToU8, unzipSync, zipSync } from "fflate";
import { zippedFiles } from "../../scripts/zipEntries";

// the paths of a zip's files, as zippedFiles splits them
function zippedPaths(paths: string[]): string[] {
  const zip = zipSync(Object.fromEntries(paths.map((path) => [path, strToU8(path)])));
  return zippedFiles(unzipSync(zip)).map(([parts]) => parts.join("/"));
}

describe("a zip's files", () => {
  test("are split into their folders", () => {
    expect(zippedFiles(unzipSync(zipSync({ "a/b.txt": strToU8("b") })))).toEqual([
      [["a", "b.txt"], strToU8("b")],
    ]);
  });

  test("skip the folder entries windows puts in a zip", () => {
    expect(zippedPaths(["level/", "level/map.obj"])).toEqual(["level/map.obj"]);
  });

  test("skip the __MACOSX folder a mac puts in a zip", () => {
    expect(zippedPaths(["level/map.obj", "__MACOSX/level/._map.obj"])).toEqual([
      "level/map.obj",
    ]);
  });
});
