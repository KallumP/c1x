import { useCallback, useMemo, useState } from "react";
import LevelView from "./components/LevelView";
import MessageStrip from "./components/MessageStrip";
import Palette from "./components/Palette";
import PropertiesPanel from "./components/PropertiesPanel";
import ShareDialog from "./components/ShareDialog";
import Toolbar from "./components/Toolbar";
import { levelTurn } from "./camera";
import type { Tool } from "./editor";
import { useEditor } from "./hooks/useEditor";
import { useEditorShortcuts } from "./hooks/useEditorShortcuts";
import { useLevelActions } from "./hooks/useLevelActions";
import { useLevelCfg } from "./hooks/useLevelCfg";
import { useLevelGroup } from "./hooks/useLevelGroup";
import { useLevelSongs } from "./hooks/useLevelSongs";
import { useLevels } from "./hooks/useLevels";
import { useSave } from "./hooks/useSave";
import { confirmDiscard, useUnsavedWarning } from "./hooks/useUnsavedWarning";
import {
  useOutlineWarnings,
  usePathWarnings,
  useTriangles,
  useWarnings,
} from "./hooks/useWarnings";
import "./App.css";

const SELECT: Tool = { kind: "select" };

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const showError = useCallback((message: string) => setError(message), []);
  const { levels, level, open } = useLevels(showError);
  const group = useLevelGroup(level, showError);
  const editor = useEditor(level, showError);
  const { state, dispatch } = editor;
  const levelCfg = useLevelCfg(level, showError);
  const songs = useLevelSongs(level);
  const scale = levelCfg.cfg.scale; // as it's edited, so boxes follow it before it's saved
  const unsaved = editor.unsaved || levelCfg.unsaved;
  // how far the objects are turned, as the build turns them
  const turn = levelTurn(levelCfg.cfg.turn, levelCfg.cfg.camera);
  const triangles = useTriangles(group);
  const warnings = useWarnings(state.objects, scale, triangles);
  const pathWarnings = usePathWarnings(state.objects, turn, scale, triangles);
  const outlineWarnings = useOutlineWarnings(state.objects);
  const boxWarnings = useMemo(
    () => new Set([...warnings, ...outlineWarnings]),
    [warnings, outlineWarnings],
  );
  const [tool, setTool] = useState<Tool>(SELECT);
  const [grid, setGrid] = useState(0);
  const { save, isSaving } = useSave(editor, levelCfg);

  const [isSharing, setIsSharing] = useState(false);

  useUnsavedWarning(unsaved);
  const levelActions = useLevelActions(level, unsaved, save);

  useEditorShortcuts(state, dispatch, {
    stopPlacing: () => setTool(SELECT),
    save,
    build: levelActions.build,
    buildAndBoot: levelActions.buildAndBoot,
  });

  const openLevel = (name: string) => {
    if (!confirmDiscard(unsaved)) {
      return;
    }
    setError(null);
    open(name);
  };

  return (
    <div className="app">
      <Toolbar
        levels={levels}
        level={level}
        onOpen={openLevel}
        state={state}
        dispatch={dispatch}
        unsaved={unsaved}
        isSaving={isSaving}
        onSave={save}
        onShare={() => setIsSharing(true)}
        levelActions={levelActions}
      />
      <MessageStrip
        error={error}
        status={levelActions.status}
        warnings={levelActions.warnings}
      />
      <Palette tool={tool} onTool={setTool} grid={grid} onGrid={setGrid} />
      <LevelView
        isLevelOpen={level !== null}
        group={group}
        isReady={editor.isLoaded && levelCfg.isLoaded}
        state={state}
        dispatch={dispatch}
        tool={tool}
        frame={{ grid, turn, scale, triangles }}
        boxWarnings={boxWarnings}
        pathWarnings={pathWarnings}
      />
      <PropertiesPanel
        state={state}
        warnings={warnings}
        pathWarnings={pathWarnings}
        outlineWarnings={outlineWarnings}
        scale={scale}
        triangles={triangles}
        dispatch={dispatch}
        levelCfg={level && levelCfg.cfg}
        levelName={level?.name ?? ""}
        songs={songs}
        onLevelCfg={levelCfg.change}
      />
      {isSharing && level && (
        <ShareDialog
          level={level}
          title={levelCfg.cfg.title}
          save={save}
          onClose={() => setIsSharing(false)}
        />
      )}
    </div>
  );
}
