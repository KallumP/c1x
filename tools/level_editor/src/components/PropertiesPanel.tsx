// the selected object's settings
import type { EditorAction, EditorState } from "../editor";
import { BOX_TYPES, boxTypeName, type BoxType, type LevelObject, type Vec3 } from "../objects";
import { ChoiceField, NumberField } from "./Fields";

const AXES = ["x", "y", "z"] as const;

export default function PropertiesPanel({ state, dispatch }: { state: EditorState; dispatch: (action: EditorAction) => void }) {
  const index = state.selected;
  const object = index === null ? null : state.objects[index];

  const change = (changes: Partial<LevelObject>) => {
    if (index !== null) {
      dispatch({ type: "update", index, changes });
    }
  };

  const renderPositionFields = (at: Vec3) => {
    const setAxis = (axis: number, value: number) => {
      change({ at: at.map((current, axisIndex) => (axisIndex === axis ? value : current)) as Vec3 });
    };
    return AXES.map((axis, axisIndex) => (
      <NumberField key={axis} label={axis} value={at[axisIndex]} step={0.1} onChange={(value) => setAxis(axisIndex, value)} />
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
          <button className="delete" onClick={() => dispatch({ type: "remove", index })}>Delete</button>
        </>
      ) : (
        renderHint()
      )}
    </aside>
  );
}
