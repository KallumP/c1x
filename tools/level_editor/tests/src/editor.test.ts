import { describe, expect, test } from "vitest";
import {
  canRemoveWaypoint, editorReducer, emptyEditor, movedTo, newObject, NEW_ROLL_LENGTH, NEW_WAYPOINT_DISTANCE,
  waypointAdded, waypointMovedTo, waypointRemoved, type EditorAction, type EditorState,
} from "../../src/editor";
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

  test("a level can have many, so adding one keeps the rest", () => {
    const state = editorReducer(withObjects([newObject("plant", [0, 0, 0])]), { type: "add", object: newObject("plant", [5, 0, 0]) });
    expect(state.objects).toEqual([newObject("plant", [0, 0, 0]), newObject("plant", [5, 0, 0])]);
  });

  test("a rolling stone has a path from where it's put, across the map, to show and change", () => {
    expect(newObject("rolling_stone", [1, 2, 3])).toEqual({
      kind: "enemy", enemy: "rolling_stone", at: [1, 2, 3], raise: 0, stack: 1, path: [[1 + NEW_ROLL_LENGTH, 2, 3]],
    });
  });
});

describe("movedTo", () => {
  test("moves an object to a spot", () => {
    expect(movedTo(box(0), [4, 5, 6])).toEqual({ at: [4, 5, 6] });
  });

  test("moves an enemy's path along with it, keeping its shape", () => {
    const stone = { ...newObject("rolling_stone", [0, 0, 0]), path: [[3, 0, 0], [3, 2, 1]] as LevelObject["path"] };
    expect(movedTo(stone, [1, 1, 1])).toEqual({ at: [1, 1, 1], path: [[4, 1, 1], [4, 3, 2]] });
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

const stoneWithPath = (...path: LevelObject["path"] & object): LevelObject =>
  ({ ...newObject("rolling_stone", [0, 0, 0]), path });

describe("editing an enemy's path", () => {
  test("moves one waypoint, leaving the rest", () => {
    const stone = stoneWithPath([3, 0, 0], [3, 2, 0]);
    expect(waypointMovedTo(stone, 1, [5, 5, 1])).toEqual({ path: [[3, 0, 0], [5, 5, 1]] });
  });

  test("adds a waypoint after the last, carrying on the way the path last went", () => {
    const stone = stoneWithPath([3, 0, 0], [3, 4, 0]);
    expect(waypointAdded(stone)).toEqual({ path: [[3, 0, 0], [3, 4, 0], [3, 4 + NEW_WAYPOINT_DISTANCE, 0]] });
  });

  test("a path's first waypoint carries on from the enemy's spot", () => {
    const stone = { ...stoneWithPath([0, 2, 1]), at: [0, 0, 1] as LevelObject["at"] };
    expect(waypointAdded(stone)).toEqual({ path: [[0, 2, 1], [0, 2 + NEW_WAYPOINT_DISTANCE, 1]] });
  });

  test("an enemy without a path gets one across the map (+x)", () => {
    const plant = newObject("plant", [1, 2, 3]);
    expect(waypointAdded(plant)).toEqual({ path: [[1 + NEW_WAYPOINT_DISTANCE, 2, 3]] });
  });

  test("a waypoint on top of the one before it adds across the map (+x)", () => {
    const stone = stoneWithPath([0, 0, 0]);
    expect(waypointAdded(stone)).toEqual({ path: [[0, 0, 0], [NEW_WAYPOINT_DISTANCE, 0, 0]] });
  });

  test("removes a waypoint", () => {
    const stone = stoneWithPath([3, 0, 0], [3, 2, 0], [5, 2, 0]);
    expect(waypointRemoved(stone, 1)).toEqual({ path: [[3, 0, 0], [5, 2, 0]] });
  });
});

describe("selecting a waypoint", () => {
  const run = (state: EditorState, ...actions: EditorAction[]) => actions.reduce(editorReducer, state);
  const stone = stoneWithPath([3, 0, 0], [3, 2, 0]);

  test("selects a waypoint of the selected enemy's path, or none", () => {
    const state = run(withObjects([stone]), { type: "select", index: 0 }, { type: "selectWaypoint", waypoint: 1 });
    expect(state.waypoint).toBe(1);
    expect(run(state, { type: "selectWaypoint", waypoint: null }).waypoint).toBeNull();
  });

  test("selecting an object, or nothing, leaves no waypoint selected", () => {
    const selected = run(withObjects([stone, box(1)]), { type: "select", index: 0 }, { type: "selectWaypoint", waypoint: 1 });
    expect(run(selected, { type: "select", index: 1 }).waypoint).toBeNull();
    expect(run(selected, { type: "select", index: null }).waypoint).toBeNull();
  });

  test("a level opens with no waypoint selected", () => {
    expect(withObjects([stone]).waypoint).toBeNull();
  });

  test("undo leaves no waypoint selected that's gone", () => {
    const state = run(withObjects([stone]),
      { type: "select", index: 0 },
      { type: "update", index: 0, changes: waypointAdded(stone) },
      { type: "selectWaypoint", waypoint: 2 },
      { type: "undo" });
    expect(state.waypoint).toBeNull();
  });

  test("removing the selected object leaves no waypoint selected", () => {
    const state = run(withObjects([stone]), { type: "select", index: 0 }, { type: "selectWaypoint", waypoint: 0 }, { type: "remove", index: 0 });
    expect(state.waypoint).toBeNull();
  });
});

describe("adding and removing the selected enemy's waypoints", () => {
  const run = (state: EditorState, ...actions: EditorAction[]) => actions.reduce(editorReducer, state);
  const stone = stoneWithPath([3, 0, 0], [3, 2, 0]);
  const selectedStone = (waypoint: number | null) =>
    run(withObjects([stone]), { type: "select", index: 0 }, { type: "selectWaypoint", waypoint });

  test("adding puts a waypoint after the last and selects it, as one change", () => {
    const state = run(selectedStone(null), { type: "addWaypoint" });
    expect(state.objects[0].path).toEqual(waypointAdded(stone).path);
    expect(state.waypoint).toBe(2);
    expect(run(state, { type: "undo" }).objects).toEqual([stone]);
  });

  test("removing takes the selected waypoint away, leaving none selected", () => {
    const state = run(selectedStone(0), { type: "removeWaypoint" });
    expect(state.objects[0].path).toEqual([[3, 2, 0]]);
    expect(state.waypoint).toBeNull();
  });

  test("a path keeps its last waypoint, so a stone doesn't fall back to jungle rollers' path", () => {
    const lone = run(selectedStone(0), { type: "removeWaypoint" }, { type: "selectWaypoint", waypoint: 0 });
    expect(canRemoveWaypoint(lone)).toBe(false);
    expect(run(lone, { type: "removeWaypoint" }).objects[0].path).toEqual([[3, 2, 0]]);
  });

  test("there's nothing to remove with no waypoint selected", () => {
    expect(canRemoveWaypoint(selectedStone(null))).toBe(false);
    expect(canRemoveWaypoint(selectedStone(1))).toBe(true);
    expect(run(selectedStone(null), { type: "removeWaypoint" }).objects).toEqual([stone]);
  });
});
