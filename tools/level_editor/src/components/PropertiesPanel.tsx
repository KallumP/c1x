// the selected object's settings
import { useEffect, useState } from "react";
import type { EditorAction, EditorState } from "../editor";
import { useShiftHeld } from "../hooks/useShiftHeld";
import { BOX_TYPES, boxTypeName, type BoxType, type LevelObject, type Vec3 } from "../objects";
import { dropToFloor, type Triangle } from "../overlaps";
import { ChoiceField, NumberField } from "./Fields";

const AXES = ["x", "y", "z"] as const;

export default function PropertiesPanel({ state, warnings, scale, triangles, dispatch }: {
  state: EditorState;
  warnings: Set<number>;
  scale: number;
  triangles: Triangle[]; // the level's, for dropping a box to the floor
  dispatch: (action: EditorAction) => void;
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
        renderHint()
      )}
    </aside>
  );
}
