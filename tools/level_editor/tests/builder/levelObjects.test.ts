import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { boxInitFlagB, boxSubtype, readObjectsFile, toZone } from "../../builder/levelObjects";
import type { LevelObject } from "../../src/objects";

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
  const box = (type: LevelObject["box"], more: Partial<LevelObject> = {}): LevelObject => ({ kind: "box", at: [0, 0, 0], raise: 0, stack: 1, box: type, ...more });

  test("from its type, or its subtype number", () => {
    expect(boxSubtype(box("life"))).toBe(8);
    expect(boxSubtype(box(4))).toBe(4);
  });

  test("a plain or iron box that's an outline is the game's outline of it", () => {
    expect(boxSubtype(box("basic", { outline: 1 }))).toBe(13);
    expect(boxSubtype(box("iron", { outline: 1 }))).toBe(19);
  });

  test("any other box that's an outline keeps its own subtype", () => {
    expect(boxSubtype(box("life", { outline: 1 }))).toBe(8);
    expect(boxSubtype(box("tnt", { outline: 1 }))).toBe(0);
  });
});

describe("a box's second init flag", () => {
  const box = (type: LevelObject["box"], more: Partial<LevelObject> = {}): LevelObject => ({ kind: "box", at: [0, 0, 0], raise: 0, stack: 1, box: type, ...more });

  test("is 3 for an outline the game has no outline subtype of, as road to nowhere's life boxes", () => {
    expect(boxInitFlagB(box("life", { outline: 1 }))).toBe(3);
    expect(boxInitFlagB(box("question", { outline: 2 }))).toBe(3);
  });

  test("is 0 for any other box", () => {
    expect(boxInitFlagB(box("life"))).toBe(0);
    expect(boxInitFlagB(box("basic", { outline: 1 }))).toBe(0);
    expect(boxInitFlagB(box("iron", { outline: 1 }))).toBe(0);
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
