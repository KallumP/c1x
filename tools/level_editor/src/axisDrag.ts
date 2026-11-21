// dragging the selected object along one of its axis arrows: x, y (across the
// floor) or up, in blender
import { pathPositions, withNodeAt } from "./enemyPaths";
import type { LevelObject, Vec3 } from "./objects";

export type Axis = "x" | "y" | "up";

// which of a blender position's x, y and z each axis moves
const AXIS_INDEXES: Record<Axis, number> = { x: 0, y: 1, up: 2 };

// each axis's way (in blender) and its arrow's colour, as blender colours them
export const AXES: { axis: Axis; direction: Vec3; colour: string }[] = [
  { axis: "x", direction: [1, 0, 0], colour: "#e5484d" },
  { axis: "y", direction: [0, 1, 0], colour: "#46a758" },
  { axis: "up", direction: [0, 0, 1], colour: "#3e8ed0" },
];

const PARALLEL = 1e-9; // a ray this near along the axis has no one closest point

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const snap = (metres: number, grid: number) => (grid > 0 ? Math.round(metres / grid) * grid : metres);
const roundToMillimetre = (metres: number) => Math.round(metres * 1000) / 1000 + 0; // + 0 turns -0 into 0

// how far along the axis line through origin (axis: a unit direction) the
// pointer's ray comes closest to it; null if the ray runs along the axis. it's
// the closest points of two lines: where the line between them is square to both
export function alongAxis(origin: Vec3, axis: Vec3, rayOrigin: Vec3, rayDirection: Vec3): number | null {
  const between = origin.map((value, index) => value - rayOrigin[index]) as Vec3;
  const axisLength = dot(axis, axis);
  const across = dot(axis, rayDirection);
  const rayLength = dot(rayDirection, rayDirection);
  const square = axisLength * rayLength - across * across;
  if (Math.abs(square) < PARALLEL) {
    return null;
  }
  return (across * dot(rayDirection, between) - rayLength * dot(axis, between)) / square;
}

// the change moving object (as it was when the drag began) metres along axis
// makes: x and y move its spot, up raises it; snapped to grid (0: none)
export function movedAlong(object: LevelObject, axis: Axis, metres: number, grid: number): Partial<LevelObject> {
  const moved = (from: number) => roundToMillimetre(snap(from + metres, grid));
  if (axis === "up") {
    return { raise: moved(object.raise) };
  }
  const index = axis === "x" ? 0 : 1;
  const at = object.at.map((value, axisIndex) => (axisIndex === index ? moved(value) : value)) as Vec3;
  return { at };
}

// the change moving node of object's path (object as it was when the drag
// began) metres along axis makes: the node moves, up included, and the rest of
// its path stays; snapped to grid (0: none)
export function movedNodeAlong(object: LevelObject, node: number, axis: Axis, metres: number, grid: number, turn: number, scale: number): Partial<LevelObject> {
  const index = AXIS_INDEXES[axis];
  const position = pathPositions(object, turn, scale)[node];
  const moved = position.map((value, axisIndex) => (axisIndex === index ? snap(value + metres, grid) : value)) as Vec3;
  const path = withNodeAt(object, node, moved, turn, scale);
  return { path: path.map((offset, nodeIndex) => (nodeIndex === node ? (offset.map(roundToMillimetre) as Vec3) : offset)) };
}
