import { describe, expect, test } from "vitest";
import { draggedBy, draggedTo, editorReducer, emptyEditor, newObject, placeableKind, type EditorAction, type EditorState, type Placeable } from "../../src/editor";
import { BAT_SWOOP, DEFAULT_SCALE } from "../../src/coords";
import type { LevelObject } from "../../src/objects";
import { enemyObject, obstacleObject } from "../helpers";

const box = (x: number): LevelObject => newObject("basic", [x, 0, 0]);

function withObjects(objects: LevelObject[]): EditorState {
  return editorReducer(emptyEditor, { type: "load", objects });
}

describe("placeableKind", () => {
  test("sorts a thing to place into its palette kind", () => {
    // the spawn, the end, a box or an enemy
    expect(["spawn", "end", "basic", "tnt", "crab", "walking_spider"].map((what) => placeableKind(what as Placeable)))
      .toEqual(["spawn", "end", "box", "box", "enemy", "enemy"]);
  });
});

describe("newObject", () => {
  test.each([
    ["life", { kind: "box", box: "life" }],
    ["spawn", { kind: "spawn" }],
  ] as const)("a new %s stands where it's put", (what, kind) => {
    expect(newObject(what, [1, 2, 3])).toEqual({ ...kind, at: [1, 2, 3], raise: 0, stack: 1 });
  });

  test("a new end pad starts raised 128 game units, at the level's scale, so its base shows over the floor", () => {
    expect(newObject("end", [1, 2, 3], 400)).toEqual({ kind: "end", at: [1, 2, 3], raise: 128 / 400, stack: 1 });
    expect(newObject("end", [1, 2, 3], 2000).raise).toBeCloseTo(128 / 2000);
  });
});

describe("obstacles", () => {
  test("an obstacle is placed under its own kind", () => {
    expect(["lily_pad", "leaf"].map((what) => placeableKind(what as Placeable))).toEqual(["obstacle", "obstacle"]);
  });

  test.each(["lily_pad", "leaf", "wooden_peg", "rolling_stone", "mossy_slide"] as const)("a new %s is where it's put", (obstacle) => {
    expect(newObject(obstacle, [1, 2, 3])).toEqual(obstacleObject(obstacle, { at: [1, 2, 3] }));
  });
});

