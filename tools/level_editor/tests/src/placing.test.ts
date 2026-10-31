import { describe, expect, test } from "vitest";
import { placeOnFloor, towardsViewer } from "../../src/placing";

const UP: [number, number, number] = [0, 1, 0];

describe("towardsViewer", () => {
  test("keeps a normal facing back along the ray", () => {
    expect(towardsViewer([0, 1, 0], [0, -1, 0])).toEqual([0, 1, 0]);
  });

  test("turns round a normal facing away, as faces are drawn from both sides", () => {
    expect(towardsViewer([0, -1, 0], [0.2, -0.9, 0])).toEqual([-0, 1, -0]);
  });
});

describe("placeOnFloor", () => {
  test("is where the click hit, in blender", () => {
    expect(placeOnFloor([1.2, 0.6, -9.7], UP, 0)).toEqual([1.2, 9.7, 0.6]);
  });

  test("snaps across the floor to the grid, keeping the floor's height", () => {
    expect(placeOnFloor([1.2, 0.6, -9.7], UP, 0.5)).toEqual([1, 9.5, 0.6]);
    expect(placeOnFloor([1.3, 0.6, -9.8], UP, 1)).toEqual([1, 10, 0.6]);
  });

  test("isn't anywhere for a wall or a ceiling, as the build puts objects on the ground below", () => {
    expect(placeOnFloor([1, 1, 1], [1, 0, 0], 0)).toBeNull();
    expect(placeOnFloor([1, 1, 1], [0, -1, 0], 0)).toBeNull();
  });

  test("takes a slope that's mostly floor", () => {
    expect(placeOnFloor([0, 0, 0], [0.5, 0.8, 0], 0)).not.toBeNull();
  });
});
