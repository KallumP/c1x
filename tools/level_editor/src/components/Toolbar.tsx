import type { LevelInfo } from "../api";
import type { EditorAction, EditorState } from "../editor";
import type { LevelActions } from "../hooks/useLevelActions";
import { saveButtonText } from "../hooks/useSave";
import LevelPicker from "./LevelPicker";

interface ToolbarProps {
  levels: LevelInfo[];
  level: LevelInfo | null;
  onOpen: (name: string) => void;
  state: EditorState;
  dispatch: (action: EditorAction) => void;
  unsaved: boolean;
  isSaving: boolean;
  onSave: () => void;
  onShare: () => void;
  levelActions: LevelActions;
}

const BUILD_TITLE = "Build this level, saving first (Ctrl+Shift+B)";
const BOOT_TITLE =
  "Build this level, then set it as the level CUSTOM LEVEL on the game's title screen starts (F5)";

function saveButtonClass(unsaved: boolean) {
  if (unsaved) {
    return "save unsaved";
  }
  return "save";
}

// the level picker, undo and redo, save, share, and build and boot, along the top
export default function Toolbar(props: ToolbarProps) {
  const { level, state, dispatch, unsaved, isSaving, levelActions } = props;

  const renderHistoryButtons = () => (
    <>
      <button
        disabled={state.past.length === 0}
        onClick={() => dispatch({ type: "undo" })}
        title="Undo (Ctrl+Z)"
      >
        Undo
      </button>
      <button
        disabled={state.future.length === 0}
        onClick={() => dispatch({ type: "redo" })}
        title="Redo (Ctrl+Y)"
      >
        Redo
      </button>
    </>
  );

  const renderSaveButton = () => (
    <button
      className={saveButtonClass(unsaved)}
      disabled={!unsaved || isSaving}
      onClick={props.onSave}
      title="Save (Ctrl+S)"
    >
      {saveButtonText(isSaving, unsaved)}
    </button>
  );

  const renderShareButton = () => (
    <button
      disabled={!level}
      onClick={props.onShare}
      title="Upload this level to mod.io, for others to play"
    >
      Share
    </button>
  );

  // build and boot, on the right
  const renderLevelActions = () => {
    const { isBusy, status, build, buildAndBoot } = levelActions;
    const isStatusShown = status && !status.failed;
    return (
      <div className="level-actions">
        {isStatusShown && <span className="status" title={status.detail}>{status.text}</span>}
        <button disabled={!level || isBusy} onClick={build} title={BUILD_TITLE}>
          Build
        </button>
        <button disabled={!level || isBusy} onClick={buildAndBoot} title={BOOT_TITLE}>
          Build + boot
        </button>
      </div>
    );
  };

  return (
    <header className="toolbar">
      <LevelPicker levels={props.levels} level={level} onOpen={props.onOpen} />
      {renderHistoryButtons()}
      {renderSaveButton()}
      {renderShareButton()}
      {renderLevelActions()}
      {(isSaving || levelActions.isBusy) && (
        <div className="progress" role="progressbar" aria-label="Working" />
      )}
    </header>
  );
}
