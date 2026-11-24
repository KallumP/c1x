import { describe, expect, test } from "vitest";
import { saveButtonText, saveChanged, type Savable } from "../../../src/hooks/useSave";

// a part of the level that says whether it saved, and keeps count of its saves
function part(unsaved: boolean, saves = true) {
  const savable = { unsaved, timesSaved: 0, save: async () => {
    savable.timesSaved++;
    return saves;
  } };
  return savable satisfies Savable;
}

describe("saveChanged", () => {
  test("saves only the parts that changed", async () => {
    const objects = part(true);
    const levelCfg = part(false);
    await saveChanged([objects, levelCfg]);
    expect([objects.timesSaved, levelCfg.timesSaved]).toEqual([1, 0]);
  });

  test("is saved when every changed part saves", async () => {
    expect(await saveChanged([part(true), part(true)])).toBe(true);
  });

  test("is saved when nothing changed", async () => {
    expect(await saveChanged([part(false), part(false)])).toBe(true);
  });

  test("stops at a part that fails, leaving the rest unsaved", async () => {
    const levelCfg = part(true);
    expect(await saveChanged([part(true, false), levelCfg])).toBe(false);
    expect(levelCfg.timesSaved).toBe(0);
  });

  test("isn't saved when the last part fails", async () => {
    expect(await saveChanged([part(true), part(true, false)])).toBe(false);
  });
});

describe("saveButtonText", () => {
  test("says it's saving while it is", () => {
    expect(saveButtonText(true, true)).toBe("Saving...");
  });

  test("offers to save unsaved changes", () => {
    expect(saveButtonText(false, true)).toBe("Save");
  });

  test("says it's saved with nothing to save", () => {
    expect(saveButtonText(false, false)).toBe("Saved");
  });
});
