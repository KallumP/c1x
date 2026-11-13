import { describe, expect, test } from "vitest";
import { endPadRaise } from "../../src/endPad";
import type { Triangle } from "../../src/overlaps";
import type { Vec3 } from "../../src/objects";

const SCALE = 400; // the pad's radius is 400 game units: a metre

// a floor facing up from (x0, y0) to (x1, y1), its height at each point given by height
function floor(x0: number, y0: number, x1: number, y1: number, height: (x: number, y: number) => number): Triangle[] {
  const corner = (x: number, y: number): Vec3 => [x, y, height(x, y)];
  return [
    [corner(x0, y0), corner(x1, y0), corner(x1, y1)],
    [corner(x0, y0), corner(x1, y1), corner(x0, y1)],
  ];
}

const flat = (z: number) => () => z;

describe("endPadRaise", () => {
  test("on flat ground, a pad is lifted 128 game units", () => {
    expect(endPadRaise([0, 0, 0], SCALE, floor(-5, -5, 5, 5, flat(0)))).toBeCloseTo(128 / SCALE);
  });

  test("on a slope, a pad is lifted over the highest floor within its radius", () => {
    // rising 0.2 m a metre along x: a metre from the pad it's 0.2 m up
    const slope = floor(-5, -5, 5, 5, (x) => 0.2 * x);
    expect(endPadRaise([0, 0, 0], SCALE, slope)).toBeCloseTo(0.2 + 128 / SCALE, 2);
  });

  test("a cliff beside the pad is a wall, not floor to clear", () => {
    const ground = floor(-5, -5, 0.5, 5, flat(0));
    const cliffTop = floor(0.5, -5, 5, 5, flat(3));
    expect(endPadRaise([0, 0, 0], SCALE, [...ground, ...cliffTop])).toBeCloseTo(128 / SCALE);
  });

  test("floor falling away beside the pad doesn't lower it", () => {
    const ledge = floor(-5, -5, 0.5, 5, flat(0));
    const below = floor(0.5, -5, 5, 5, flat(-2));
    expect(endPadRaise([0, 0, 0], SCALE, [...ledge, ...below])).toBeCloseTo(128 / SCALE);
  });

  test("the raise is rounded to the millimetre", () => {
    const raise = endPadRaise([0, 0, 0], SCALE, floor(-5, -5, 5, 5, (x) => 0.1234 * x));
    expect(Math.round(raise * 1000) / 1000).toBe(raise);
  });
});
