import { useCallback, useMemo, useRef, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import LevelMesh from "./components/LevelMesh";
import LevelPicker from "./components/LevelPicker";
import ObjectMarkers from "./components/ObjectMarkers";
import Palette from "./components/Palette";
import PropertiesPanel from "./components/PropertiesPanel";
import Scene, { type Orbit } from "./components/Scene";
import { draggedBy, newObject, type Tool } from "./editor";
import { raisedEndPad, withEndPadRaise } from "./endPad";
import type { LevelObject } from "./objects";
import { useDrag } from "./hooks/useDrag";
import { useEditor } from "./hooks/useEditor";
import { useLevelActions } from "./hooks/useLevelActions";
import { useLevelCfg } from "./hooks/useLevelCfg";
import { useLevelGroup } from "./hooks/useLevelGroup";
import { useLevelSongs } from "./hooks/useLevelSongs";
import { useLevels } from "./hooks/useLevels";
import { useEditorShortcuts } from "./hooks/useEditorShortcuts";
import { confirmDiscard, useUnsavedWarning } from "./hooks/useUnsavedWarning";
import { useOutlineWarnings, usePathWarnings, useTriangles, useWarnings } from "./hooks/useWarnings";
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
  const songs = useLevelSongs(level);
  const scale = levelCfg.cfg.scale; // as it's edited, so boxes follow it before it's saved
  const unsaved = editor.unsaved || levelCfg.unsaved;
  const triangles = useTriangles(group);
  const warnings = useWarnings(state.objects, scale, triangles);
  const pathWarnings = usePathWarnings(state.objects, levelCfg.cfg.turn, scale, triangles);
  const outlineWarnings = useOutlineWarnings(state.objects);
  const boxWarnings = useMemo(() => new Set([...warnings, ...outlineWarnings]), [warnings, outlineWarnings]);
  const [tool, setTool] = useState<Tool>(SELECT);
  const [grid, setGrid] = useState(0);
  const orbitRef = useRef<Orbit>(null);
  const turn = levelCfg.cfg.turn;
  const dragged = useRef<LevelObject | null>(null); // the object being dragged, as it was when grabbed
  const drag = useDrag(orbitRef, grid, {
    grab: ({ index, node }) => {
      dragged.current = state.objects[index];
      dispatch(node === null ? { type: "select", index } : { type: "selectNode", index, node });
    },
    begin: () => dispatch({ type: "checkpoint" }),
    move: ({ index, node }, from, to) => {
      const object = dragged.current ?? state.objects[index];
      const changes = withEndPadRaise(object, draggedBy(object, node, from, to, turn, scale), scale, triangles);
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

  useEditorShortcuts(state, dispatch, { stopPlacing: () => setTool(SELECT), save, build: levelActions.build, buildAndBoot: levelActions.buildAndBoot });

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
      dispatch({ type: "add", object: raisedEndPad(newObject(tool.what, at, scale), scale, triangles) });
    }
  };

  const renderPathWarningCount = () => {
    if (pathWarnings.size === 0) {
      return null;
    }
    const paths = pathWarnings.size === 1 ? "path leaves" : "paths leave";
    return <span className="warning">{pathWarnings.size} {paths} the floor or run{pathWarnings.size === 1 ? "s" : ""} through a wall</span>;
  };

  const renderOutlineWarningCount = () => {
    if (outlineWarnings.size === 0) {
      return null;
    }
    if (outlineWarnings.size === 1) {
      return <span className="warning">1 outline's switch isn't in the level</span>;
    }
    return <span className="warning">{outlineWarnings.size} outlines' switches aren't in the level</span>;
  };

  const renderHistoryButtons = () => (
    <>
      <button disabled={state.past.length === 0} onClick={() => dispatch({ type: "undo" })} title="Undo (Ctrl+Z)">Undo</button>
      <button disabled={state.future.length === 0} onClick={() => dispatch({ type: "redo" })} title="Redo (Ctrl+Y)">Redo</button>
    </>
  );

  const saveButtonText = () => {
    if (isSaving) {
      return "Saving...";
    }
    return unsaved ? "Save" : "Saved";
  };

  const renderSaveButton = () => (
    <button className={unsaved ? "save unsaved" : "save"} disabled={!unsaved || isSaving} onClick={save} title="Save (Ctrl+S)">
      {saveButtonText()}
    </button>
  );

  // build and boot, on the right
  const renderLevelActions = () => {
    const { isBusy, status, build, buildAndBoot } = levelActions;
    return (
      <div className="level-actions">
        {status && (
          <span className={status.failed ? "status error" : "status"} title={status.detail}>{status.text}</span>
        )}
        <button disabled={!level || isBusy} onClick={build} title="Build this level, saving first (Ctrl+Shift+B)">
          Build
        </button>
        <button disabled={!level || isBusy} onClick={buildAndBoot} title="Build this level, then set the game to boot into it (F5)">
          Build + boot
        </button>
      </div>
    );
  };

  const renderHeader = () => (
    <header className="toolbar">
      <LevelPicker levels={levels} level={level} onOpen={openLevel} />
      {renderHistoryButtons()}
      {renderSaveButton()}
      {renderPathWarningCount()}
      {renderOutlineWarningCount()}
      {error && <span className="error">{error}</span>}
      {renderLevelActions()}
      {(isSaving || levelActions.isBusy) && <div className="progress" role="progressbar" aria-label="Working" />}
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
        warnings={boxWarnings}
        pathWarnings={pathWarnings}
        triangles={triangles}
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
        pathWarnings={pathWarnings}
        outlineWarnings={outlineWarnings}
        scale={scale}
        triangles={triangles}
        dispatch={dispatch}
        levelCfg={level ? levelCfg.cfg : null}
        songs={songs}
        onLevelCfg={levelCfg.change}
      />
    </div>
  );
}
