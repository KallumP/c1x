import { describe, expect, test } from "vitest";
import { switchlessOutlineErrors, switchlessOutlines } from "../../src/switchWarnings";
import type { LevelObject } from "../../src/objects";

const box = (more: Partial<LevelObject>): LevelObject => ({ kind: "box", box: "basic", at: [0, 0, 0], raise: 0, stack: 1, ...more });

describe("switchlessOutlines", () => {
  test("are the outlines whose switch isn't in the level", () => {
    const objects = [box({ box: "switch", switch: 1 }), box({ outline: 1 }), box({ outline: 2 }), box({}), box({ box: "life", outline: 3 })];
    expect(switchlessOutlines(objects)).toEqual(new Set([2, 4]));
  });

  test("are none when every outline's switch is there", () => {
    expect(switchlessOutlines([box({ outline: 2 }), box({ box: "switch", switch: 2 })])).toEqual(new Set());
  });
});

describe("switchlessOutlineErrors", () => {
  test("say which box, where it is, and which switch it's missing, for each switchless outline", () => {
    const objects = [box({ box: "switch", switch: 1 }), box({ outline: 1 }), box({ at: [1, 2.5, 3], outline: 2 })];
    expect(switchlessOutlineErrors(objects)).toEqual([
      { index: 2, text: "Basic box at 1, 2.5, 3 is an outline of switch 2, but the level has no switch 2, so it can't be built" },
    ]);
  });
});
