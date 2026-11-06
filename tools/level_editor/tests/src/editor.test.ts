import { describe, expect, test } from "vitest";
import { draggedTo, editorReducer, emptyEditor, newObject, type EditorAction, type EditorState } from "../../src/editor";
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

  test("a rolling stone stands where it's put; its path comes with its track", () => {
    expect(newObject("rolling_stone", [1, 2, 3])).toEqual({ kind: "enemy", enemy: "rolling_stone", at: [1, 2, 3], raise: 0, stack: 1 });
  });

  test("a crab stands where it's put; its path comes from n. sanity beach's", () => {
    expect(newObject("crab", [1, 2, 3])).toEqual({ kind: "enemy", enemy: "crab", at: [1, 2, 3], raise: 0, stack: 1 });
  });

  test("a turtle stands where it's put; its path comes from n. sanity beach's", () => {
    expect(newObject("turtle", [1, 2, 3])).toEqual({ kind: "enemy", enemy: "turtle", at: [1, 2, 3], raise: 0, stack: 1 });
  });

  test("a level can have many, so adding one keeps the rest", () => {
    const state = editorReducer(withObjects([newObject("plant", [0, 0, 0])]), { type: "add", object: newObject("plant", [5, 0, 0]) });
    expect(state.objects).toEqual([newObject("plant", [0, 0, 0]), newObject("plant", [5, 0, 0])]);
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

describe("a path's nodes", () => {
  const crab = newObject("crab", [0, 0, 0]);
  const withCrabSelected = () => editorReducer(withObjects([box(1), crab]), { type: "select", index: 1 });

  test("selecting a node selects its enemy and the node", () => {
    const state = editorReducer(withObjects([box(1), crab]), { type: "selectNode", index: 1, node: 2 });
    expect([state.selected, state.selectedNode]).toEqual([1, 2]);
  });

  test("nothing has a node selected to start with, or after selecting an object", () => {
    expect(withObjects([crab]).selectedNode).toBeNull();
    const nodeSelected = editorReducer(withCrabSelected(), { type: "selectNode", index: 1, node: 2 });
    expect(editorReducer(nodeSelected, { type: "select", index: 1 }).selectedNode).toBeNull();
    expect(editorReducer(nodeSelected, { type: "select", index: null }).selectedNode).toBeNull();
  });

  test("removing the enemy lets go of its node", () => {
    const nodeSelected = editorReducer(withCrabSelected(), { type: "selectNode", index: 1, node: 2 });
    expect(editorReducer(nodeSelected, { type: "remove", index: 1 }).selectedNode).toBeNull();
  });

  test("undoing keeps the node selected while the path still has it, else lets go of it", () => {
    const path: LevelObject["path"] = [[0, 0, 0], [1, 0, 0], [2, 0, 0]];
    const withPath = editorReducer(withCrabSelected(), { type: "update", index: 1, changes: { path } });
    const secondSelected = editorReducer(withPath, { type: "selectNode", index: 1, node: 1 });
    const shortened = editorReducer(secondSelected, { type: "update", index: 1, changes: { path: path.slice(0, 2) } });
    expect(editorReducer(shortened, { type: "undo" }).selectedNode).toBe(1);
    const twoNodes = editorReducer(withObjects([box(1), { ...crab, path: path.slice(0, 2) }]), { type: "update", index: 1, changes: { path } });
    const third = editorReducer(twoNodes, { type: "selectNode", index: 1, node: 2 });
    expect(editorReducer(third, { type: "undo" }).selectedNode).toBeNull();
  });
});

describe("dragging", () => {
  const crab = newObject("crab", [1, 2, 3]);

  test("an object is moved to where it's dragged", () => {
    expect(draggedTo(crab, null, [4, 5, 6], 0, 400)).toEqual({ at: [4, 5, 6] });
  });

  test("a path's node is moved to where it's dragged, the enemy staying put", () => {
    const changes = draggedTo({ ...crab, path: [[0, 0, 0], [1, 0, 0]] }, 1, [4, 5, 3], 0, 400);
    expect(changes).toEqual({ path: [[0, 0, 0], [3, 3, 0]] });
  });

  test("a node's drag is undone in one go, back to the path before it", () => {
    const path: LevelObject["path"] = [[0, 0, 0], [1, 0, 0]];
    let state = editorReducer(withObjects([{ ...crab, path }]), { type: "selectNode", index: 0, node: 1 });
    state = editorReducer(state, { type: "checkpoint" });
    for (const x of [2, 3, 4]) {
      state = editorReducer(state, { type: "update", index: 0, changes: draggedTo(state.objects[0], 1, [x, 2, 3], 0, 400), record: false });
    }
    expect(state.objects[0].path).toEqual([[0, 0, 0], [3, 0, 0]]);
    expect(editorReducer(state, { type: "undo" }).objects[0].path).toEqual(path);
  });
});