describe("new enemies", () => {
  test.each(["plant", "crab", "turtle"] as const)("a new %s stands where it's put", (enemy) => {
    expect(newObject(enemy, [1, 2, 3])).toEqual(enemyObject(enemy, { at: [1, 2, 3] }));
  });

  test("a new bat roost starts raised so its bats' swoop stays above the floor", () => {
    // its lowest point 600 game units over the floor, at the level's scale
    const lowest = -Math.min(...BAT_SWOOP.map(([, up]) => up));
    expect(newObject("bat", [1, 2, 3], 400)).toEqual({ kind: "enemy", enemy: "bat", at: [1, 2, 3], raise: (lowest + 600) / 400, stack: 1 });
    expect(newObject("bat", [1, 2, 3], 2000).raise).toBeCloseTo((lowest + 600) / 2000);
    expect(newObject("bat", [1, 2, 3]).raise).toBeCloseTo((lowest + 600) / DEFAULT_SCALE);
  });

  test("new leader bats start raised to where crash can spin their first leader", () => {
    // 600 game units over the floor, at the level's scale, where its bats fly at him
    expect(newObject("leader_bats", [1, 2, 3], 400).raise).toBeCloseTo(600 / 400);
    expect(newObject("leader_bats", [1, 2, 3], 2000).raise).toBeCloseTo(600 / 2000);
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

  test("a drag undoes as one change", () => {
    // a checkpoint, then moves that aren't recorded
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

  test("undoing an add lets go of the added object", () => {
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

  test("no node is selected on opening or after selecting an object", () => {
    expect(withObjects([crab]).selectedNode).toBeNull();
    const nodeSelected = editorReducer(withCrabSelected(), { type: "selectNode", index: 1, node: 2 });
    expect(editorReducer(nodeSelected, { type: "select", index: 1 }).selectedNode).toBeNull();
    expect(editorReducer(nodeSelected, { type: "select", index: null }).selectedNode).toBeNull();
  });

  test("removing the enemy lets go of its node", () => {
    const nodeSelected = editorReducer(withCrabSelected(), { type: "selectNode", index: 1, node: 2 });
    expect(editorReducer(nodeSelected, { type: "remove", index: 1 }).selectedNode).toBeNull();
  });

  const threeNodes: LevelObject["path"] = [[0, 0, 0], [1, 0, 0], [2, 0, 0]];

  test("undoing keeps a selected node the path still has", () => {
    const withPath = editorReducer(withCrabSelected(), { type: "update", index: 1, changes: { path: threeNodes } });
    const secondSelected = editorReducer(withPath, { type: "selectNode", index: 1, node: 1 });
    const shortened = editorReducer(secondSelected, { type: "update", index: 1, changes: { path: threeNodes.slice(0, 2) } });
    expect(editorReducer(shortened, { type: "undo" }).selectedNode).toBe(1);
  });

  test("undoing lets go of a selected node the path no longer has", () => {
    const twoNodes = editorReducer(withObjects([box(1), { ...crab, path: threeNodes.slice(0, 2) }]), { type: "update", index: 1, changes: { path: threeNodes } });
    const thirdSelected = editorReducer(twoNodes, { type: "selectNode", index: 1, node: 2 });
    expect(editorReducer(thirdSelected, { type: "undo" }).selectedNode).toBeNull();
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

  test("an object moves by how far the pointer has moved since the drag began", () => {
    expect(draggedBy(crab, null, [5, 5, 0], [6, 7, 0.5], 0, 400)).toEqual({ at: [2, 4, 3.5] });
  });

  test("an object doesn't jump to the pointer when a drag starts", () => {
    expect(draggedBy(crab, null, [9, 9, 1], [9, 9, 1], 0, 400)).toEqual({ at: [1, 2, 3] });
  });

  test("a path's node moves by how far the pointer has moved since the drag began", () => {
    const changes = draggedBy({ ...crab, path: [[0, 0, 0], [1, 0, 0]] }, 1, [10, 10, 0], [11, 12, 0], 0, 400);
    expect(changes).toEqual({ path: [[0, 0, 0], [2, 2, 0]] });
  });

  test("a node dragged in steps ends where it was last dragged to", () => {
    let state = withObjects([{ ...crab, path: [[0, 0, 0], [1, 0, 0]] }]);
    for (const x of [2, 3, 4]) {
      state = editorReducer(state, { type: "update", index: 0, changes: draggedTo(state.objects[0], 1, [x, 2, 3], 0, 400), record: false });
    }
    expect(state.objects[0].path).toEqual([[0, 0, 0], [3, 0, 0]]);
  });
});

describe("sliding a path's node count down", () => {
  test("lets go of a selected node the path no longer has, before the slide is recorded", () => {
    const path: LevelObject["path"] = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]];
    let state = editorReducer(withObjects([{ ...newObject("turtle", [0, 0, 0]), path }]), { type: "selectNode", index: 0, node: 3 });
    state = editorReducer(state, { type: "checkpoint" });
    state = editorReducer(state, { type: "update", index: 0, changes: { path: path.slice(0, 3) }, record: false });
    expect(state.selectedNode).toBeNull();
  });

  test("keeps a selected node the path still has", () => {
    const path: LevelObject["path"] = [[0, 0, 0], [1, 0, 0], [2, 0, 0]];
    let state = editorReducer(withObjects([{ ...newObject("turtle", [0, 0, 0]), path }]), { type: "selectNode", index: 0, node: 1 });
    state = editorReducer(state, { type: "update", index: 0, changes: { path: path.slice(0, 2) }, record: false });
    expect(state.selectedNode).toBe(1);
  });
});
