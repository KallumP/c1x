// boxes that sit in a wall or in another box, which the editor warns about
import { boxSize } from "./coords";
import type { LevelObject, Vec3 } from "./objects";

export type Triangle = [Vec3, Vec3, Vec3];

const TOUCHING = 0.02; // metres a box can reach into something and only be touching it
const AXIS_INDICES = [0, 1, 2];

interface Bounds { min: Vec3; max: Vec3 }

// the space a stack of boxes takes up (blender), shrunk so that touching isn't overlapping
function stackBounds(box: LevelObject, scale: number): Bounds {
  const half = boxSize(scale) / 2 - TOUCHING;
  const bottom = box.at[2] + box.raise + TOUCHING;
  return {
    min: [box.at[0] - half, box.at[1] - half, bottom],
    max: [box.at[0] + half, box.at[1] + half, bottom + boxSize(scale) * box.stack - 2 * TOUCHING],
  };
}

// whether two bounds overlap (sharing only a face doesn't count)
const boundsMeet = (first: Bounds, second: Bounds) =>
  AXIS_INDICES.every((axis) => first.min[axis] < second.max[axis] && second.min[axis] < first.max[axis]);

// whether two bounds overlap or touch
const boundsTouch = (first: Bounds, second: Bounds) =>
  AXIS_INDICES.every((axis) => first.min[axis] <= second.max[axis] && second.min[axis] <= first.max[axis]);

const subtract = (from: Vec3, take: Vec3): Vec3 => [from[0] - take[0], from[1] - take[1], from[2] - take[2]];
const dot = (first: Vec3, second: Vec3) => first[0] * second[0] + first[1] * second[1] + first[2] * second[2];
const cross = (first: Vec3, second: Vec3): Vec3 => [
  first[1] * second[2] - first[2] * second[1],
  first[2] * second[0] - first[0] * second[2],
  first[0] * second[1] - first[1] * second[0],
];

// whether axis separates the triangle's corners (relative to the box's centre) from a box of half sizes half
function separates(axis: Vec3, corners: Vec3[], half: Vec3): boolean {
  const projections = corners.map((corner) => dot(corner, axis));
  const boxReach = half[0] * Math.abs(axis[0]) + half[1] * Math.abs(axis[1]) + half[2] * Math.abs(axis[2]);
  return Math.min(...projections) > boxReach || Math.max(...projections) < -boxReach;
}

// the separating axis test: the box's axes, the triangle's normal, and the cross of each pair of edges
export function triangleTouchesBox(triangle: Triangle, min: Vec3, max: Vec3): boolean {
  const centre: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const half = subtract(max, centre);
  const corners = triangle.map((corner) => subtract(corner, centre));
  const edges = [subtract(corners[1], corners[0]), subtract(corners[2], corners[1]), subtract(corners[0], corners[2])];
  const boxAxes: Vec3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const edgeAxes = boxAxes.flatMap((boxAxis) => edges.map((edge) => cross(boxAxis, edge)));
  const axes = [...boxAxes, cross(edges[0], edges[1]), ...edgeAxes];
  return !axes.some((axis) => dot(axis, axis) > 1e-12 && separates(axis, corners, half));
}

function triangleBounds(triangle: Triangle): Bounds {
  return {
    min: AXIS_INDICES.map((axis) => Math.min(triangle[0][axis], triangle[1][axis], triangle[2][axis])) as Vec3,
    max: AXIS_INDICES.map((axis) => Math.max(triangle[0][axis], triangle[1][axis], triangle[2][axis])) as Vec3,
  };
}

interface UpwardHit { height: number; facesUp: boolean }

// how far straight up from point a triangle is, and whether its front faces up (null if the ray up misses it)
function aboveHit(point: Vec3, [cornerA, cornerB, cornerC]: Triangle): UpwardHit | null {
  // twice the signed area of a triangle seen from above (x and y only)
  const area = (first: Vec3, second: Vec3, third: Vec3) =>
    (second[0] - first[0]) * (third[1] - first[1]) - (second[1] - first[1]) * (third[0] - first[0]);
  const total = area(cornerA, cornerB, cornerC);
  if (Math.abs(total) < 1e-12) {
    return null; // a wall: the ray runs along it
  }
  // how much of each corner is in the point, seen from above; all of them 0 or more when it's over the triangle
  const weightA = area(point, cornerB, cornerC) / total;
  const weightB = area(cornerA, point, cornerC) / total;
  const weightC = area(cornerA, cornerB, point) / total;
  if (weightA < 0 || weightB < 0 || weightC < 0) {
    return null;
  }
  const height = weightA * cornerA[2] + weightB * cornerB[2] + weightC * cornerC[2] - point[2];
  return height > 0 ? { height, facesUp: total > 0 } : null;
}

