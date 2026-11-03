// what clicking on the level does: select, or place an object
import type { Placeable, Tool } from "../editor";
import { BOX_TYPES, type BoxType } from "../objects";
import { boxStyle, END_COLOUR, SPAWN_COLOUR } from "../objectStyles";
import "./Palette.css";

const GRID_SIZES = [0, 0.25, 0.5, 1];

export default function Palette({ tool, onTool, grid, onGrid }: {
  tool: Tool; onTool: (tool: Tool) => void; grid: number; onGrid: (grid: number) => void;
}) {
  const isPlacing = (what: Placeable) => tool.kind === "place" && tool.what === what;

  const renderToolButton = (label: string, active: boolean, onClick: () => void, colour?: string) => (
    <button key={label} className={active ? "tool active" : "tool"} onClick={onClick}>
      {colour && <span className="swatch" style={{ background: colour }} />}
      {label}
    </button>
  );

  const renderPlaceButton = (what: Placeable, label: string, colour: string) =>
    renderToolButton(label, isPlacing(what), () => onTool({ kind: "place", what }), colour);

  const renderGridPicker = () => (
    <label className="grid-picker">
      Snap{" "}
      <select value={grid} onChange={(event) => onGrid(Number(event.target.value))}>
        {GRID_SIZES.map((gridSize) => (
          <option key={gridSize} value={gridSize}>{gridSize ? `${gridSize} m` : "off"}</option>
        ))}
      </select>
    </label>
  );

  const boxTypes = Object.keys(BOX_TYPES) as BoxType[];
  return (
    <aside className="palette">
      {renderToolButton("Select", tool.kind === "select", () => onTool({ kind: "select" }))}
      <h3>Place</h3>
      {renderPlaceButton("spawn", "spawn", SPAWN_COLOUR)}
      {renderPlaceButton("end", "end", END_COLOUR)}
      <h3>Boxes</h3>
      {boxTypes.map((boxType) => renderPlaceButton(boxType, boxType.replace("_", " "), boxStyle(boxType).colour))}
      {renderGridPicker()}
    </aside>
  );
}
