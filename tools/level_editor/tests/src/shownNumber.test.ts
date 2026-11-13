import { describe, expect, test } from "vitest";
import { shownNumber } from "../../src/shownNumber";

describe("numbers shown in the editor's fields", () => {
  test("a sum that floating point can't hold exactly is shown as the number it should be", () => {
    expect(shownNumber(-2.1 + 5.465)).toBe(3.365);
  });

  test("they show at most 4 decimal places", () => {
    expect(shownNumber(1.23456789)).toBe(1.2346);
  });

  test("a number with fewer is shown as it is", () => {
    expect(shownNumber(-3.986)).toBe(-3.986);
    expect(shownNumber(12)).toBe(12);
  });

  test("a tiny negative number is shown as 0, not -0", () => {
    expect(Object.is(shownNumber(-0.00001), 0)).toBe(true);
  });
});
