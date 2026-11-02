import { useCallback, useRef, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { LevelInfo } from "./api";
import LevelMesh from "./components/LevelMesh";
import LevelPicker from "./components/LevelPicker";
import ObjectMarkers from "./components/ObjectMarkers";
import Palette from "./components/Palette";
import PropertiesPanel from "./components/PropertiesPanel";
import Scene, { type Orbit } from "./components/Scene";
import { DEFAULT_SCALE } from "./coords";
import { newObject, type Tool } from "./editor";
import { useDrag } from "./hooks/useDrag";
import { useEditor } from "./hooks/useEditor";
import { useLevelGroup } from "./hooks/useLevelGroup";
import { useLevels } from "./hooks/useLevels";
import { useEditorShortcuts } from "./hooks/useEditorShortcuts";
import { confirmDiscard, useUnsavedWarning } from "./hooks/useUnsavedWarning";
import { useTriangles, useWarnings } from "./hooks/useWarnings";
import { clickedFloor, isClick } from "./three/clicks";

const SELECT: Tool = { kind: "select" };

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const showError = useCallback((message: string) => setError(message), []);
  const { levels, level, open } = useLevels(showError);
  const group = useLevelGroup(level, showError);
  const { state, dispatch, unsaved, save } = useEditor(level, showError);
  const scale = level ? level.scale : DEFAULT_SCALE;
  const triangles = useTriangles(group);
  const warnings = useWarnings(state.objects, scale, triangles);
  const [tool, setTool] = useState<Tool>(SELECT);
  const [grid, setGrid] = useState(0.5);
  const orbitRef = useRef<Orbit>(null);
  const drag = useDrag(orbitRef, grid, {
    grab: (index) => dispatch({ type: "select", index }),
    begin: () => dispatch({ type: "checkpoint" }),
    move: (index, at) => dispatch({ type: "update", index, changes: { at }, record: false }),
  });
  useUnsavedWarning(unsaved);

  useEditorShortcuts(state, dispatch, { stopPlacing: () => setTool(SELECT), save });

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

  const renderSaveButton = () => (
    <button className={unsaved ? "save unsaved" : "save"} disabled={!unsaved} onClick={save} title="Ctrl+S">
      {unsaved ? "Save objects.json" : "Saved"}
    </button>
  );

  const renderHeader = () => (
    <header className="toolbar">
      <LevelPicker levels={levels} level={level} onOpen={openLevel} />
      {renderHistoryButtons()}
      {renderSaveButton()}
      {renderWarningCount()}
      {error && <span className="error">{error}</span>}
    </header>
  );

  const renderLevel = (shownLevel: LevelInfo) => (
    <>
      {group && <LevelMesh group={group} onClick={clickLevel} onPointerMove={drag.moveOverLevel} />}
      <ObjectMarkers
        objects={state.objects}
        scale={shownLevel.scale}
        selected={state.selected}
        warnings={warnings}
        onSelect={drag.start}
      />
    </>
  );

  const renderMain = () => (
    <main className="viewport">
      <Scene orbitRef={orbitRef} onMiss={() => dispatch({ type: "select", index: null })}>
        {level && renderLevel(level)}
      </Scene>
    </main>
  );

  return (
    <div className="app">
      {renderHeader()}
      <Palette tool={tool} onTool={setTool} grid={grid} onGrid={setGrid} />
      {renderMain()}
      <PropertiesPanel state={state} warnings={warnings} scale={scale} triangles={triangles} dispatch={dispatch} />
    </div>
  );
}
