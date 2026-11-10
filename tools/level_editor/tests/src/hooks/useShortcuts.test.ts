import { describe, expect, test } from "vitest";
import { shortcutToRun } from "../../../src/hooks/useShortcuts";

const press = (key: string, held: { ctrl?: boolean; shift?: boolean } = {}) =>
  ({ key, ctrlKey: !!held.ctrl, metaKey: false, shiftKey: !!held.shift });

describe("shortcutToRun", () => {
  const save = () => {};
  const remove = () => {};
  const buildAndBoot = () => {};
  const shortcuts = { "ctrl+s": save, Delete: remove, F5: buildAndBoot };

  test("finds a key's shortcut", () => {
    expect(shortcutToRun(shortcuts, press("s", { ctrl: true }), false)).toBe(save);
    expect(shortcutToRun(shortcuts, press("Delete"), false)).toBe(remove);
    expect(shortcutToRun(shortcuts, press("F5"), false)).toBe(buildAndBoot);
  });

  test("is undefined for a key with none", () => {
    expect(shortcutToRun(shortcuts, press("a"), false)).toBeUndefined();
  });

  test("leaves keys to a field being typed in, except with ctrl", () => {
    expect(shortcutToRun(shortcuts, press("Delete"), true)).toBeUndefined();
    expect(shortcutToRun(shortcuts, press("s", { ctrl: true }), true)).toBe(save);
  });

  test("runs function keys while typing", () => {
    // they type nothing, and F5 would reload the page
    expect(shortcutToRun(shortcuts, press("F5"), true)).toBe(buildAndBoot);
  });
});
