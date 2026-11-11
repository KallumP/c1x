// what clicking on the level does: select, or place an object. the things to
// place are by kind (the spawn, the end, a box, an enemy); picking box or enemy
// places the type last picked of it and lists its types to pick another
import { useState } from "react";
import { placeableKind, type Placeable, type PlaceableKind, type Tool } from "../editor";
import { placeableName, placeablesByName } from "../objectNames";
import { BOX_TYPES, ENEMY_TYPES, PLATFORM_TYPES, type BoxType, type EnemyType, type PlatformType } from "../objects";
import { boxStyle, END_COLOUR, ENEMY_COLOURS, PLATFORM_COLOURS, SPAWN_COLOUR } from "../objectStyles";
import "./Palette.css";

const GRID_SIZES = [0, 0.25, 0.5, 1];
const BOX_TYPE_NAMES = Object.keys(BOX_TYPES) as BoxType[];

type TypedKind = "box" | "enemy" | "platform"; // the kinds with types to pick from
const TYPED_KINDS: PlaceableKind[] = ["box", "enemy", "platform"];
const isTypedKind = (kind: PlaceableKind | null): kind is TypedKind => kind !== null && TYPED_KINDS.includes(kind);
// each kind's types, in alphabetical order of their names
const KIND_TYPES: Record<TypedKind, Placeable[]> = {
  box: placeablesByName(BOX_TYPE_NAMES), enemy: placeablesByName([...ENEMY_TYPES]), platform: placeablesByName([...PLATFORM_TYPES]),
};
const KIND_TYPE_HEADINGS: Record<TypedKind, string> = { box: "Box type", enemy: "Enemy type", platform: "Platform type" };

// what a tool places, if anything
function placingOf(tool: Tool): Placeable | null {
  if (tool.kind === "place") {
    return tool.what;
  }
  return null;
}

// a thing to place's swatch colour
function colourOf(what: Placeable): string {
  if (what === "spawn") {
    return SPAWN_COLOUR;
  }
  if (what === "end") {
    return END_COLOUR;
  }
  if (placeableKind(what) === "box") {
    return boxStyle(what as BoxType).colour;
  }
  if (placeableKind(what) === "platform") {
    return PLATFORM_COLOURS[what as PlatformType];
  }
  return ENEMY_COLOURS[what as EnemyType];
}

export default function Palette({ tool, onTool, grid, onGrid }: {
  tool: Tool; onTool: (tool: Tool) => void; grid: number; onGrid: (grid: number) => void;
}) {
  // the box, enemy and platform types last picked, which picking box, enemy or platform places
  const [lastPicked, setLastPicked] = useState<Record<TypedKind, Placeable>>({ box: "basic", enemy: ENEMY_TYPES[0], platform: PLATFORM_TYPES[0] });
  const placing = placingOf(tool);
  const placingKind = placing && placeableKind(placing);

  const place = (what: Placeable) => {
    const kind = placeableKind(what);
    if (isTypedKind(kind)) {
      setLastPicked({ ...lastPicked, [kind]: what });
    }
    onTool({ kind: "place", what });
  };

  // what picking a kind places: the spawn or end, or its type last picked
  const kindPlaces = (kind: PlaceableKind): Placeable => {
    if (isTypedKind(kind)) {
      return lastPicked[kind];
    }
    return kind;
  };

  // a kind's label: box and enemy with the type they place
  const kindLabel = (kind: PlaceableKind, what: Placeable) => {
    if (isTypedKind(kind)) {
      return `${kind}: ${placeableName(what)}`;
    }
    return kind;
  };

  const renderToolButton = (key: string, label: string, active: boolean, onClick: () => void, colour?: string) => (
    <button key={key} className={active ? "tool active" : "tool"} onClick={onClick}>
      {colour && <span className="swatch" style={{ background: colour }} />}
      {label}
    </button>
  );

  // a kind's button, showing the type it places for box and enemy
  const renderKindButton = (kind: PlaceableKind) => {
    const what = kindPlaces(kind);
    return renderToolButton(kind, kindLabel(kind, what), placingKind === kind, () => place(what), colourOf(what));
  };

  // the types of the kind being placed, to pick another
  const renderTypes = (kind: TypedKind) => (
    <div className="types">
      <h3>{KIND_TYPE_HEADINGS[kind]}</h3>
      {KIND_TYPES[kind].map((what) => renderToolButton(what, placeableName(what), placing === what, () => place(what), colourOf(what)))}
    </div>
  );

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

  return (
    <aside className="palette">
      {renderToolButton("select", "Select", tool.kind === "select", () => onTool({ kind: "select" }))}
      <h3>Place</h3>
      {renderKindButton("spawn")}
      {renderKindButton("end")}
      {renderKindButton("box")}
      {renderKindButton("enemy")}
      {renderKindButton("platform")}
      {isTypedKind(placingKind) && renderTypes(placingKind)}
      {renderGridPicker()}
    </aside>
  );
}
