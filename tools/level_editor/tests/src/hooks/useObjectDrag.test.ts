import { describe, expect, test } from "vitest";
import {
  emptyEditor,
  newObject,
  type EditorAction,
  type EditorState,
} from "../../../src/editor";
import { objectDragChanges, objectDragHandlers } from "../../../src/hooks/useObjectDrag";
import type { LevelFrame } from "../../../src/levelFrame";
import type { LevelObject } from "../../../src/objects";
import type { Triangle } from "../../../src/overlaps";
import { enemyObject } from "../../helpers";

const crab = enemyObject("crab", { path: [[0, 0, 0], [2, 0, 0]] });
const objects = [newObject("basic", [0, 0, 0]), newObject("basic", [1, 2, 3]), crab];
const FRAME: LevelFrame = { grid: 0, turn: 0, scale: 400, triangles: [] };

const noDrag = () => ({ current: null as LevelObject | null });

// the drag's handlers with the editor's objects as given, keeping what they dispatch
function dragWith(state: EditorState, dragged = noDrag()) {
  const dispatched: EditorAction[] = [];
  const dispatch = (action: EditorAction) => dispatched.push(action);
  const handlers = objectDragHandlers({ state, dispatch, dragged, frame: FRAME });
  return { handlers, dispatched, dragged };
}

const editorWith = (levelObjects: LevelObject[]): EditorState =>
  ({ ...emptyEditor, objects: levelObjects });

describe("dragging an object across the floor", () => {
  test("grabbing an object selects it", () => {
    const { handlers, dispatched } = dragWith(editorWith(objects));
    handlers.grab({ index: 1, node: null });
    expect(dispatched).toEqual([{ type: "select", index: 1 }]);
  });

  test("grabbing a path node selects that node", () => {
    const { handlers, dispatched } = dragWith(editorWith(objects));
    handlers.grab({ index: 2, node: 1 });
    expect(dispatched).toEqual([{ type: "selectNode", index: 2, node: 1 }]);
  });

  test("starting to move makes the drag one change to undo", () => {
    const { handlers, dispatched } = dragWith(editorWith(objects));
    handlers.begin();
    expect(dispatched).toEqual([{ type: "checkpoint" }]);
  });

  test("each move is measured from where the object was when grabbed, unrecorded", () => {
    const grabbing = dragWith(editorWith(objects));
    grabbing.handlers.grab({ index: 1, node: null });
    // drawn again with the object already moved, the drag carrying on
    const movedBox = { ...objects[1], at: [2, 2, 3] as LevelObject["at"] };
    const moving = dragWith(editorWith([objects[0], movedBox, crab]), grabbing.dragged);
    moving.handlers.move({ index: 1, node: null }, [0, 0, 0], [2, 0, 0]);
    const update = { type: "update", index: 1, changes: { at: [3, 2, 3] }, record: false };
    expect(moving.dispatched.at(-1)).toEqual(update);
  });
});

describe("objectDragChanges", () => {
  // a flat floor 0.5 up, under everything near the origin
  const FLOOR: Triangle[] = [
    [[-5, -5, 0.5], [5, -5, 0.5], [5, 5, 0.5]],
    [[-5, -5, 0.5], [5, 5, 0.5], [-5, 5, 0.5]],
  ];

  test("an end pad dragged across the floor is raised over it", () => {
    const pad = newObject("end", [0, 0, 0]);
    const frame = { ...FRAME, triangles: FLOOR };
    const changes = objectDragChanges(pad, null, [0, 0, 0], [1, 0, 0.5], frame);
    expect(changes.raise).toBeCloseTo(128 / 400, 2);
  });
});
