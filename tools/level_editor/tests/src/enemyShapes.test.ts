import { describe, expect, test } from "vitest";
import { ENEMY_SHAPES, shapeBounds } from "../../src/enemyShapes";

describe("enemy shapes", () => {
  test("the plant stands on the floor, about 560 game units tall, on its spot", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.plant);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeGreaterThan(520);
    expect(max[1]).toBeLessThan(600);
    expect(Math.abs(min[0] + max[0])).toBeLessThan(40); // about as far out each side
  });

  test("the crab stands on the floor, about 700 wide (sideways, along x) and 250 tall", () => {
    const { min, max } = shapeBounds(ENEMY_SHAPES.crab);
    expect(min[1]).toBeCloseTo(0);
    expect(max[1]).toBeGreaterThan(220);
    expect(max[1]).toBeLessThan(290);
    expect(max[0] - min[0]).toBeGreaterThan(640);
    expect(max[0] - min[0]).toBeLessThan(760);
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
