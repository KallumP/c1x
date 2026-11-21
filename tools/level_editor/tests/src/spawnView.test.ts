import { describe, expect, test } from "vitest";
import type { LevelObject } from "../../src/objects";
import { spawnView } from "../../src/spawnView";
import { noMinusZero } from "../helpers";

const spawn = (more: Partial<LevelObject> = {}): LevelObject => ({ kind: "spawn", at: [1, 2, 3], raise: 0, stack: 1, ...more });
const rounded = (vector: number[]) => noMinusZero(vector.map((value) => Math.round(value * 1000) / 1000));

describe("spawnView", () => {
  test("looks at the spawn", () => {
    expect(rounded(spawnView(spawn(), 0, 400).target)).toEqual([1, 3, -2]);
  });

  test("looks at the spawn as raised", () => {
    expect(rounded(spawnView(spawn({ raise: 1 }), 0, 400).target)).toEqual([1, 4, -2]);
  });

  test("is behind the spawn and above it, the way its arrow points (blender's +y unturned)", () => {
    expect(rounded(spawnView(spawn(), 0, 400).position)).toEqual([1, 9.5, 5.25]);
  });

  test("turns with the level", () => {
    expect(rounded(spawnView(spawn(), 90, 400).position)).toEqual([-6.25, 9.5, -2]);
  });

  test("is further away at a smaller scale, as everything in the level is bigger", () => {
    expect(rounded(spawnView(spawn(), 0, 200).position)).toEqual([1, 16, 12.5]);
  });
});
