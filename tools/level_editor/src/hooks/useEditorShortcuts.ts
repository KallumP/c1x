import type { EditorAction, EditorState } from "../editor";
import { useShortcuts } from "./useShortcuts";

// the editor's keys: delete, escape, undo, redo, save, and build and boot
export function useEditorShortcuts(state: EditorState, dispatch: (action: EditorAction) => void, actions: {
  stopPlacing: () => void;
  save: () => void;
  buildAndBoot: () => void;
}) {
  // the selected waypoint, if there is one, or else the selected object
  const removeSelected = () => {
    if (state.waypoint !== null) {
      dispatch({ type: "removeWaypoint" });
    } else if (state.selected !== null) {
      dispatch({ type: "remove", index: state.selected });
    }
  };
  const undo = () => dispatch({ type: "undo" });
  const redo = () => dispatch({ type: "redo" });
  useShortcuts({
    Delete: removeSelected,
    Backspace: removeSelected,
    Escape: () => {
      actions.stopPlacing();
      dispatch({ type: "select", index: null });
    },
    "ctrl+z": undo,
    "ctrl+y": redo,
    "ctrl+shift+z": redo,
    "ctrl+s": actions.save,
    F5: actions.buildAndBoot, // instead of reloading the page
  });
}
