import { useRef } from "react";
import type * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { axisHandlesSpot } from "../axisDrag";
import { newObject, type EditorAction, type EditorState, type Tool } from "../editor";
import { raisedEndPad } from "../endPad";
import { useAxisDrag } from "../hooks/useAxisDrag";
import { useObjectDrag } from "../hooks/useObjectDrag";
import type { LevelFrame } from "../levelFrame";
import { levelStartView } from "../spawnView";
import { clickedFloor, isClick } from "../three/clicks";
import AxisHandles from "./AxisHandles";
import LevelMesh from "./LevelMesh";
import ObjectMarkers from "./ObjectMarkers";
import Scene, { type Orbit } from "./Scene";

interface LevelViewProps {
  isLevelOpen: boolean;
  group: THREE.Group | null;
  isReady: boolean; // its objects and level.cfg are read, so the camera can frame it
  state: EditorState;
  dispatch: (action: EditorAction) => void;
  tool: Tool;
  frame: LevelFrame;
  boxWarnings: Set<number>;
  pathWarnings: Set<number>;
}

// the level in 3D: its map, its objects to select and drag, and the selected
// one's axis arrows
export default function LevelView(props: LevelViewProps) {
  const { group, state, dispatch, tool, frame } = props;
  const { grid, turn, scale, triangles } = frame;
  const orbitRef = useRef<Orbit>(null);
  const drag = useObjectDrag(orbitRef, state, dispatch, frame);
  const axisDrag = useAxisDrag(orbitRef, state, dispatch, frame);

  // a click on the map: with Select, clears the selection; placing, puts an
  // object on the floor there
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
    if (!at) {
      return;
    }
    const object = raisedEndPad(newObject(tool.what, at, scale), scale, triangles);
    dispatch({ type: "add", object });
  };

  // the selected object's axis arrows, or its selected path node's, while selecting
  const renderAxisHandles = () => {
    if (tool.kind !== "select" || state.selected === null) {
      return null;
    }
    const object = state.objects[state.selected];
    const spot = axisHandlesSpot(object, state.selectedNode, turn, scale);
    return <AxisHandles at={spot} {...axisDrag} />;
  };

  const renderLevel = () => (
    <>
      {group && (
        <LevelMesh
          group={group}
          spawn={levelStartView(state.objects, turn, scale)}
          isReady={props.isReady}
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
        warnings={props.boxWarnings}
        pathWarnings={props.pathWarnings}
        triangles={triangles}
        onSelect={drag.start}
        onSelectNode={drag.startNode}
      />
      {renderAxisHandles()}
    </>
  );

  return (
    <main className="viewport">
      <Scene orbitRef={orbitRef} onMiss={() => dispatch({ type: "select", index: null })}>
        {props.isLevelOpen && renderLevel()}
      </Scene>
    </main>
  );
}
