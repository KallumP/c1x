import { describe, expect, test } from "vitest";
import { placeableName, placeablesByName } from "../../src/objectNames";
import { BOX_TYPES, ENEMY_TYPES, type BoxType } from "../../src/objects";

describe("the names the palette shows", () => {
  test.each([
    ["snake", "Cobra"],
    ["bat", "Bat roost"],
    ["spider", "Hanging spider"],
    ["lizard", "Green lizard"],
    ["blue_river_plant", "Blue river plant"],
    ["question", "Question mark"],
    ["life", "Extra life"],
    ["tnt", "TNT"],
    ["spawn", "Spawn"],
  ] as const)("%s is named %s", (what, name) => {
    expect(placeableName(what)).toBe(name);
  });

  test("every box and enemy type has a name, each its own", () => {
    const names = [...Object.keys(BOX_TYPES), ...ENEMY_TYPES].map((what) => placeableName(what as BoxType));
    names.forEach((name) => expect(name).toMatch(/^[A-Z0-9]/));
    expect(new Set(names).size).toBe(names.length);
  });

  test("a type without a name of its own is named by its id in words", () => {
    expect(placeableName("walking_lizard" as BoxType)).toBe("Walking lizard");
  });

  test("types are listed in alphabetical order of their names", () => {
    const listed = placeablesByName([...ENEMY_TYPES]).map(placeableName);
    expect(listed).toEqual([...listed].sort((first, second) => first.localeCompare(second)));
    expect(placeablesByName(["snake", "badger", "crab"])).toEqual(["badger", "snake", "crab"]); // badger, cobra, crab
  });
});
