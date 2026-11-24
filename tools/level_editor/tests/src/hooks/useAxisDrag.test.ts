import { describe, expect, test } from "vitest";
import type { DragSettings } from "../../../src/axisDrag";
import {
  emptyEditor,
  newObject,
  type EditorAction,
  type EditorState,
} from "../../../src/editor";
import { axisDragHandlers, type AxisDragging } from "../../../src/hooks/useAxisDrag";
import { enemyObject } from "../../helpers";

const SETTINGS: DragSettings = { grid: 0, turn: 0, scale: 400, triangles: [] };
const crab = enemyObject("crab", { path: [[0, 0, 0], [2, 0, 0]] });
const objects = [newObject("basic", [0, 0, 0]), newObject("basic", [1, 2, 3]), crab];

// the drag's handlers with the editor at state, keeping what they dispatch
// and whether the camera orbits
function dragWith(state: EditorState) {
  const dispatched: EditorAction[] = [];
  const orbiting = { isOn: true };
  const handlers = axisDragHandlers({
    state,
    dispatch: (action) => dispatched.push(action),
    dragging: { current: null as AxisDragging | null },
    setOrbiting: (isOn) => {
      orbiting.isOn = isOn;
    },
    settings: SETTINGS,
  });
  return { handlers, dispatched, orbiting };
}

function selecting(selected: number | null, node: number | null = null): EditorState {
  return { ...emptyEditor, objects, selected, selectedNode: node };
}

describe("dragging an axis arrow", () => {
  test("with nothing selected, it doesn't move anything", () => {
    const { handlers, dispatched } = dragWith(selecting(null));
    handlers.onGrab();
    handlers.onMove("x", 1);
    expect(dispatched).toEqual([]);
  });

  test("grabbing an arrow stops the camera orbiting", () => {
    const { handlers, orbiting } = dragWith(selecting(1));
    handlers.onGrab();
    expect(orbiting.isOn).toBe(false);
  });

  test("the whole drag is one change to undo", () => {
    const { handlers, dispatched } = dragWith(selecting(1));
    handlers.onGrab();
    handlers.onMove("x", 1);
    handlers.onMove("x", 2);
    expect(dispatched.filter((action) => action.type === "checkpoint")).toHaveLength(1);
  });

  test("each move is measured from where the object was when grabbed, unrecorded", () => {
    const { handlers, dispatched } = dragWith(selecting(1));
    handlers.onGrab();
    handlers.onMove("x", 1);
    handlers.onMove("x", 2);
    const update = { type: "update", index: 1, changes: { at: [3, 2, 3] }, record: false };
    expect(dispatched.at(-1)).toEqual(update);
  });

  test("with a path node selected, it moves that node", () => {
    const { handlers, dispatched } = dragWith(selecting(2, 1));
    handlers.onGrab();
    handlers.onMove("y", 1);
    const changes = { path: [[0, 0, 0], [2, 1, 0]] };
    const update = { type: "update", index: 2, changes, record: false };
    expect(dispatched.at(-1)).toEqual(update);
  });

  test("letting go turns orbiting back on", () => {
    const { handlers, orbiting } = dragWith(selecting(1));
    handlers.onGrab();
    handlers.onRelease();
    expect(orbiting.isOn).toBe(true);
  });

  test("after letting go, moving doesn't move anything", () => {
    const { handlers, dispatched } = dragWith(selecting(1));
    handlers.onGrab();
    handlers.onRelease();
    handlers.onMove("x", 1);
    expect(dispatched).toEqual([]);
  });
});
