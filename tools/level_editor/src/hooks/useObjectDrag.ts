import { useRef, type RefObject } from "react";
import type { Orbit } from "../components/Scene";
import { draggedBy, type EditorAction, type EditorState } from "../editor";
import { withEndPadRaise } from "../endPad";
import type { LevelFrame } from "../levelFrame";
import type { LevelObject, Vec3 } from "../objects";
import { useDrag, type DragHandlers } from "./useDrag";

// the change dragging object (as it was when grabbed), or a node of its path,
// across the floor from from to to makes; an end pad stays raised over the floor
export function objectDragChanges(
  object: LevelObject,
  node: number | null,
  from: Vec3,
  to: Vec3,
  frame: LevelFrame,
): Partial<LevelObject> {
  const { turn, scale, triangles } = frame;
  const moved = draggedBy(object, node, from, to, turn, scale);
  return withEndPadRaise(object, moved, scale, triangles);
}

export interface ObjectDragParts {
  state: EditorState;
  dispatch: (action: EditorAction) => void;
  dragged: { current: LevelObject | null }; // the object being dragged, as it was when grabbed
  frame: LevelFrame;
}

// grabbing an object or path node selects it; the whole drag is one change to undo
export function objectDragHandlers(parts: ObjectDragParts): DragHandlers {
  const { state, dispatch, dragged, frame } = parts;
  return {
    grab: ({ index, node }) => {
      dragged.current = state.objects[index];
      if (node === null) {
        dispatch({ type: "select", index });
      } else {
        dispatch({ type: "selectNode", index, node });
      }
    },
    begin: () => dispatch({ type: "checkpoint" }),
    move: ({ index, node }, from, to) => {
      const object = dragged.current ?? state.objects[index];
      const changes = objectDragChanges(object, node, from, to, frame);
      dispatch({ type: "update", index, changes, record: false });
    },
  };
}

export function useObjectDrag(
  orbitRef: RefObject<Orbit>,
  state: EditorState,
  dispatch: (action: EditorAction) => void,
  frame: LevelFrame,
) {
  const dragged = useRef<LevelObject | null>(null);
  return useDrag(orbitRef, frame.grid, objectDragHandlers({ state, dispatch, dragged, frame }));
}
