import { describe, expect, test } from "vitest";
import { logoCrop } from "../../src/levelLogo";

describe("a level's logo", () => {
  test("takes all of a 16:9 view", () => {
    expect(logoCrop(1600, 900)).toEqual({ x: 0, y: 0, width: 1600, height: 900 });
  });

  test("takes the middle of a view wider than 16:9, its full height", () => {
    expect(logoCrop(2000, 900)).toEqual({ x: 200, y: 0, width: 1600, height: 900 });
  });

  test("takes the middle of a view taller than 16:9, its full width", () => {
    expect(logoCrop(1600, 1100)).toEqual({ x: 0, y: 100, width: 1600, height: 900 });
  });

  test("is in whole pixels", () => {
    const crop = logoCrop(1001, 777);
    expect(Object.values(crop).every(Number.isInteger)).toBe(true);
  });
});
