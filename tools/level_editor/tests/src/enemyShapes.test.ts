import { describe, expect, test } from "vitest";
import { ENEMY_SHAPES, shapeBounds } from "../../src/enemyShapes";

describe("enemy shapes", () => {
  // the sizes of the game's models, in game units (jungle rollers' JuPcG, n. sanity beach's Cr19G)
  test("the plant stands on the floor, as big as the game's: about 830 across and 720 tall", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.plant);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeCloseTo(720, -1);
    expect(max[0] - min[0]).toBeGreaterThan(760);
    expect(max[0] - min[0]).toBeLessThan(900);
    expect(Math.abs(min[0] + max[0])).toBeLessThan(60); // about as far out each side
  });

  test("the crab stands on the floor, as big as the game's: about 980 across (sideways, along x) and 480 tall", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.crab);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeCloseTo(480, -1);
    expect(max[0] - min[0]).toBeGreaterThan(900);
    expect(max[0] - min[0]).toBeLessThan(1060);
    expect(min[0] + max[0]).toBeCloseTo(0); // the same both sides
  });

  test("both face +z: the plant's jaws and the crab's eyes are in front of their middles", () => {
    const frontOf = (parts: typeof ENEMY_SHAPES.crab, name: string) =>
      parts.filter((part) => part.name === name).every((part) => part.at[2] > 0);
    expect(frontOf(ENEMY_SHAPES.plant, "jaw")).toBe(true);
    expect(frontOf(ENEMY_SHAPES.crab, "eye")).toBe(true);
    expect(ENEMY_SHAPES.plant.some((part) => part.name === "jaw")).toBe(true);
    expect(ENEMY_SHAPES.crab.some((part) => part.name === "eye")).toBe(true);
  });
});
