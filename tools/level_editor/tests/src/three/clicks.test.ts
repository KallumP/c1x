import { describe, expect, test } from "vitest";
import { isLeftPress } from "../../../src/three/clicks";

describe("isLeftPress", () => {
  test("a left press grabs", () => {
    expect(isLeftPress({ button: 0 })).toBe(true);
  });

  test("right and middle presses leave objects to the camera", () => {
    expect(isLeftPress({ button: 2 })).toBe(false);
    expect(isLeftPress({ button: 1 })).toBe(false);
  });
});
