import { useCallback, useMemo, useRef, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import AxisHandles from "./components/AxisHandles";
import LevelMesh from "./components/LevelMesh";
import LevelPicker from "./components/LevelPicker";
import ObjectMarkers from "./components/ObjectMarkers";
import Palette from "./components/Palette";
import PropertiesPanel from "./components/PropertiesPanel";
import Scene, { type Orbit } from "./components/Scene";
import { levelTurn } from "./camera";
import { movedAlong, movedNodeAlong, type Axis } from "./axisDrag";
import { draggedBy, newObject, type Tool } from "./editor";
import { raisedEndPad, withEndPadRaise } from "./endPad";
import { pathPositions } from "./enemyPaths";
import { spawnView } from "./spawnView";
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
  // how far the objects are turned, as the build turns them
  const turn = levelTurn(levelCfg.cfg.turn, levelCfg.cfg.camera);
  const triangles = useTriangles(group);
  const warnings = useWarnings(state.objects, scale, triangles);
  const pathWarnings = usePathWarnings(state.objects, turn, scale, triangles);
  const outlineWarnings = useOutlineWarnings(state.objects);
  const boxWarnings = useMemo(() => new Set([...warnings, ...outlineWarnings]), [warnings, outlineWarnings]);
  const [tool, setTool] = useState<Tool>(SELECT);
  const [grid, setGrid] = useState(0);
  const orbitRef = useRef<Orbit>(null);
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
  // the object being dragged by an axis arrow (or the node of its path that is), as it was when grabbed, and whether it's moved yet
  const axisDragged = useRef<{ index: number; node: number | null; object: LevelObject; hasMoved: boolean } | null>(null);
  const setOrbiting = (isOn: boolean) => {
    if (orbitRef.current) {
      orbitRef.current.enabled = isOn;
    }
  };
  const axisDrag = {
    onGrab: () => {
      if (state.selected === null) {
        return;
      }
      setOrbiting(false);
      axisDragged.current = { index: state.selected, node: state.selectedNode, object: state.objects[state.selected], hasMoved: false };
    },
    onMove: (axis: Axis, metres: number) => {
      const dragging = axisDragged.current;
      if (!dragging) {
        return;
      }
      if (!dragging.hasMoved) {
        dispatch({ type: "checkpoint" }); // the whole drag is one change to undo
        dragging.hasMoved = true;
      }
      const { object, node } = dragging;
      const changes = node === null
        ? withEndPadRaise(object, movedAlong(object, axis, metres, grid), scale, triangles)
        : movedNodeAlong(object, node, axis, metres, grid, turn, scale);
      dispatch({ type: "update", index: dragging.index, changes, record: false });
    },
    onRelease: () => {
      setOrbiting(true);
      axisDragged.current = null;
    },
  };
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
        {status && !status.failed && <span className="status" title={status.detail}>{status.text}</span>}
        <button disabled={!level || isBusy} onClick={build} title="Build this level, saving first (Ctrl+Shift+B)">
          Build
        </button>
        <button disabled={!level || isBusy} onClick={buildAndBoot} title="Build this level, then set it as the level CUSTOM LEVEL on the game's title screen starts (F5)">
          Build + boot
        </button>
      </div>
    );
  };

  // the level's error and a failed build's, in full under the toolbar
  const renderErrorStrip = () => {
    const failedAction = levelActions.status?.failed ? levelActions.status : null;
    if (!error && !failedAction) {
      return null;
    }
    return (
      <div className="error error-strip" role="alert">
        {error && <div>{error}</div>}
        {failedAction && <div title={failedAction.detail}>{failedAction.text}</div>}
      </div>
    );
  };

  // a build's warnings, under the toolbar where an error would be
  const renderBuildWarningStrip = () => {
    const { warnings } = levelActions;
    if (warnings.length === 0) {
      return null;
    }
    return (
      <div className="warning-strip" role="status">
        {warnings.map((warning, index) => <div key={index}>Warning: {warning}</div>)}
      </div>
    );
  };

  // the error strip, or else a build's warnings
  const renderMessageStrip = () => renderErrorStrip() ?? renderBuildWarningStrip();

  const renderHeader = () => (
    <header className="toolbar">
      <LevelPicker levels={levels} level={level} onOpen={openLevel} />
      {renderHistoryButtons()}
      {renderSaveButton()}
      {renderLevelActions()}
      {(isSaving || levelActions.isBusy) && <div className="progress" role="progressbar" aria-label="Working" />}
    </header>
  );

  // the selected object's axis arrows, or its selected path node's, while selecting
  const renderAxisHandles = () => {
    if (tool.kind !== "select" || state.selected === null) {
      return null;
    }
    const object = state.objects[state.selected];
    if (state.selectedNode !== null) {
      return <AxisHandles at={pathPositions(object, turn, scale)[state.selectedNode]} {...axisDrag} />;
    }
    const { at: [x, y, z], raise } = object;
    return <AxisHandles at={[x, y, z + raise]} {...axisDrag} />;
  };

  // where the camera starts: behind the spawn, the way its arrow points, if the level has one
  const startSpawnView = () => {
    const spawn = state.objects.find((object) => object.kind === "spawn");
    return spawn ? spawnView(spawn, turn, scale) : null;
  };

  const renderLevel = () => (
    <>
      {group && (
        <LevelMesh
          group={group}
          spawn={startSpawnView()}
          isReady={editor.isLoaded && levelCfg.isLoaded}
          onClick={clickLevel}
          onPointerMove={drag.moveOverLevel}
        />
      )}
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
      {renderAxisHandles()}
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
      {renderMessageStrip()}
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
        levelName={level ? level.name : ""}
        songs={songs}
        onLevelCfg={levelCfg.change}
      />
    </div>
  );
}
