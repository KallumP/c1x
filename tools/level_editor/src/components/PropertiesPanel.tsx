// the selected object's settings, or the level's (its level.cfg) with nothing selected
import { useEffect, useRef, useState } from "react";
import type { LevelCfg } from "../api";
import type { EditorAction, EditorState } from "../editor";
import { useShiftHeld } from "../hooks/useShiftHeld";
import { enemyPath, inNodes, nodeCount, nodeTurnedRound, pathPositions, turnedRound, withNodeAt } from "../enemyPaths";
import { BADGER_COUNT, BADGER_COUNT_MAX, BADGER_COUNT_MIN, BOX_TYPES, boxTypeName, hasPath, PATH_NODES_MAX, SPEED_MAX, SPEED_MIN, type BoxType, type LevelObject, type Vec3 } from "../objects";
import { dropToFloor, type Triangle } from "../overlaps";
import { SKY_ROWS, type Sky } from "../sky";
import { ChoiceField, ColourField, NumberField, SliderField } from "./Fields";
import "./PropertiesPanel.css";

const AXES = ["x", "y"] as const;
const STONE_START_STEP = 0.05; // the stone start slider's steps, of its track
const SPEED_STEP = 0.25; // the speed slider's steps, times the game's own pace
const NODE_AXES = ["x", "y", "z"] as const; // a path node can go anywhere, up and down too // z is the floor's height under the object, set by placing, dragging and Drop to floor
const TURNS = ["0", "90", "180", "270"] as const; // degrees, the turns the build does

