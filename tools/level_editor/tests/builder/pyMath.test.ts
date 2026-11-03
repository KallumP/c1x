import { describe, expect, test } from "vitest";
import { floorDivide, pythonModulo, roundHalfToEven } from "../../builder/pyMath";

describe("rounding as python's round()", () => {
  test("halves go to the even neighbour", () => {
    expect([0.5, 1.5, 2.5, 3.5].map(roundHalfToEven)).toEqual([0, 2, 2, 4]);
    expect([-0.5, -1.5, -2.5].map(roundHalfToEven)).toEqual([0, -2, -2]);
  });

  test("everything else to the nearest whole number", () => {
    expect([2.4999, 2.5001, -2.6, 7].map(roundHalfToEven)).toEqual([2, 3, -3, 7]);
  });

  test("never -0", () => {
    expect(Object.is(roundHalfToEven(-0.4), 0)).toBe(true);
  });
});

describe("floor division as python's //", () => {
  test("whole numbers round down, towards minus infinity", () => {
    expect(floorDivide(7, 2)).toBe(3);
    expect(floorDivide(-7, 2)).toBe(-4);
    expect(floorDivide(7, -2)).toBe(-4);
    expect(floorDivide(-1, 128)).toBe(-1);
  });

  test("floats as python works them out, from the remainder", () => {
    expect(floorDivide(1, 0.1)).toBe(9); // Math.floor(1 / 0.1) is 10
    expect(floorDivide(0.3, 0.1)).toBe(2);
    expect(floorDivide(-0.5, 128)).toBe(-1);
  });
});

describe("modulo as python's %", () => {
  test("takes the divisor's sign", () => {
    expect(pythonModulo(-7, 2)).toBe(1);
    expect(pythonModulo(7, -2)).toBe(-1);
    expect(pythonModulo(-1, 8)).toBe(7);
    expect(pythonModulo(9, 8)).toBe(1);
  });

  test("floats as python works them out", () => {
    expect(pythonModulo(1, 0.1)).toBe(0.09999999999999995);
  });
});
