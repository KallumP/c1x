import { describe, expect, test } from "vitest";
import { editorReducer, emptyEditor, newObject, type EditorState } from "../../src/editor";
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

describe("select", () => {
  test("selects an object, or nothing", () => {
    const state = editorReducer(withObjects([box(1), box(2)]), { type: "select", index: 1 });
    expect(state.selected).toBe(1);
    expect(editorReducer(state, { type: "select", index: null }).selected).toBeNull();
  });
});
