// the selected object's settings, or the level's (its level.cfg) with nothing selected
import { useEffect, useState } from "react";
import type { LevelCfg } from "../api";
import type { EditorAction, EditorState } from "../editor";
import { useShiftHeld } from "../hooks/useShiftHeld";
import { BOX_TYPES, boxTypeName, type BoxType, type LevelObject, type Vec3 } from "../objects";
import { dropToFloor, type Triangle } from "../overlaps";
import { ChoiceField, NumberField } from "./Fields";
import "./PropertiesPanel.css";

const AXES = ["x", "y", "z"] as const;
const TURNS = ["0", "90", "180", "270"] as const; // degrees, the turns the build does

export default function PropertiesPanel({ state, warnings, scale, triangles, dispatch, levelCfg, onLevelCfg }: {
  state: EditorState;
  warnings: Set<number>;
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

  const change = (changes: Partial<LevelObject>) => {
    if (index !== null) {
      dispatch({ type: "update", index, changes });
    }
  };

  const renderPositionFields = (at: Vec3) => {
    const setAxis = (axis: number, value: number) => {
      change({ at: at.map((current, axisIndex) => (axisIndex === axis ? value : current)) as Vec3 });
    };
    // holding shift makes z's arrows go up and down in finer steps
    const stepFor = (axis: (typeof AXES)[number]) => (axis === "z" && isShiftHeld ? 0.01 : 0.1);
    return AXES.map((axis, axisIndex) => (
      <NumberField
        key={axis}
        label={axis}
        value={at[axisIndex]}
        step={stepFor(axis)}
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

  const renderObjectFields = (selected: LevelObject) => (
    <>
      <h3>{selected.kind}</h3>
      {selected.kind === "box" && renderBoxFields(selected)}
      {renderPositionFields(selected.at)}
      <NumberField label="raise" value={selected.raise} step={0.1} onChange={(raise) => change({ raise })} />
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
          {object.kind === "box" && renderDropButton(object)}
          {warnings.has(index) && renderOverlapNote()}
          <button className="delete" onClick={() => dispatch({ type: "remove", index })}>Delete</button>
        </>
      ) : (
        <>
          {levelCfg && renderLevelFields(levelCfg)}
          {renderHint()}
        </>
      )}
    </aside>
  );
}
