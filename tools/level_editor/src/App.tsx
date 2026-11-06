import { useCallback, useRef, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import LevelMesh from "./components/LevelMesh";
import LevelPicker from "./components/LevelPicker";
import ObjectMarkers from "./components/ObjectMarkers";
import Palette from "./components/Palette";
import PropertiesPanel from "./components/PropertiesPanel";
import Scene, { type Orbit } from "./components/Scene";
import { draggedTo, newObject, type Tool } from "./editor";
import { useDrag } from "./hooks/useDrag";
import { useEditor } from "./hooks/useEditor";
import { useLevelActions } from "./hooks/useLevelActions";
import { useLevelCfg } from "./hooks/useLevelCfg";
import { useLevelGroup } from "./hooks/useLevelGroup";
import { useLevels } from "./hooks/useLevels";
import { useEditorShortcuts } from "./hooks/useEditorShortcuts";
import { confirmDiscard, useUnsavedWarning } from "./hooks/useUnsavedWarning";
import { useTriangles, useWarnings } from "./hooks/useWarnings";
import { clickedFloor, isClick } from "./three/clicks";
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
  const scale = levelCfg.cfg.scale; // as it's edited, so boxes follow it before it's saved
  const unsaved = editor.unsaved || levelCfg.unsaved;
  const triangles = useTriangles(group);
  const warnings = useWarnings(state.objects, scale, triangles);
  const [tool, setTool] = useState<Tool>(SELECT);
  const [grid, setGrid] = useState(0.5);
  const orbitRef = useRef<Orbit>(null);
  const turn = levelCfg.cfg.turn;
  const drag = useDrag(orbitRef, grid, {
    grab: ({ index, node }) => dispatch(node === null ? { type: "select", index } : { type: "selectNode", index, node }),
    begin: () => dispatch({ type: "checkpoint" }),
    move: ({ index, node }, at) => {
      const changes = draggedTo(state.objects[index], node, at, turn, scale);
      dispatch({ type: "update", index, changes, record: false });
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  // saves the objects and level.cfg, whichever changed; whether they saved
  const save = async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      if (editor.unsaved && !(await editor.save())) {
        return false;
      }
      return !levelCfg.unsaved || (await levelCfg.save());
    } finally {
      setIsSaving(false);
    }
  };

  useUnsavedWarning(unsaved);
  const levelActions = useLevelActions(level, unsaved, save);

  useEditorShortcuts(state, dispatch, { stopPlacing: () => setTool(SELECT), save, buildAndBoot: levelActions.buildAndBoot });

  const openLevel = (name: string) => {
    if (!confirmDiscard(unsaved)) {
      return;
    }
    setError(null);
    open(name);
  };

  // a click on the map: with Select, clears the selection; placing, puts an object on the floor there
  const clickLevel = (event: ThreeEvent<MouseEvent>) => {
    if (!isClick(event)) {
      return;
    }
    event.stopPropagation();
    if (tool.kind === "select") {
      dispatch({ type: "select", index: null });
      return;
    }
    const at = clickedFloor(event, grid);
    if (at) {
      dispatch({ type: "add", object: newObject(tool.what, at) });
    }
  };

  const renderWarningCount = () => {
    if (warnings.size === 0) {
      return null;
    }
    const boxes = warnings.size === 1 ? "box is" : "boxes are";
    return <span className="warning">{warnings.size} {boxes} in a wall or another box</span>;
  };

  const renderHistoryButtons = () => (
    <>
      <button disabled={state.past.length === 0} onClick={() => dispatch({ type: "undo" })} title="Ctrl+Z">Undo</button>
      <button disabled={state.future.length === 0} onClick={() => dispatch({ type: "redo" })} title="Ctrl+Y">Redo</button>
    </>
  );

  const saveButtonText = () => {
    if (isSaving) {
      return "Saving...";
    }
    return unsaved ? "Save" : "Saved";
  };

  const renderSaveButton = () => (
    <button className={unsaved ? "save unsaved" : "save"} disabled={!unsaved || isSaving} onClick={save} title="Ctrl+S">
      {saveButtonText()}
    </button>
  );

  // build and boot, on the right
  const renderLevelActions = () => {
    const { isBusy, status, build, boot } = levelActions;
    return (
      <div className="level-actions">
        {status && (
          <span className={status.failed ? "status error" : "status"} title={status.detail}>{status.text}</span>
        )}
        <button disabled={!level || isBusy} onClick={build} title="Build this level (saves first). F5 builds and boots">
          Build
        </button>
        <button disabled={!level || isBusy} onClick={boot} title="Set boot_level in settings.cfg to this level">
          Boot
        </button>
      </div>
    );
  };

  const renderHeader = () => (
    <header className="toolbar">
      <LevelPicker levels={levels} level={level} onOpen={openLevel} />
      {renderHistoryButtons()}
      {renderSaveButton()}
      {renderWarningCount()}
      {error && <span className="error">{error}</span>}
      {renderLevelActions()}
    </header>
  );

  const renderLevel = () => (
    <>
      {group && <LevelMesh group={group} onClick={clickLevel} onPointerMove={drag.moveOverLevel} />}
      <ObjectMarkers
        objects={state.objects}
        scale={scale}
        turn={turn}
        selected={state.selected}
        selectedNode={state.selectedNode}
        warnings={warnings}
        onSelect={drag.start}
        onSelectNode={drag.startNode}
      />
    </>
  );

  const renderMain = () => (
    <main className="viewport">
      <Scene orbitRef={orbitRef} onMiss={() => dispatch({ type: "select", index: null })}>
        {level && renderLevel()}
      </Scene>
    </main>
  );

  return (
    <div className="app">
      {renderHeader()}
      <Palette tool={tool} onTool={setTool} grid={grid} onGrid={setGrid} />
      {renderMain()}
      <PropertiesPanel
        state={state}
        warnings={warnings}
        scale={scale}
        triangles={triangles}
        dispatch={dispatch}
        levelCfg={level ? levelCfg.cfg : null}
        onLevelCfg={levelCfg.change}
      />
    </div>
  );
}
