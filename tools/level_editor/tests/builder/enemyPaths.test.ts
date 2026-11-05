import { describe, expect, test } from "vitest";
import { enemyPath, ROLL_STEP, STONE_RADIUS } from "../../builder/enemyPaths";
import type { Vec3 } from "../../builder/vectors";

// jungle rollers' rolling stone path: 3600 sideways, dipping into its trough
const EXAMPLE: Vec3[] = [[1000, 500, 2000], [872, 452, 2000], [540, 332, 2000], [92, 192, 2000], [-384, 76, 2000], [-800, 28, 2000],
  [-1216, 76, 2000], [-1692, 192, 2000], [-2140, 332, 2000], [-2472, 452, 2000], [-2600, 500, 2000]];

const distance = (from: Vec3, to: Vec3) => Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
const steps = (points: Vec3[]) => points.slice(1).map((point, index) => distance(points[index], point));

describe("enemy paths", () => {
  test("a plant stays at its spot", () => {
    expect(enemyPath("plant", [[100, 200, 300], [900, 200, 300]], EXAMPLE)).toEqual([[100, 200, 300]]);
  });

  test("a rolling stone rolls from its spot to the end of its path", () => {
    const path = enemyPath("rolling_stone", [[4000, 400, 0], [0, 400, 0]], EXAMPLE);
    expect(path[0]).toEqual([4000, 400 + STONE_RADIUS, 0]);
    expect(path[path.length - 1]).toEqual([0, 400 + STONE_RADIUS, 0]);
    expect(path.every(([, y, z]) => y === 400 + STONE_RADIUS && z === 0)).toBe(true);
  });

  // the stone always faces the same way and spins by which way along its path
  // it goes, so it only spins the way it rolls going -x first to last
  test("a rolling stone's path runs -x, as jungle rollers' do, so it spins the way it rolls", () => {
    const path = enemyPath("rolling_stone", [[0, 400, 0], [4000, 400, 0]], EXAMPLE);
    expect(path[0]).toEqual([4000, 400 + STONE_RADIUS, 0]);
    expect(path[path.length - 1]).toEqual([0, 400 + STONE_RADIUS, 0]);
  });

  test("a rolling stone's path is its middle, a radius over the ground, so it rolls on it rather than half sunk", () => {
    expect(STONE_RADIUS).toBe(360);
  });

  test("a rolling stone's path is in steps of about ROLL_STEP, so it rolls as fast however long it is", () => {
    for (const length of [2000, 4000, 9000]) {
      const path = enemyPath("rolling_stone", [[0, 0, 0], [length, 0, 0]], EXAMPLE);
      expect(length / (path.length - 1)).toBeGreaterThan(ROLL_STEP * 0.8);
      expect(length / (path.length - 1)).toBeLessThan(ROLL_STEP * 1.25);
    }
  });

  test("a rolling stone slows down at each end of its path, to turn round", () => {
    const between = steps(enemyPath("rolling_stone", [[0, 0, 0], [6000, 0, 0]], EXAMPLE));
    const middle = between[Math.floor(between.length / 2)];
    expect(between[0]).toBeLessThan(middle / 2);
    expect(between[between.length - 1]).toBeLessThan(middle / 2);
  });

  test("a rolling stone's path keeps to the path it was given, round its corners", () => {
    const path = enemyPath("rolling_stone", [[0, 0, 0], [3000, 0, 0], [3000, 0, 3000]], EXAMPLE);
    expect(path.every(([x, , z]) => (z === 0 && x >= 0 && x <= 3000) || (x === 3000 && z >= 0 && z <= 3000))).toBe(true);
    expect(path[0]).toEqual([3000, STONE_RADIUS, 3000]); // ends further +x than it starts, so it's turned round
  });

  test("a rolling stone without a path rolls as jungle rollers' do, from its spot, on level ground", () => {
    const path = enemyPath("rolling_stone", [[0, 400, 0]], EXAMPLE);
    expect(path).toEqual(EXAMPLE.map(([x, , z]) => [x - 1000, 400 + STONE_RADIUS, z - 2000]));
  });
});
