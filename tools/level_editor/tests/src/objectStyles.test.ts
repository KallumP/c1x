import { describe, expect, test } from "vitest";
import { boxStyle, ENEMY_COLOURS, OBSTACLE_COLOURS } from "../../src/objectStyles";
import { BOX_TYPES, ENEMY_TYPES, OBSTACLE_TYPES } from "../../src/objects";

describe("boxStyle", () => {
  test("every type has its own colour", () => {
    const colours = Object.keys(BOX_TYPES).map((t) => boxStyle(t as keyof typeof BOX_TYPES).colour);
    expect(new Set(colours).size).toBe(colours.length);
  });

  test("only outline boxes are drawn as their edges, in their own type's colour", () => {
    expect(boxStyle("life", true)).toEqual({ colour: boxStyle("life").colour, wireframe: true });
    expect(boxStyle("iron", true).wireframe).toBe(true);
    expect(boxStyle("basic").wireframe).toBe(false);
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

describe("obstacle colours", () => {
  test("every obstacle has its own colour, unlike any box's or enemy's", () => {
    const others = [...Object.keys(BOX_TYPES).map((t) => boxStyle(t as keyof typeof BOX_TYPES).colour), ...ENEMY_TYPES.map((type) => ENEMY_COLOURS[type])];
    const obstacleColours = OBSTACLE_TYPES.map((type) => OBSTACLE_COLOURS[type]);
    expect(obstacleColours.every(Boolean)).toBe(true);
    expect(new Set([...others, ...obstacleColours]).size).toBe(others.length + obstacleColours.length);
  });
});
