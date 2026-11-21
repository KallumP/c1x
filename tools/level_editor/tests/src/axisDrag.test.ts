import { describe, expect, test } from "vitest";
import { alongAxis } from "../../src/axisDrag";

describe("alongAxis", () => {
  test("a ray straight down onto the axis comes closest right under it", () => {
    expect(alongAxis([0, 0, 0], [1, 0, 0], [3, 5, 0], [0, -1, 0])).toBeCloseTo(3);
  });

  test("it's measured from the axis's origin", () => {
    expect(alongAxis([2, 0, 0], [1, 0, 0], [3, 5, 0], [0, -1, 0])).toBeCloseTo(1);
  });

  test("behind the origin is less than 0", () => {
    expect(alongAxis([0, 0, 0], [0, 0, 1], [1, 1, -4], [-1, -1, 0])).toBeCloseTo(-4);
  });

  test("a slanted ray that misses the axis comes closest where it passes over it", () => {
    expect(alongAxis([0, 0, 0], [0, 1, 0], [5, 2, 3], [-1, 0, 0])).toBeCloseTo(2);
  });

  test("a ray along the axis has no closest point", () => {
    expect(alongAxis([0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 0, 0])).toBeNull();
  });
});
