import { describe, expect, test } from "vitest";
import { placeableName, placeablesByName } from "../../src/objectNames";
import { BOX_TYPES, ENEMY_TYPES, type BoxType } from "../../src/objects";

describe("the names the palette shows", () => {
  test.each([
    ["snake", "Cobra"],
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

  test.each([
    ["lily_pad", "Lily pad"],
    ["leaf", "Floating leaf"],
  ] as const)("the %s obstacle is named %s", (what, name) => {
    expect(placeableName(what)).toBe(name);
  });

  test("a type without a name of its own is named by its id in words", () => {
    expect(placeableName("gunman")).toBe("Gunman");
    expect(placeableName("camera_robot")).toBe("Camera robot");
  });

  // variants of one thing: the thing, then which in brackets, so they sit together in the list
  test.each([
    ["lizard", "Lizard (green)"],
    ["red_lizard", "Lizard (red)"],
    ["walking_lizard", "Lizard (walking)"],
    ["blue_river_plant", "River plant (blue)"],
    ["green_river_plant", "River plant (green)"],
    ["spider", "Spider (hanging)"],
    ["walking_spider", "Spider (walking)"],
    ["bat", "Bats (roost)"],
    ["leader_bats", "Bats (leaders)"],
    ["lab_assistant", "Lab assistant"],
    ["electric_scientist", "Lab assistant (electric)"],
    ["iron", "Iron"],
    ["iron_arrow", "Iron (arrow)"],
    ["iron_outline", "Iron (outline)"],
    ["tnt", "TNT"],
    ["enemy_tnt", "TNT (enemy)"],
  ] as const)("the variant %s is named %s", (what, name) => {
    expect(placeableName(what)).toBe(name);
  });

  test("types are listed in alphabetical order of their names", () => {
    const listed = placeablesByName([...ENEMY_TYPES]).map(placeableName);
    expect(listed).toEqual([...listed].sort((first, second) => first.localeCompare(second)));
    expect(placeablesByName(["snake", "badger", "crab"])).toEqual(["badger", "snake", "crab"]); // badger, cobra, crab
  });
});
