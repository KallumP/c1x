import { describe, expect, test } from "vitest";
import { emptyEditor, type EditorAction } from "../../../src/editor";
import { editorShortcuts } from "../../../src/hooks/useEditorShortcuts";
import { shortcutToRun } from "../../../src/hooks/useShortcuts";
import { press } from "./press";

describe("the editor's shortcuts", () => {
  const actions = { stopPlacing: () => {}, save: () => {}, build: () => {}, buildAndBoot: () => {} };
  const shortcuts = editorShortcuts(emptyEditor, () => {}, actions);

  test("ctrl+shift+b builds, ctrl+s saves, and f5 builds and boots", () => {
    expect(shortcutToRun(shortcuts, press("B", { ctrl: true, shift: true }), false)).toBe(actions.build);
    expect(shortcutToRun(shortcuts, press("s", { ctrl: true }), false)).toBe(actions.save);
    expect(shortcutToRun(shortcuts, press("F5"), false)).toBe(actions.buildAndBoot);
  });

  test("ctrl+c copies the selected object", () => {
    const dispatched: EditorAction[] = [];
    const copying = editorShortcuts(emptyEditor, (action) => dispatched.push(action), actions);
    shortcutToRun(copying, press("c", { ctrl: true }), false)?.();
    expect(dispatched).toEqual([{ type: "copy" }]);
  });

  test("ctrl+v pastes what's copied", () => {
    const dispatched: EditorAction[] = [];
    const pasting = editorShortcuts(emptyEditor, (action) => dispatched.push(action), actions);
    shortcutToRun(pasting, press("v", { ctrl: true }), false)?.();
    expect(dispatched).toEqual([{ type: "paste" }]);
  });
});
