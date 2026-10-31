import { describe, expect, test } from "vitest";
import { boxLook, boxTypeName } from "../../src/looks";
import { BOX_TYPES } from "../../src/objects";

describe("boxTypeName", () => {
  test("is the type a box was given", () => {
    expect(boxTypeName("life")).toBe("life");
  });

  test("is the type a subtype number has", () => {
    expect(boxTypeName(13)).toBe("outline");
    expect(boxTypeName(9)).toBe("aku_aku");
  });
});

describe("boxLook", () => {
  test("every type has its own colour", () => {
    const colours = Object.keys(BOX_TYPES).map((t) => boxLook(t as keyof typeof BOX_TYPES).colour);
    expect(new Set(colours).size).toBe(colours.length);
  });

  test("only outline boxes are drawn as their edges", () => {
    expect(boxLook("outline").wireframe).toBe(true);
    expect(boxLook(13).wireframe).toBe(true);
    expect(boxLook("basic").wireframe).toBe(false);
  });

  test("a subtype looks like its type", () => {
    expect(boxLook(8)).toEqual(boxLook("life"));
  });
});
