import { describe, expect, test } from "vitest";
import { switchlessOutlines } from "../../src/switchWarnings";
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
