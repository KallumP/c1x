import type { EditorAction, EditorState } from "../editor";
import { useShortcuts, type Shortcuts } from "./useShortcuts";

interface EditorShortcutActions {
  stopPlacing: () => void;
  save: () => void;
  build: () => void;
  buildAndBoot: () => void;
}

// the editor's keys: delete, escape, undo, redo, save, build, and build and boot
export function editorShortcuts(state: EditorState, dispatch: (action: EditorAction) => void, actions: EditorShortcutActions): Shortcuts {
  const removeSelected = () => {
    if (state.selected !== null) {
      dispatch({ type: "remove", index: state.selected });
    }
  };
  const undo = () => dispatch({ type: "undo" });
  const redo = () => dispatch({ type: "redo" });
  return {
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
    "ctrl+shift+b": actions.build,
    F5: actions.buildAndBoot, // instead of reloading the page
  };
}

export function useEditorShortcuts(state: EditorState, dispatch: (action: EditorAction) => void, actions: EditorShortcutActions) {
  useShortcuts(editorShortcuts(state, dispatch, actions));
}
