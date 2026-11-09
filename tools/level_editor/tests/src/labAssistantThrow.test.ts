import { describe, expect, test } from "vitest";
import { framesToLand, LAB_ASSISTANT_REACH, throwSpeed } from "../../src/labAssistantThrow";

describe("a lab assistant's vials (as seen in the game)", () => {
  test("land 21 frames after they're thrown on flat ground, sooner on higher ground and later on lower", () => {
    expect(framesToLand(0)).toBe(21);
    expect(framesToLand(1000)).toBeLessThan(21);
    expect(framesToLand(-1000)).toBeGreaterThan(21);
  });

  test("thrown as stormy ascent's first (2480 along the ground) land about 1878 off on flat ground", () => {
    expect(LAB_ASSISTANT_REACH).toBeCloseTo(148 + (21 * 2480 * 34) / 1024, 0);
    expect(Math.round(LAB_ASSISTANT_REACH)).toBe(1877);
  });

  test("the speed along the ground to land a distance off: 2480 for that throw, more for further, or less for lower ground", () => {
    expect(throwSpeed(LAB_ASSISTANT_REACH, 0)).toBeCloseTo(2480);
    expect(throwSpeed(4000, 0)).toBeGreaterThan(2480);
    expect(throwSpeed(LAB_ASSISTANT_REACH, -1000)).toBeLessThan(2480);
  });

  test("a landing spot nearer than its hand needs no speed", () => {
    expect(throwSpeed(100, 0)).toBe(0);
  });
});
