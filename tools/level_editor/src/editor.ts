// what's being edited: a level's objects, which one is selected, and the
// changes that can be undone and redone
import { nodeCount, pathPositions, withNodeAt } from "./enemyPaths";
import { BAT_ROOST_HEIGHT, DEFAULT_SCALE, LEADER_BAT_HEIGHT } from "./coords";
import { END_PAD_LIFT } from "./endPad";
import { BOX_TYPES, ENEMY_TYPES, isSwitch, OBSTACLE_TYPES, type BoxType, type EnemyType, type LevelObject, type ObstacleType, type Vec3 } from "./objects";

export type Placeable = "spawn" | "end" | BoxType | EnemyType | ObstacleType;

// what clicking on the level does: select, or place an object
export type Tool = { kind: "select" } | { kind: "place"; what: Placeable };

// the palette's kinds of thing to place: the spawn, the end, a box, an enemy or an obstacle (each of a type)
export const PLACEABLE_KINDS = ["spawn", "end", "box", "enemy", "obstacle"] as const;
export type PlaceableKind = (typeof PLACEABLE_KINDS)[number];

const isObstacleType = (what: Placeable): what is ObstacleType => (OBSTACLE_TYPES as readonly string[]).includes(what);

// the kind a thing to place is under in the palette
export function placeableKind(what: Placeable): PlaceableKind {
  if (what === "spawn" || what === "end") {
    return what;
  }
  if (what in BOX_TYPES) {
    return "box";
  }
  if (isObstacleType(what)) {
    return "obstacle";
  }
  return "enemy";
}

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

// how high new enemies go over the floor, in game units: a bat roost, high
// enough for its bats to swoop at crash, and leader bats' first leader, where
// crash can spin it; the rest stand on the floor
const NEW_ENEMY_HEIGHTS: Partial<Record<EnemyType, number>> = { bat: BAT_ROOST_HEIGHT, leader_bats: LEADER_BAT_HEIGHT };

// how far a new enemy is raised, in metres for a level at scale
const newEnemyRaise = (enemy: EnemyType, scale: number) => (NEW_ENEMY_HEIGHTS[enemy] ?? 0) / scale;

// how far a new object of a kind is raised: the end pad's base only reaches
// 16 game units over where it stands, so it's lifted to show over the floor
function newKindRaise(kind: LevelObject["kind"], scale: number): number {
  if (kind === "end") {
    return END_PAD_LIFT / scale;
  }
  return 0;
}

