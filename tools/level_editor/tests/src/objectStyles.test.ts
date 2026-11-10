import { describe, expect, test } from "vitest";
import { boxStyle, ENEMY_COLOURS } from "../../src/objectStyles";
import { BOX_TYPES, ENEMY_TYPES } from "../../src/objects";

describe("boxStyle", () => {
  test("every type has its own colour", () => {
    const colours = Object.keys(BOX_TYPES).map((t) => boxStyle(t as keyof typeof BOX_TYPES).colour);
    expect(new Set(colours).size).toBe(colours.length);
  });

  test("only outline boxes are drawn as their edges, iron outlines included", () => {
    expect(boxStyle("outline").wireframe).toBe(true);
    expect(boxStyle(BOX_TYPES.outline).wireframe).toBe(true);
    expect(boxStyle("iron_outline").wireframe).toBe(true);
    expect(boxStyle("basic").wireframe).toBe(false);
    expect(boxStyle("iron_arrow").wireframe).toBe(false);
  });

  test("a box given as a subtype number is styled the same as its type name", () => {
    expect(boxStyle(8)).toEqual(boxStyle("life"));
  });
});

describe("enemy colours", () => {
  test("every enemy has its own colour, unlike any box's", () => {
    const boxColours = Object.keys(BOX_TYPES).map((t) => boxStyle(t as keyof typeof BOX_TYPES).colour);
    const enemyColours = ENEMY_TYPES.map((type) => ENEMY_COLOURS[type]);
    expect(enemyColours.every(Boolean)).toBe(true);
    expect(new Set([...boxColours, ...enemyColours]).size).toBe(boxColours.length + enemyColours.length);
  });
});
