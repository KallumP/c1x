import { useCallback, useRef, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { LevelInfo } from "./api";
import LevelMesh from "./components/LevelMesh";
import LevelPicker from "./components/LevelPicker";
import ObjectMarkers from "./components/ObjectMarkers";
import Palette from "./components/Palette";
import PropertiesPanel from "./components/PropertiesPanel";
import Scene, { type Orbit } from "./components/Scene";
import { newObject, type Tool } from "./editor";
import { useDrag } from "./hooks/useDrag";
import { useEditor } from "./hooks/useEditor";
import { useLevelGroup } from "./hooks/useLevelGroup";
import { useLevels } from "./hooks/useLevels";
import { useShortcuts } from "./hooks/useShortcuts";
import { clickedFloor, isClick } from "./three/clicks";

const SELECT: Tool = { kind: "select" };

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const showError = useCallback((message: string) => setError(message), []);
  const { levels, level, open } = useLevels(showError);
  const group = useLevelGroup(level, showError);
  const { state, dispatch } = useEditor(level, showError);
  const [tool, setTool] = useState<Tool>(SELECT);
  const [grid, setGrid] = useState(0.5);
  const orbitRef = useRef<Orbit>(null);
  const drag = useDrag(
    orbitRef,
    grid,
    (index) => dispatch({ type: "select", index }),
    (index, at) => dispatch({ type: "update", index, changes: { at } }),
  );

  const removeSelected = () => {
    if (state.selected !== null) {
      dispatch({ type: "remove", index: state.selected });
    }
  };
  useShortcuts({
    Delete: removeSelected,
    Backspace: removeSelected,
    Escape: () => {
      setTool(SELECT);
      dispatch({ type: "select", index: null });
    },
  });

  const openLevel = (name: string) => {
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

  const renderHeader = () => (
    <header className="toolbar">
      <LevelPicker levels={levels} level={level} onOpen={openLevel} />
      {error && <span className="error">{error}</span>}
    </header>
  );

  const renderLevel = (shownLevel: LevelInfo) => (
    <>
      {group && <LevelMesh group={group} onClick={clickLevel} onPointerMove={drag.moveOverLevel} />}
      <ObjectMarkers objects={state.objects} scale={shownLevel.scale} selected={state.selected} onSelect={drag.start} />
    </>
  );

  const renderMain = () => (
    <main className="viewport">
      <Scene orbitRef={orbitRef}>{level && renderLevel(level)}</Scene>
    </main>
  );

  return (
    <div className="app">
      {renderHeader()}
      <Palette tool={tool} onTool={setTool} grid={grid} onGrid={setGrid} />
      {renderMain()}
      <PropertiesPanel state={state} dispatch={dispatch} />
    </div>
  );
}
