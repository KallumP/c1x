import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { boxSubtype, readObjectsFile, toZone } from "../../builder/levelObjects";

// a temporary level source folder, holding objects.json with text (if given)
function objectsFolder(text?: string): string {
  const folder = mkdtempSync(join(tmpdir(), "objects-"));
  if (text !== undefined) {
    writeFileSync(join(folder, "objects.json"), text);
  }
  return folder;
}

describe("where an object is in the level", () => {
  test("blender's (x, y, z up) in metres is the zone's (x, z up, -y) scaled", () => {
    expect(toZone([1, 2, 3], 100, 0, [0, 0, 0])).toEqual([100, 300, -200]);
  });

  test("it turns and moves as the map does", () => {
    expect(toZone([1, 2, 3], 100, 90, [10, 20, 30])).toEqual([-200 - 10, 300 - 20, -100 - 30]);
  });
});

describe("a box's subtype", () => {
  test("from its type, or its subtype number", () => {
    expect(boxSubtype({ kind: "box", at: [0, 0, 0], raise: 0, stack: 1, box: "outline" })).toBe(13);
    expect(boxSubtype({ kind: "box", at: [0, 0, 0], raise: 0, stack: 1, box: 4 })).toBe(4);
  });
});

describe("objects.json", () => {
  test("without one there are no objects", () => {
    expect(readObjectsFile(objectsFolder())).toEqual([]);
  });

  test("reads the objects in it", () => {
    const objects = readObjectsFile(objectsFolder('[{"kind": "end", "at": [0, 40, 1]}]'));
    expect(objects.map(({ kind, at }) => [kind, at])).toEqual([["end", [0, 40, 1]]]);
  });

  test("a bad one is an error naming the file", () => {
    expect(() => readObjectsFile(objectsFolder('[{"kind": "crate", "at": [0, 0, 0]}]'))).toThrow(/objects\.json.*crate/);
  });
});