// a level's triangles with their bounds, filed under each square of the floor
// plan (x, y) they cover, so a box only has to be checked against those near it
interface BoundedTriangle { triangle: Triangle; bounds: Bounds }
type TriangleGrid = Map<string, BoundedTriangle[]>;

const GRID_SQUARE = 2; // metres

const squareOf = (coordinate: number) => Math.floor(coordinate / GRID_SQUARE);

// the keys of the grid squares that bounds cover, seen from above
function squaresUnder({ min, max }: Bounds): string[] {
  const keys = [];
  for (let i = squareOf(min[0]); i <= squareOf(max[0]); i++) {
    for (let j = squareOf(min[1]); j <= squareOf(max[1]); j++) {
      keys.push(`${i},${j}`);
    }
  }
  return keys;
}

function gridOf(triangles: Triangle[]): TriangleGrid {
  const grid: TriangleGrid = new Map();
  for (const triangle of triangles) {
    const bounded = { triangle, bounds: triangleBounds(triangle) };
    for (const key of squaresUnder(bounded.bounds)) {
      const square = grid.get(key) ?? [];
      square.push(bounded);
      grid.set(key, square);
    }
  }
  return grid;
}

// each level's grid, made the first time its triangles are checked against
const grids = new WeakMap<Triangle[], TriangleGrid>();

function triangleGrid(triangles: Triangle[]): TriangleGrid {
  let grid = grids.get(triangles);
  if (!grid) {
    grid = gridOf(triangles);
    grids.set(triangles, grid);
  }
  return grid;
}

// the triangles in the grid squares under bounds, each once
function trianglesNear(grid: TriangleGrid, bounds: Bounds): BoundedTriangle[] {
  const near = new Set<BoundedTriangle>();
  for (const key of squaresUnder(bounds)) {
    for (const bounded of grid.get(key) ?? []) {
      near.add(bounded);
    }
  }
  return [...near];
}

// the first face straight above point, and how far up it is (null if there's none)
function nearestAbove(point: Vec3, grid: TriangleGrid): UpwardHit | null {
  let nearest: UpwardHit | null = null;
  for (const { triangle } of trianglesNear(grid, { min: point, max: point })) {
    const hit = aboveHit(point, triangle);
    if (hit && (!nearest || hit.height < nearest.height)) {
      nearest = hit;
    }
  }
  return nearest;
}

// whether point is inside a solid: the first face straight above it is seen from behind
// (faces point out of the solids they bound, as blender exports them)
function insideSolid(point: Vec3, grid: TriangleGrid): boolean {
  const nearest = nearestAbove(point, grid);
  return nearest !== null && nearest.facesUp;
}

// how far a point under the ground is below the floor's surface: the first face
// straight above it, if that faces up (so the point is inside the ground). null
// if the point isn't under the ground
export function floorAbove(point: Vec3, triangles: Triangle[]): number | null {
  const nearest = nearestAbove(point, triangleGrid(triangles));
  if (nearest === null || !nearest.facesUp) {
    return null;
  }
  return nearest.height;
}

const middle = (bounds: Bounds): Vec3 => AXIS_INDICES.map((axis) => (bounds.min[axis] + bounds.max[axis]) / 2) as Vec3;

// whether bounds reach into the level: through one of its faces, or wholly inside a solid
function inLevel(bounds: Bounds, grid: TriangleGrid): boolean {
  const throughAFace = trianglesNear(grid, bounds).some(
    ({ triangle, bounds: faceBounds }) => boundsTouch(bounds, faceBounds) && triangleTouchesBox(triangle, bounds.min, bounds.max),
  );
  return throughAFace || insideSolid(middle(bounds), grid);
}

