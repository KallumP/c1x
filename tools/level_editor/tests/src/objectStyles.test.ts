import { describe, expect, test } from "vitest";
import { boxStyle } from "../../src/objectStyles";
import { BOX_TYPES } from "../../src/objects";

describe("boxStyle", () => {
  test("every type has its own colour", () => {
    const colours = Object.keys(BOX_TYPES).map((t) => boxStyle(t as keyof typeof BOX_TYPES).colour);
    expect(new Set(colours).size).toBe(colours.length);
  });

  test("only outline boxes are drawn as their edges", () => {
    expect(boxStyle("outline").wireframe).toBe(true);
    expect(boxStyle(13).wireframe).toBe(true);
    expect(boxStyle("basic").wireframe).toBe(false);
  });

  test("a subtype looks like its type", () => {
    expect(boxStyle(8)).toEqual(boxStyle("life"));
  });
});
