import { describe, expect, test } from "vitest";
import { editorReducer, emptyEditor, newObject, type EditorAction, type EditorState } from "../../src/editor";
import type { LevelObject } from "../../src/objects";

const box = (x: number): LevelObject => newObject("basic", [x, 0, 0]);

function withObjects(objects: LevelObject[]): EditorState {
  return editorReducer(emptyEditor, { type: "load", objects });
}

describe("newObject", () => {
  test("makes a box of a type, or a spawn or end, standing where it's put", () => {
    expect(newObject("life", [1, 2, 3])).toEqual({ kind: "box", box: "life", at: [1, 2, 3], raise: 0, stack: 1 });
    expect(newObject("spawn", [1, 2, 3])).toEqual({ kind: "spawn", at: [1, 2, 3], raise: 0, stack: 1 });
    expect(newObject("end", [1, 2, 3])).toEqual({ kind: "end", at: [1, 2, 3], raise: 0, stack: 1 });
  });
});

describe("new enemies", () => {
  test("a plant stands where it's put", () => {
    expect(newObject("plant", [1, 2, 3])).toEqual({ kind: "enemy", enemy: "plant", at: [1, 2, 3], raise: 0, stack: 1 });
  });
});

describe("load", () => {
  test("opens a level's objects with nothing selected", () => {
    const state = withObjects([box(1)]);
    expect(state.objects).toEqual([box(1)]);
    expect(state.selected).toBeNull();
  });
});

describe("add", () => {
  test("adds an object at the end and selects it", () => {
    const state = editorReducer(withObjects([box(1)]), { type: "add", object: box(2) });
    expect(state.objects).toEqual([box(1), box(2)]);
    expect(state.selected).toBe(1);
  });

  test("moves the spawn or end there if the level has one already", () => {
    const spawn = newObject("spawn", [0, 0, 0]);
    const state = editorReducer(withObjects([spawn, box(1)]), { type: "add", object: newObject("spawn", [5, 5, 0]) });
    expect(state.objects).toEqual([newObject("spawn", [5, 5, 0]), box(1)]);
    expect(state.selected).toBe(0);
  });
});

describe("update", () => {
  test("changes an object's settings", () => {
    const state = editorReducer(withObjects([box(1), box(2)]), { type: "update", index: 1, changes: { stack: 3, box: "life" } });
    expect(state.objects).toEqual([box(1), { ...box(2), stack: 3, box: "life" }]);
  });

  test("moves an object", () => {
    const state = editorReducer(withObjects([box(1)]), { type: "update", index: 0, changes: { at: [4, 5, 6] } });
    expect(state.objects[0].at).toEqual([4, 5, 6]);
  });
});

describe("remove", () => {
  test("removes an object, and the selection if it was selected", () => {
    let state = editorReducer(withObjects([box(1), box(2)]), { type: "select", index: 1 });
    state = editorReducer(state, { type: "remove", index: 1 });
    expect(state.objects).toEqual([box(1)]);
    expect(state.selected).toBeNull();
  });

  test("keeps the same object selected when one before it goes", () => {
    let state = editorReducer(withObjects([box(1), box(2), box(3)]), { type: "select", index: 2 });
    state = editorReducer(state, { type: "remove", index: 0 });
    expect(state.objects[state.selected!]).toEqual(box(3));
  });
});

describe("undo and redo", () => {
  const run = (state: EditorState, ...actions: EditorAction[]) => actions.reduce(editorReducer, state);

  test("undo takes back adding, changing and removing, one at a time", () => {
    const start = withObjects([box(1)]);
    const edited = run(start,
      { type: "add", object: box(2) },
      { type: "update", index: 0, changes: { stack: 2 } },
      { type: "remove", index: 1 });
    expect(edited.objects).toEqual([{ ...box(1), stack: 2 }]);
    const once = run(edited, { type: "undo" });
    expect(once.objects).toEqual([{ ...box(1), stack: 2 }, box(2)]);
    expect(run(once, { type: "undo" }, { type: "undo" }).objects).toEqual([box(1)]);
  });

  test("redo puts back what was undone, until something else changes", () => {
    const edited = run(withObjects([]), { type: "add", object: box(1) }, { type: "undo" });
    expect(run(edited, { type: "redo" }).objects).toEqual([box(1)]);
    expect(run(edited, { type: "add", object: box(2) }, { type: "redo" }).objects).toEqual([box(2)]);
  });

  test("there's nothing to undo when a level opens", () => {
    const state = run(withObjects([box(1)]), { type: "undo" });
    expect(state.objects).toEqual([box(1)]);
  });

  test("a drag is one change: a checkpoint, then moves that aren't recorded", () => {
    const dragged = run(withObjects([box(1)]),
      { type: "checkpoint" },
      { type: "update", index: 0, changes: { at: [2, 0, 0] }, record: false },
      { type: "update", index: 0, changes: { at: [3, 0, 0] }, record: false });
    expect(dragged.objects[0].at).toEqual([3, 0, 0]);
    expect(run(dragged, { type: "undo" }).objects).toEqual([box(1)]);
  });

  test("selecting isn't a change", () => {
    const state = run(withObjects([box(1)]), { type: "add", object: box(2) }, { type: "select", index: 0 }, { type: "undo" });
    expect(state.objects).toEqual([box(1)]);
  });

  test("undoing an add leaves nothing selected that's gone", () => {
    const state = run(withObjects([box(1)]), { type: "add", object: box(2) }, { type: "undo" });
    expect(state.selected).toBeNull();
  });
});

describe("select", () => {
  test("selects an object, or nothing", () => {
    const state = editorReducer(withObjects([box(1), box(2)]), { type: "select", index: 1 });
    expect(state.selected).toBe(1);
    expect(editorReducer(state, { type: "select", index: null }).selected).toBeNull();
  });
});