export default function PropertiesPanel({ state, warnings, pathWarnings, scale, triangles, dispatch, levelCfg, onLevelCfg }: {
  state: EditorState;
  warnings: Set<number>;
  pathWarnings: Set<number>; // the path enemies whose paths leave the floor or run through a wall
  scale: number;
  triangles: Triangle[]; // the level's, for dropping a box to the floor
  dispatch: (action: EditorAction) => void;
  levelCfg: LevelCfg | null; // null with no level open
  onLevelCfg: (changes: Partial<LevelCfg>) => void;
}) {
  const isShiftHeld = useShiftHeld();
  const index = state.selected;
  const object = index === null ? null : state.objects[index];
  const [hasNoFloor, setHasNoFloor] = useState(false); // the last drop found no floor below the box
  useEffect(() => setHasNoFloor(false), [object]);
  const grabbedPath = useRef<Vec3[] | null>(null); // the path as it was when its node slider was grabbed

  const change = (changes: Partial<LevelObject>) => {
    if (index !== null) {
      dispatch({ type: "update", index, changes });
    }
  };

  const renderPositionFields = (at: Vec3) => {
    const setAxis = (axis: number, value: number) => {
      change({ at: at.map((current, axisIndex) => (axisIndex === axis ? value : current)) as Vec3 });
    };
    // holding shift makes the arrows step in finer steps
    const step = isShiftHeld ? 0.01 : 0.1;
    return AXES.map((axis, axisIndex) => (
      <NumberField
        key={axis}
        label={axis}
        value={at[axisIndex]}
        step={step}
        onChange={(value) => setAxis(axisIndex, value)}
      />
    ));
  };

  const renderBoxFields = (box: LevelObject) => (
    <>
      <ChoiceField
        label="type"
        value={boxTypeName(box.box!)}
        choices={Object.keys(BOX_TYPES) as BoxType[]}
        onChange={(boxType) => change({ box: boxType })}
      />
      <NumberField
        label="stack"
        value={box.stack}
        step={1}
        min={1}
        onChange={(stack) => change({ stack: Math.max(1, Math.round(stack)) })}
      />
    </>
  );

  // the selected node of a path enemy's path: where it is in blender
  const renderNodeFields = (enemy: LevelObject, node: number) => {
    const turn = levelCfg ? levelCfg.turn : 0;
    const position = pathPositions(enemy, turn, scale)[node];
    const setAxis = (axis: number, value: number) => {
      const moved = position.map((current, axisIndex) => (axisIndex === axis ? value : current)) as Vec3;
      change({ path: withNodeAt(enemy, node, moved, turn, scale) });
    };
    const step = isShiftHeld ? 0.01 : 0.1;
    return (
      <>
        <h3>node {node + 1} of {nodeCount(enemy)}</h3>
        {NODE_AXES.map((axis, axisIndex) => (
          <NumberField key={axis} label={axis} value={position[axisIndex]} step={step} onChange={(value) => setAxis(axisIndex, value)} />
        ))}
      </>
    );
  };

  // how many nodes a path enemy's path has: each count respaces the path
  // as it was when the slider was grabbed, so sliding down and back keeps its
  // shape, and the whole slide is one change to undo
  const renderNodeSlider = (enemy: LevelObject) => {
    const turn = levelCfg ? levelCfg.turn : 0;
    const grab = () => {
      grabbedPath.current = enemyPath(enemy, turn, scale);
      dispatch({ type: "checkpoint" });
    };
    const changeCount = (count: number) => {
      const path = inNodes(grabbedPath.current ?? enemyPath(enemy, turn, scale), count);
      if (index !== null) {
        dispatch({ type: "update", index, changes: { path }, record: false });
      }
    };
    return <SliderField label="nodes" value={nodeCount(enemy)} min={2} max={PATH_NODES_MAX} onGrab={grab} onChange={changeCount} />;
  };

  // how fast a path enemy walks, times the game's own pace; the whole slide is one change to undo
  const renderSpeedSlider = (enemy: LevelObject) => {
    const changeSpeed = (speed: number) => {
      if (index !== null) {
        dispatch({ type: "update", index, changes: { speed }, record: false });
      }
    };
    return (
      <SliderField
        label="speed ×"
        value={enemy.speed ?? 1}
        min={SPEED_MIN}
        max={SPEED_MAX}
        step={SPEED_STEP}
        onGrab={() => dispatch({ type: "checkpoint" })}
        onChange={changeSpeed}
      />
    );
  };

  // turns an enemy's path round, so it starts at the other end; a selected node stays selected
  const renderTurnRoundButton = (enemy: LevelObject) => {
    const turnRound = () => {
      const turn = levelCfg ? levelCfg.turn : 0;
      change({ path: turnedRound(enemy, turn, scale) });
      if (index !== null && state.selectedNode !== null) {
        dispatch({ type: "selectNode", index, node: nodeTurnedRound(state.selectedNode, nodeCount(enemy)) });
      }
    };
    return (
      <button className="drop" onClick={turnRound} title="It starts at the solid end, and turns round at the faded one">
        Reverse direction
      </button>
    );
  };

  // where along its track a rolling stone starts, 0 (its first end) to 1 (its far end); the whole slide is one change to undo
  const renderStoneStartSlider = (stone: LevelObject) => {
    const changeStart = (start: number) => {
      if (index !== null) {
        dispatch({ type: "update", index, changes: { start }, record: false });
      }
    };
    return (
      <SliderField
        label="start"
        value={stone.start ?? 0}
        min={0}
        max={1}
        step={STONE_START_STEP}
        onGrab={() => dispatch({ type: "checkpoint" })}
        onChange={changeStart}
      />
    );
  };

  // which way a rolling stone rolls first from where it starts: on along its track, or back
  const renderStoneReverseButton = (stone: LevelObject) => (
    <button className="drop" onClick={() => change({ reverse: stone.reverse ? undefined : true })} title="The arrow at the dot shows which way it rolls first">
      Reverse direction
    </button>
  );

  // how many badgers come out at once; the whole slide is one change to undo
  const renderBadgerCountSlider = (badger: LevelObject) => {
    const changeCount = (count: number) => {
      if (index !== null) {
        dispatch({ type: "update", index, changes: { count }, record: false });
      }
    };
    return (
      <SliderField
        label="count"
        value={badger.count ?? BADGER_COUNT}
        min={BADGER_COUNT_MIN}
        max={BADGER_COUNT_MAX}
        onGrab={() => dispatch({ type: "checkpoint" })}
        onChange={changeCount}
      />
    );
  };

  const isBadger = (selected: LevelObject) => selected.kind === "enemy" && selected.enemy === "badger";
  const isStone = (selected: LevelObject) => selected.kind === "enemy" && selected.enemy === "rolling_stone";

  // raise is its height above the floor, kept as it's dragged about
  const renderObjectFields = (selected: LevelObject) => (
    <>
      <h3>{selected.kind}</h3>
      {selected.kind === "box" && renderBoxFields(selected)}
      {renderPositionFields(selected.at)}
      <NumberField label="raise" value={selected.raise} step={isShiftHeld ? 0.01 : 0.1} onChange={(raise) => change({ raise })} />
    </>
  );

  // lowers the box onto the floor below it, just clear of it
  const dropBox = (box: LevelObject) => {
    const z = dropToFloor(box, scale, triangles);
    if (z === null) {
      setHasNoFloor(true);
      return;
    }
    change({ at: [box.at[0], box.at[1], z] });
  };

  const renderDropButton = (box: LevelObject) => (
    <>
      <button className="drop" onClick={() => dropBox(box)}>Drop to floor</button>
      {hasNoFloor && <p className="warning">There's no floor below this box.</p>}
    </>
  );

  const renderOverlapNote = () => <p className="warning">This box is in a wall or another box.</p>;

  // the scale and turn the level is built with; saved to its level.cfg with the objects
  const renderLevelFields = (cfg: LevelCfg) => {
    const turn = String(cfg.turn) as (typeof TURNS)[number];
    return (
      <>
        <h3>Level</h3>
        <ChoiceField
          label="turn"
          value={TURNS.includes(turn) ? turn : "0"}
          choices={TURNS}
          onChange={(degrees) => onLevelCfg({ turn: Number(degrees) })}
        />
        <NumberField
          label="scale"
          value={cfg.scale}
          step={50}
          min={1}
          onChange={(units) => onLevelCfg({ scale: Math.max(1, Math.round(units)) })}
        />
        <p className="hint">
          Turn turns the level in the game, so its route runs the way Crash faces. Scale is the game's units a metre (400 is
          normal): a bigger scale makes the map bigger in the game, so boxes look smaller on it.
        </p>
      </>
    );
  };

  // the two colours, split as they are on the game's screen
  const renderSkyPreview = (sky: Sky) => (
    <div className="sky-preview">
      <div style={{ height: `${(100 * sky.split) / SKY_ROWS}%`, background: `rgb(${sky.top.join(",")})` }} />
      <div style={{ flex: 1, background: `rgb(${sky.bottom.join(",")})` }} />
    </div>
  );

  // the sky behind the level in the game; saved to its level.cfg with the turn and scale
  const renderSkyFields = (sky: Sky) => {
    const changeSky = (changes: Partial<Sky>) => onLevelCfg({ sky: { ...sky, ...changes } });
    return (
      <>
        <h3>Sky</h3>
        {renderSkyPreview(sky)}
        <ColourField label="top" value={sky.top} onChange={(top) => changeSky({ top })} />
        <ColourField label="bottom" value={sky.bottom} onChange={(bottom) => changeSky({ bottom })} />
        <NumberField
          label="split"
          value={sky.split}
          step={4}
          min={0}
          onChange={(rows) => changeSky({ split: Math.min(SKY_ROWS, Math.max(0, Math.round(rows))) })}
        />
        <p className="hint">
          The top colour fills the game's screen down to split (of its {SKY_ROWS} rows), and the bottom colour the rest.
          Build the level to see it in the game.
        </p>
      </>
    );
  };

  const renderHint = () => (
    <p className="hint">
      Click an object to select it, then drag it across the floor. Pick something under Place and click the floor to add one.
    </p>
  );

  return (
    <aside className="panel">
      {object && index !== null ? (
        <>
          {renderObjectFields(object)}
          {hasPath(object) && renderNodeSlider(object)}
          {hasPath(object) && renderSpeedSlider(object)}
          {hasPath(object) && renderTurnRoundButton(object)}
          {isBadger(object) && renderBadgerCountSlider(object)}
          {isStone(object) && renderStoneStartSlider(object)}
          {isStone(object) && renderStoneReverseButton(object)}
          {hasPath(object) && state.selectedNode !== null && renderNodeFields(object, state.selectedNode)}
          {object.kind === "box" && renderDropButton(object)}
          {warnings.has(index) && renderOverlapNote()}
          {pathWarnings.has(index) && <p className="warning">This path leaves the floor or runs through a wall.</p>}
          <button className="delete" onClick={() => dispatch({ type: "remove", index })}>Delete</button>
        </>
      ) : (
        <>
          {levelCfg && renderLevelFields(levelCfg)}
          {levelCfg && renderSkyFields(levelCfg.sky)}
          {renderHint()}
        </>
      )}
    </aside>
  );
}