export function newObject(what: Placeable, at: Vec3, scale = DEFAULT_SCALE): LevelObject {
  if (isEnemyType(what)) {
    return { kind: "enemy", enemy: what, at, raise: newEnemyRaise(what, scale), stack: 1 };
  }
  if (isObstacleType(what)) {
    return { kind: "obstacle", obstacle: what, at, raise: 0, stack: 1 };
  }
  const kind = what in BOX_TYPES ? "box" : (what as "spawn" | "end");
  const object: LevelObject = { kind, at, raise: newKindRaise(kind, scale), stack: 1 };
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

const roundToMillimetre = (metres: number) => Math.round(metres * 1000) / 1000 + 0; // + 0 turns -0 into 0

// where what's dragged was as the drag began: the object's spot, or its path node's position (in blender)
function dragStart(object: LevelObject, node: number | null, turn: number, scale: number): Vec3 {
  if (node === null) {
    return object.at;
  }
  return pathPositions(object, turn, scale)[node];
}

// the change for dragging an object, or a node of its path, as it was when the
// drag began, by how far the pointer has moved over the floor since then (from
// to to): it keeps its distance from the pointer, rather than jumping to it
export function draggedBy(object: LevelObject, node: number | null, from: Vec3, to: Vec3, turn: number, scale: number): Partial<LevelObject> {
  const start = dragStart(object, node, turn, scale);
  const at = start.map((value, axis) => roundToMillimetre(value + to[axis] - from[axis])) as Vec3;
  return draggedTo(object, node, at, turn, scale);
}

// a change to the objects, which undo takes back
function change(state: EditorState, objects: Objects, selected: number | null): EditorState {
  const selectedNode = selected === state.selected ? nodeStillThere(state.selectedNode, selected, objects) : null;
  return { objects, selected, selectedNode, past: [...state.past, state.objects], future: [] };
}

// the lowest switch number (from 1) no switch among objects has
export function nextSwitchNumber(objects: Objects): number {
  const taken = new Set(objects.map((object) => object.switch));
  let number = 1;
  while (taken.has(number)) {
    number++;
  }
  return number;
}

// a box as a switch or not: a switch has a number (the next free among others
// if it has none) and isn't an outline of itself; any other box has no number
function withSwitchSettings(object: LevelObject, others: Objects): LevelObject {
  if (object.kind !== "box") {
    return object;
  }
  const { switch: number, outline, ...rest } = object;
  if (!isSwitch(object)) {
    return withOutline(rest, outline);
  }
  const ownNumber = number ?? nextSwitchNumber(others);
  if (outline === ownNumber) {
    return { ...rest, switch: ownNumber };
  }
  return withOutline({ ...rest, switch: ownNumber }, outline);
}

// a box, an outline of switch outline if it's given one
function withOutline(box: LevelObject, outline: number | undefined): LevelObject {
  if (outline === undefined) {
    return box;
  }
  return { ...box, outline };
}

// the level's switch numbers, lowest first
export const switchNumbers = (objects: Objects): number[] =>
  objects.flatMap((object) => object.switch ?? []).sort((first, second) => first - second);

// the switch numbers along the line from switch number to the switches it's hidden behind (an
// outline of), and theirs, stopping at one already in the line
function switchesBehind(objects: Objects, number: number): number[] {
  const line: number[] = [];
  let current: number | undefined = number;
  while (current !== undefined && !line.includes(current)) {
    line.push(current);
    const switchNumber: number = current;
    current = objects.find((object) => object.switch === switchNumber)?.outline;
  }
  return line;
}

// whether switch number already fills in a switch other than the one at index
const fillsInAnotherSwitch = (objects: Objects, number: number, index: number) =>
  objects.some((object, objectIndex) => objectIndex !== index && isSwitch(object) && object.outline === number);

// the switches the box at index can be an outline of, lowest first: any for a box; for a
// switch, others not hidden behind it (a loop) and filling in no other switch (a chain ends
// with its only switch)
export function outlineChoices(objects: Objects, index: number): number[] {
  const box = objects[index];
  const numbers = switchNumbers(objects);
  if (!isSwitch(box)) {
    return numbers;
  }
  const isChoice = (number: number) =>
    !switchesBehind(objects, number).includes(box.switch!) && !fillsInAnotherSwitch(objects, number, index);
  return numbers.filter(isChoice);
}

// whether changes give a switch a number one of others has
const takesTakenNumber = (changes: Partial<LevelObject>, others: Objects) =>
  changes.switch !== undefined && switchNumbers(others).includes(changes.switch);

// objects with the outlines of switch from moved to switch to, as their switch was renumbered
function withOutlinesRenumbered(objects: Objects, from: number | undefined, to: number | undefined): Objects {
  if (from === undefined || to === undefined || from === to) {
    return objects;
  }
  const renumbered = (object: LevelObject) => {
    if (object.outline !== from) {
      return object;
    }
    return { ...object, outline: to };
  };
  return objects.map(renumbered);
}

// a level has one spawn and one end, so adding another moves it
function add(state: EditorState, added: LevelObject): EditorState {
  const object = withSwitchSettings(added, state.objects);
  const isOnce = object.kind === "spawn" || object.kind === "end";
  const existing = isOnce ? state.objects.findIndex((other) => other.kind === object.kind) : -1;
  if (existing >= 0) {
    const objects = state.objects.map((other, index) => (index === existing ? object : other));
    return change(state, objects, existing);
  }
  return change(state, [...state.objects, object], state.objects.length);
}

// record: false for the steps of a drag or a slide, which are one change from its
// checkpoint. either way, a selected node the path no longer has is let go of
function update(state: EditorState, index: number, changes: Partial<LevelObject>, record: boolean): EditorState {
  const others = state.objects.filter((_, objectIndex) => objectIndex !== index);
  if (takesTakenNumber(changes, others)) {
    return state;
  }
  const changed = (object: LevelObject) => withSwitchSettings({ ...object, ...changes }, others);
  const updated = state.objects.map((object, objectIndex) => (objectIndex === index ? changed(object) : object));
  const objects = withOutlinesRenumbered(updated, state.objects[index].switch, updated[index].switch);
  if (record) {
    return change(state, objects, state.selected);
  }
  return { ...state, objects, selectedNode: nodeStillThere(state.selectedNode, state.selected, objects) };
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
