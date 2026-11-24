import { useRef, type RefObject } from "react";
import { axisDragChanges, type AxisGrab, type DragSettings } from "../axisDrag";
import type { AxisDragHandlers } from "../components/AxisHandles";
import type { Orbit } from "../components/Scene";
import type { EditorAction, EditorState } from "../editor";

// the object (or node of its path) an axis arrow's dragging, as it was when grabbed, and whether it's moved yet
export interface AxisDragging extends AxisGrab {
  index: number;
  hasMoved: boolean;
}

export interface AxisDragParts {
  state: EditorState;
  dispatch: (action: EditorAction) => void;
  dragging: { current: AxisDragging | null };
  setOrbiting: (isOn: boolean) => void;
  settings: DragSettings;
}

// dragging the selected object, or its selected path node, by an axis arrow
export function axisDragHandlers(parts: AxisDragParts): AxisDragHandlers {
  const { state, dispatch, dragging, setOrbiting, settings } = parts;
  return {
    onGrab: () => {
      if (state.selected === null) {
        return;
      }
      setOrbiting(false);
      const object = state.objects[state.selected];
      dragging.current = { index: state.selected, node: state.selectedNode, object, hasMoved: false };
    },
    onMove: (axis, metres) => {
      const grabbed = dragging.current;
      if (!grabbed) {
        return;
      }
      if (!grabbed.hasMoved) {
        dispatch({ type: "checkpoint" }); // the whole drag is one change to undo
        grabbed.hasMoved = true;
      }
      const changes = axisDragChanges(grabbed, axis, metres, settings);
      dispatch({ type: "update", index: grabbed.index, changes, record: false });
    },
    onRelease: () => {
      setOrbiting(true);
      dragging.current = null;
    },
  };
}

export function useAxisDrag(
  orbitRef: RefObject<Orbit>,
  state: EditorState,
  dispatch: (action: EditorAction) => void,
  settings: DragSettings,
): AxisDragHandlers {
  const dragging = useRef<AxisDragging | null>(null);
  const setOrbiting = (isOn: boolean) => {
    if (orbitRef.current) {
      orbitRef.current.enabled = isOn;
    }
  };
  return axisDragHandlers({ state, dispatch, dragging, setOrbiting, settings });
}
