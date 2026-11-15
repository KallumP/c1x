import { describe, expect, test } from "vitest";
import { defaultLevelTitle, drawableTitle, levelTitleProblem, TITLE_MAX_LENGTH } from "../../src/levelTitle";

describe("a level's default title", () => {
  test("is its folder's name in words, without the number in front", () => {
    expect(defaultLevelTitle("1_tide_ruins")).toBe("Tide Ruins");
    expect(defaultLevelTitle("3_sunset_canyon")).toBe("Sunset Canyon");
  });

  test("keeps a folder name without a number whole", () => {
    expect(defaultLevelTitle("facing_castle")).toBe("Facing Castle");
  });

  test("leaves out what the loading screen's letters can't draw, such as numbers", () => {
    expect(defaultLevelTitle("acid_cave_2")).toBe("Acid Cave");
    expect(defaultLevelTitle("5")).toBe("");
  });
});

describe("which titles can be drawn", () => {
  test("letters, spaces and full stops, as the game's own loading screens have", () => {
    expect(levelTitleProblem("Dr. Neo Cortex")).toBeNull();
    expect(levelTitleProblem("quiz")).toBeNull();
  });

  test("not one longer than the loading screen fits", () => {
    expect(TITLE_MAX_LENGTH).toBe("Fumbling in the Dark".length);
    expect(levelTitleProblem("a".repeat(TITLE_MAX_LENGTH))).toBeNull();
    expect(levelTitleProblem("a".repeat(TITLE_MAX_LENGTH + 1))).toMatch(/at most/);
  });

  test("not one with a character the letters haven't got, which it names", () => {
    expect(levelTitleProblem("Café")).toMatch(/é/);
    expect(levelTitleProblem("Part 2")).toMatch(/2/);
    expect(levelTitleProblem("Rock & Roll")).toMatch(/&/);
  });
});

describe("a title as it's typed", () => {
  test("drops the characters the letters haven't got, and stops at the most it can have", () => {
    expect(drawableTitle("Café Ruins 2!")).toBe("Caf Ruins ");
    expect(drawableTitle("a".repeat(TITLE_MAX_LENGTH + 5))).toBe("a".repeat(TITLE_MAX_LENGTH));
  });
});