// whether a box from min to max (blender) reaches into the level's triangles: through a face, or inside a solid
export function reachesIntoLevel(min: Vec3, max: Vec3, triangles: Triangle[]): boolean {
  return inLevel({ min, max }, triangleGrid(triangles));
}

// how far straight down from point a triangle is, and whether its front faces up (null if the ray down misses it)
function belowHit(point: Vec3, triangle: Triangle): UpwardHit | null {
  const flipped = (corner: Vec3): Vec3 => [corner[0], corner[1], -corner[2]];
  // seen from above, flipping heights keeps which way round a face is
  return aboveHit(flipped(point), [flipped(triangle[0]), flipped(triangle[1]), flipped(triangle[2])]);
}

// how far below point the floor is: the nearest face straight below it, if that
// faces up. null if there's nothing below, or the nearest face is the underside of something
export function floorBelow(point: Vec3, triangles: Triangle[]): number | null {
  let nearest: UpwardHit | null = null;
  for (const { triangle } of trianglesNear(triangleGrid(triangles), { min: point, max: point })) {
    const hit = belowHit(point, triangle);
    if (hit && (!nearest || hit.height < nearest.height)) {
      nearest = hit;
    }
  }
  return nearest && nearest.facesUp ? nearest.height : null;
}

// the indices of the boxes in a wall (the level's triangles, in blender) or in another box
export function overlappingBoxes(objects: LevelObject[], scale: number, triangles: Triangle[]): Set<number> {
  const grid = triangleGrid(triangles);
  const boxes = objects.flatMap((object, index) =>
    object.kind === "box" ? [{ index, bounds: stackBounds(object, scale) }] : [],
  );
  const flagged = new Set<number>();
  boxes.forEach((box, boxNumber) => {
    if (inLevel(box.bounds, grid)) {
      flagged.add(box.index);
    }
    for (const other of boxes.slice(boxNumber + 1)) {
      if (boundsMeet(box.bounds, other.bounds)) {
        flagged.add(box.index);
        flagged.add(other.index);
      }
    }
  });
  return flagged;
}

const DROP_STEP = 0.01; // metres a box moves down (or up) at a time as it drops to the floor
const FLOOR = 0.5;      // a triangle is floor if its normal points at least this much up

function facesUp([cornerA, cornerB, cornerC]: Triangle): boolean {
  const normal = cross(subtract(cornerB, cornerA), subtract(cornerC, cornerA));
  return normal[2] > FLOOR * Math.sqrt(dot(normal, normal));
}

// the z (blender) a box drops to: lowered a step at a time until it clips the floor
// below it, then raised a step so it doesn't, or raised until it doesn't if it starts
// in the floor. walls are left out. null if there's no floor below it
export function dropToFloor(box: LevelObject, scale: number, triangles: Triangle[]): number | null {
  const column = stackBounds(box, scale);
  column.min[2] = -Infinity;
  column.max[2] = Infinity;
  const floors = triangles.filter((triangle) => facesUp(triangle) && boundsTouch(column, triangleBounds(triangle)));
  if (floors.length === 0) {
    return null;
  }

  const clipsAt = (z: number) => {
    const bounds = stackBounds({ ...box, at: [box.at[0], box.at[1], z] }, scale);
    return floors.some(
      (floor) => boundsTouch(bounds, triangleBounds(floor)) && triangleTouchesBox(floor, bounds.min, bounds.max),
    );
  };
  const floorHeights = floors.flatMap((floor) => floor.map((corner) => corner[2]));
  const lowest = Math.min(...floorHeights) - box.raise - boxSize(scale) * box.stack;
  const highest = Math.max(...floorHeights) - box.raise;
  // the z steps away from where the box is, rounded to the millimetre (+ 0 turns -0 into 0)
  const zAfter = (steps: number) => Math.round((box.at[2] + steps * DROP_STEP) * 1000) / 1000 + 0;

  if (clipsAt(box.at[2])) {
    let steps = 0;
    while (clipsAt(zAfter(steps)) && zAfter(steps) <= highest) {
      steps++;
    }
    return zAfter(steps);
  }
  for (let steps = -1; zAfter(steps) >= lowest; steps--) {
    if (clipsAt(zAfter(steps))) {
      return zAfter(steps + 1);
    }
  }
  return null;
}
