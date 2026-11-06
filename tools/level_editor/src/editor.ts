// what's being edited: a level's objects, which one is selected, and the
// changes that can be undone and redone
import { nodeCount, withNodeAt } from "./enemyPaths";
import { BOX_TYPES, ENEMY_TYPES, type BoxType, type EnemyType, type LevelObject, type Vec3 } from "./objects";

export type Placeable = "spawn" | "end" | BoxType | EnemyType;

// what clicking on the level does: select, or place an object
export type Tool = { kind: "select" } | { kind: "place"; what: Placeable };

type Objects = LevelObject[];

export interface EditorState {
  objects: Objects;
  selected: number | null;
  selectedNode: number | null; // a node of the selected crab's or turtle's path
  past: Objects[];   // what the objects were before each change, last change last
  future: Objects[]; // what undoing took back, last undone last
}

export type EditorAction =
  | { type: "load"; objects: Objects }
  | { type: "add"; object: LevelObject }
  | { type: "update"; index: number; changes: Partial<LevelObject>; record?: boolean }
  | { type: "remove"; index: number }
  | { type: "select"; index: number | null }
  | { type: "selectNode"; index: number; node: number } // an enemy, and a node of its path
  | { type: "checkpoint" } // remember the objects now, as one change (a drag's start)
  | { type: "undo" }
  | { type: "redo" };

export const emptyEditor: EditorState = { objects: [], selected: null, selectedNode: null, past: [], future: [] };

const isEnemyType = (what: Placeable): what is EnemyType => (ENEMY_TYPES as readonly string[]).includes(what);

export function newObject(what: Placeable, at: Vec3): LevelObject {
  if (isEnemyType(what)) {
    return { kind: "enemy", enemy: what, at, raise: 0, stack: 1 };
  }
  const kind = what in BOX_TYPES ? "box" : (what as "spawn" | "end");
  const object: LevelObject = { kind, at, raise: 0, stack: 1 };
  if (kind === "box") {
    object.box = what as BoxType;
  }
  return object;
}

// the selected node, if its enemy is still selected and its path still has it
function nodeStillThere(selectedNode: number | null, selected: number | null, objects: Objects): number | null {
  if (selectedNode === null || selected === null || selected >= objects.length) {
    return null;
  }
  return selectedNode < nodeCount(objects[selected]) ? selectedNode : null;
}

// what dragging an object, or a node of its path (node not null), to at (in blender) changes
export function draggedTo(object: LevelObject, node: number | null, at: Vec3, turn: number, scale: number): Partial<LevelObject> {
  if (node === null) {
    return { at };
  }
  return { path: withNodeAt(object, node, at, turn, scale) };
}

// a change to the objects, which undo takes back
function change(state: EditorState, objects: Objects, selected: number | null): EditorState {
  const selectedNode = selected === state.selected ? nodeStillThere(state.selectedNode, selected, objects) : null;
  return { objects, selected, selectedNode, past: [...state.past, state.objects], future: [] };
}

// a level has one spawn and one end, so adding another moves it
function add(state: EditorState, object: LevelObject): EditorState {
  const isOnce = object.kind === "spawn" || object.kind === "end";
  const existing = isOnce ? state.objects.findIndex((other) => other.kind === object.kind) : -1;
  if (existing >= 0) {
    const objects = state.objects.map((other, index) => (index === existing ? object : other));
    return change(state, objects, existing);
  }
  return change(state, [...state.objects, object], state.objects.length);
}

// record: false for the steps of a drag, which are one change from its checkpoint
function update(state: EditorState, index: number, changes: Partial<LevelObject>, record: boolean): EditorState {
  const objects = state.objects.map((object, objectIndex) => (objectIndex === index ? { ...object, ...changes } : object));
  return record ? change(state, objects, state.selected) : { ...state, objects };
}

// the selection stays on the same object as others before it go
function remove(state: EditorState, index: number): EditorState {
  const objects = state.objects.filter((_, objectIndex) => objectIndex !== index);
  const { selected } = state;
  if (selected === null || selected < index) {
    return change(state, objects, selected);
  }
  return change(state, objects, selected === index ? null : selected - 1);
}

// the selection, if there's still an object there
const stillThere = (selected: number | null, objects: Objects) =>
  selected !== null && selected < objects.length ? selected : null;

function undo(state: EditorState): EditorState {
  const objects = state.past.at(-1);
  if (!objects) {
    return state;
  }
  const selected = stillThere(state.selected, objects);
  const selectedNode = nodeStillThere(state.selectedNode, selected, objects);
  return { objects, selected, selectedNode, past: state.past.slice(0, -1), future: [...state.future, state.objects] };
}

function redo(state: EditorState): EditorState {
  const objects = state.future.at(-1);
  if (!objects) {
    return state;
  }
  const selected = stillThere(state.selected, objects);
  const selectedNode = nodeStillThere(state.selectedNode, selected, objects);
  return { objects, selected, selectedNode, past: [...state.past, state.objects], future: state.future.slice(0, -1) };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "load":
      return { ...emptyEditor, objects: action.objects };
    case "add":
      return add(state, action.object);
    case "update":
      return update(state, action.index, action.changes, action.record !== false);
    case "remove":
      return remove(state, action.index);
    case "select":
      return { ...state, selected: action.index, selectedNode: null };
    case "selectNode":
      return { ...state, selected: action.index, selectedNode: action.node };
    case "checkpoint":
      return { ...state, past: [...state.past, state.objects], future: [] };
    case "undo":
      return undo(state);
    case "redo":
      return redo(state);
  }
}
