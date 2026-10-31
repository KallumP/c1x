// what's being edited: a level's objects and which one is selected
import { BOX_TYPES, type BoxType, type LevelObject, type Vec3 } from "./objects";

export type Placeable = "spawn" | "end" | BoxType;

// what clicking on the level does: select, or place an object
export type Tool = { kind: "select" } | { kind: "place"; what: Placeable };

export interface EditorState {
  objects: LevelObject[];
  selected: number | null;
}

export type EditorAction =
  | { type: "load"; objects: LevelObject[] }
  | { type: "add"; object: LevelObject }
  | { type: "select"; index: number | null };

export const emptyEditor: EditorState = { objects: [], selected: null };

export function newObject(what: Placeable, at: Vec3): LevelObject {
  const kind = what in BOX_TYPES ? "box" : (what as "spawn" | "end");
  const object: LevelObject = { kind, at, raise: 0, stack: 1 };
  if (kind === "box") {
    object.box = what as BoxType;
  }
  return object;
}

// a level has one spawn and one end, so adding another moves it
function add(state: EditorState, object: LevelObject): EditorState {
  const existing = object.kind === "box" ? -1 : state.objects.findIndex((other) => other.kind === object.kind);
  if (existing >= 0) {
    const objects = state.objects.map((other, index) => (index === existing ? object : other));
    return { objects, selected: existing };
  }
  return { objects: [...state.objects, object], selected: state.objects.length };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "load":
      return { objects: action.objects, selected: null };
    case "add":
      return add(state, action.object);
    case "select":
      return { ...state, selected: action.index };
  }
}
