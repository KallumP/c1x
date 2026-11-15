import { describe, expect, test } from "vitest";
import { defaultLevelTitle, levelTitleProblem, TITLE_MAX_LENGTH } from "../../src/levelTitle";

describe("a level's default title", () => {
  test("is its folder's name in words, without the number in front", () => {
    expect(defaultLevelTitle("1_tide_ruins")).toBe("Tide Ruins");
    expect(defaultLevelTitle("3_sunset_canyon")).toBe("Sunset Canyon");
  });

  test("keeps a folder name without a number whole", () => {
    expect(defaultLevelTitle("facing_castle")).toBe("Facing Castle");
  });

  test("keeps a name that's only a number", () => {
    expect(defaultLevelTitle("5")).toBe("5");
  });
});

describe("which titles can be drawn", () => {
  test("letters, numbers, spaces and the usual punctuation", () => {
    expect(levelTitleProblem("Dr. Brio's Lab: Part 2 - Go!?")).toBeNull();
    expect(levelTitleProblem("rock & roll")).toBeNull();
  });

  test("not one longer than the loading screen fits", () => {
    expect(levelTitleProblem("a".repeat(TITLE_MAX_LENGTH))).toBeNull();
    expect(levelTitleProblem("a".repeat(TITLE_MAX_LENGTH + 1))).toMatch(/at most/);
  });

  test("not one with a character the font hasn't got, which it names", () => {
    expect(levelTitleProblem("Café")).toMatch(/é/);
  });
});
