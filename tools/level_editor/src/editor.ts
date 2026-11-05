// what's being edited: a level's objects, which one is selected, and the
// changes that can be undone and redone
import { BOX_TYPES, ENEMY_TYPES, type BoxType, type EnemyType, type LevelObject, type Vec3 } from "./objects";

export type Placeable = "spawn" | "end" | BoxType | EnemyType;

export const NEW_ROLL_LENGTH = 6; // metres a new rolling stone's path goes across the map (+x), to show and change
export const NEW_WAYPOINT_DISTANCE = 3; // metres an added waypoint goes on from the last

// what clicking on the level does: select, or place an object
export type Tool = { kind: "select" } | { kind: "place"; what: Placeable };

type Objects = LevelObject[];

export interface EditorState {
  objects: Objects;
  selected: number | null;
  waypoint: number | null; // the selected waypoint of the selected enemy's path
  past: Objects[];   // what the objects were before each change, last change last
  future: Objects[]; // what undoing took back, last undone last
}

export type EditorAction =
  | { type: "load"; objects: Objects }
  | { type: "add"; object: LevelObject }
  | { type: "update"; index: number; changes: Partial<LevelObject>; record?: boolean }
  | { type: "remove"; index: number }
  | { type: "select"; index: number | null }
  | { type: "selectWaypoint"; waypoint: number | null }
  | { type: "addWaypoint" }    // after the last of the selected enemy's path, and select it
  | { type: "removeWaypoint" } // the selected one, if it isn't the path's last
  | { type: "checkpoint" } // remember the objects now, as one change (a drag's start)
  | { type: "undo" }
  | { type: "redo" };

export const emptyEditor: EditorState = { objects: [], selected: null, waypoint: null, past: [], future: [] };

const isEnemyType = (what: Placeable): what is EnemyType => (ENEMY_TYPES as readonly string[]).includes(what);

// a rolling stone has a path to roll along; a plant stays put
function newEnemy(enemy: EnemyType, at: Vec3): LevelObject {
  const object: LevelObject = { kind: "enemy", enemy, at, raise: 0, stack: 1 };
  return enemy === "rolling_stone" ? { ...object, path: [[at[0] + NEW_ROLL_LENGTH, at[1], at[2]]] } : object;
}

export function newObject(what: Placeable, at: Vec3): LevelObject {
  if (isEnemyType(what)) {
    return newEnemy(what, at);
  }
  const kind = what in BOX_TYPES ? "box" : (what as "spawn" | "end");
  const object: LevelObject = { kind, at, raise: 0, stack: 1 };
  if (kind === "box") {
    object.box = what as BoxType;
  }
  return object;
}

// the changes that move object to at: an enemy's path comes along, keeping its shape
export function movedTo(object: LevelObject, at: Vec3): Partial<LevelObject> {
  if (!object.path) {
    return { at };
  }
  const offset = at.map((coordinate, axis) => coordinate - object.at[axis]);
  return { at, path: object.path.map((point) => point.map((coordinate, axis) => coordinate + offset[axis]) as Vec3) };
}

// the change that moves an enemy's waypoint to at
export function waypointMovedTo(object: LevelObject, waypoint: number, at: Vec3): Partial<LevelObject> {
  return { path: (object.path ?? []).map((point, index) => (index === waypoint ? at : point)) };
}

// the way from one point to the next, a metre long; +x where they're the same spot
function direction(from: Vec3, to: Vec3): Vec3 {
  const offset = to.map((coordinate, axis) => coordinate - from[axis]);
  const length = Math.hypot(...offset);
  return length > 0 ? (offset.map((coordinate) => coordinate / length) as Vec3) : [1, 0, 0];
}

// the change that adds a waypoint after the last, going on the way the path last went
export function waypointAdded(object: LevelObject): Partial<LevelObject> {
  const points = [object.at, ...(object.path ?? [])];
  const last = points[points.length - 1];
  const before = points.length > 1 ? points[points.length - 2] : last;
  const way = direction(before, last);
  const added = last.map((coordinate, axis) => coordinate + way[axis] * NEW_WAYPOINT_DISTANCE) as Vec3;
  return { path: [...(object.path ?? []), added] };
}

export function waypointRemoved(object: LevelObject, waypoint: number): Partial<LevelObject> {
  return { path: (object.path ?? []).filter((_, index) => index !== waypoint) };
}

// a change to the objects, which undo takes back
function change(state: EditorState, objects: Objects, selected: number | null): EditorState {
  const waypoint = selected === state.selected ? state.waypoint : null;
  return { objects, selected, waypoint, past: [...state.past, state.objects], future: [] };
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

// the selected waypoint, if the selected object's path still has it
function waypointStillThere(waypoint: number | null, selected: number | null, objects: Objects) {
  const pathLength = selected === null ? 0 : (objects[selected].path?.length ?? 0);
  return waypoint !== null && waypoint < pathLength ? waypoint : null;
}

// the objects as they were (undo) or will be (redo), keeping what's selected that's still there
function restore(state: EditorState, objects: Objects, past: Objects[], future: Objects[]): EditorState {
  const selected = stillThere(state.selected, objects);
  const waypoint = waypointStillThere(state.waypoint, selected, objects);
  return { objects, selected, waypoint, past, future };
}

function addWaypoint(state: EditorState): EditorState {
  if (state.selected === null) {
    return state;
  }
  const changes = waypointAdded(state.objects[state.selected]);
  const added = update(state, state.selected, changes, true);
  return { ...added, waypoint: changes.path!.length - 1 };
}

// a path keeps its last waypoint, as an enemy without one gets jungle rollers' own path
export function canRemoveWaypoint(state: EditorState): boolean {
  const path = state.selected === null ? undefined : state.objects[state.selected].path;
  return state.waypoint !== null && path !== undefined && path.length > 1;
}

function removeWaypoint(state: EditorState): EditorState {
  if (!canRemoveWaypoint(state)) {
    return state;
  }
  const index = state.selected!;
  const removed = update(state, index, waypointRemoved(state.objects[index], state.waypoint!), true);
  return { ...removed, waypoint: null };
}

function undo(state: EditorState): EditorState {
  const objects = state.past.at(-1);
  if (!objects) {
    return state;
  }
  return restore(state, objects, state.past.slice(0, -1), [...state.future, state.objects]);
}

function redo(state: EditorState): EditorState {
  const objects = state.future.at(-1);
  if (!objects) {
    return state;
  }
  return restore(state, objects, [...state.past, state.objects], state.future.slice(0, -1));
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
      return { ...state, selected: action.index, waypoint: null };
    case "selectWaypoint":
      return { ...state, waypoint: action.waypoint };
    case "addWaypoint":
      return addWaypoint(state);
    case "removeWaypoint":
      return removeWaypoint(state);
    case "checkpoint":
      return { ...state, past: [...state.past, state.objects], future: [] };
    case "undo":
      return undo(state);
    case "redo":
      return redo(state);
  }
}
