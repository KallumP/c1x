import { useCallback, useMemo, useRef, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import AxisHandles from "./components/AxisHandles";
import LevelMesh from "./components/LevelMesh";
import MessageStrip from "./components/MessageStrip";
import ObjectMarkers from "./components/ObjectMarkers";
import Palette from "./components/Palette";
import PropertiesPanel from "./components/PropertiesPanel";
import ShareDialog from "./components/ShareDialog";
import Scene, { type Orbit } from "./components/Scene";
import Toolbar from "./components/Toolbar";
import { levelTurn } from "./camera";
import { draggedBy, newObject, type Tool } from "./editor";
import { raisedEndPad, withEndPadRaise } from "./endPad";
import { pathPositions } from "./enemyPaths";
import { levelStartView } from "./spawnView";
import type { LevelObject } from "./objects";
import { useAxisDrag } from "./hooks/useAxisDrag";
import { useDrag } from "./hooks/useDrag";
import { useEditor } from "./hooks/useEditor";
import { useLevelActions } from "./hooks/useLevelActions";
import { useLevelCfg } from "./hooks/useLevelCfg";
import { useLevelGroup } from "./hooks/useLevelGroup";
import { useLevelSongs } from "./hooks/useLevelSongs";
import { useLevels } from "./hooks/useLevels";
import { useSave } from "./hooks/useSave";
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
  const axisDrag = useAxisDrag(orbitRef, state, dispatch, { grid, turn, scale, triangles });
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

  const renderLevel = () => (
    <>
      {group && (
        <LevelMesh
          group={group}
          spawn={levelStartView(state.objects, turn, scale)}
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
      <MessageStrip error={error} status={levelActions.status} warnings={levelActions.warnings} />
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
      {isSharing && level && (
        <ShareDialog level={level} save={save} onClose={() => setIsSharing(false)} />
      )}
    </div>
  );
}
