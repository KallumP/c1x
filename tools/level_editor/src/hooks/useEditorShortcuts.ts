import type { EditorAction, EditorState } from "../editor";
import { useShortcuts } from "./useShortcuts";

// the editor's keys: delete, escape, undo, redo and save
export function useEditorShortcuts(state: EditorState, dispatch: (action: EditorAction) => void, actions: {
  stopPlacing: () => void;
  save: () => void;
}) {
  const removeSelected = () => {
    if (state.selected !== null) {
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
  });
}
