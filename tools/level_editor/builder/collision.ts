// collision: the game's collision is an octree of solid cells (see
// octree.ts), so a map's faces are turned into cells
import { cornersOf, facesDown, facesUp, isPit, isSpawn, normal } from "./faces";
import type { Mesh, Triangle } from "./obj";
import { floorDivide } from "./pyMath";
import { subtract, type Vec3 } from "./vectors";

export type CellKind = "floor" | "wall" | "pit";
export type CellPosition = [number, number, number]; // (i, j, k): cells along x, y and z

export interface Cell {
  at: CellPosition;
  kind: CellKind;
}

// solid cells by position, in the order they were first set
export class Cells implements Iterable<Cell> {
  private cells = new Map<string, Cell>();

  get size(): number {
    return this.cells.size;
  }

  get(at: CellPosition): CellKind | undefined {
    return this.cells.get(at.join())?.kind;
  }

  has(at: CellPosition): boolean {
    return this.cells.has(at.join());
  }

  set(at: CellPosition, kind: CellKind): void {
    this.cells.set(at.join(), { at, kind });
  }

  delete(at: CellPosition): void {
    this.cells.delete(at.join());
  }

  [Symbol.iterator](): Iterator<Cell> {
    return this.cells.values();
  }
}

const RANK: Record<CellKind, number> = { wall: 0, floor: 1, pit: 2 }; // which kind a cell is where kinds share it

function faceKind(triangle: Triangle, facing: Vec3): CellKind {
  if (isPit(triangle)) {
    return "pit";
  }
  return facesUp(facing) ? "floor" : "wall";
}

// the longest any side of a triangle runs along an axis
function longestReach(corners: Vec3[]): number {
  const sides = [[corners[0], corners[1]], [corners[1], corners[2]], [corners[2], corners[0]]];
  return Math.max(...sides.map(([p, q]) => Math.max(...subtract(p, q).map(Math.abs))));
}

// the cells just behind a face (with unit normal facing), so its solid side is
// on the cell boundary nearest to it: points across the face at most a quarter
// cell apart, each nudged off the face's edges (which can lie on cell
// boundaries) and half a cell back
function cellsBehind(mesh: Mesh, triangle: Triangle, facing: Vec3, cell: number): CellPosition[] {
  const [a, b, c] = cornersOf(mesh, triangle);
  const centre = [0, 1, 2].map((axis) => (a[axis] + b[axis] + c[axis]) / 3);
  const steps = Math.max(1, Math.trunc(-floorDivide(-longestReach([a, b, c]), cell / 4)));
  const found = new Map<string, CellPosition>();
  for (let u = 0; u <= steps; u++) {
    for (let v = 0; v <= steps - u; v++) {
      const [s, t] = [u / steps, v / steps];
      const at = [0, 1, 2].map((axis) => {
        let point = a[axis] + (b[axis] - a[axis]) * s + (c[axis] - a[axis]) * t;
        point += (centre[axis] - point) / 1000;
        return Math.trunc(floorDivide(point - (facing[axis] * cell) / 2, cell));
      }) as CellPosition;
      found.set(at.join(), at);
    }
  }
  return [...found.values()];
}

const isInside = (at: CellPosition, size: Vec3, cell: number) =>
  at.every((index, axis) => index >= 0 && index < floorDivide(size[axis], cell));

// whether there's a floor or pit in the column under (i, j, k), more than a cell below it
function hasGroundWellBelow(cells: Cells, [i, j, k]: CellPosition): boolean {
  for (let below = 0; below < j - 1; below++) {
    const kind = cells.get([i, below, k]);
    if (kind === "floor" || kind === "pit") {
      return true;
    }
  }
  return false;
}

// walls can't hang over a floor: the game blocks crash at a wall cell whose top
// is above his feet however high it hangs (PlotNodeWalls in src/solid.c), so a
// lintel over a doorway would close it
function removeHangingWalls(cells: Cells): void {
  const lowestFirst = [...cells].sort((first, second) => first.at[1] - second.at[1]);
  for (const { at, kind } of lowestFirst) {
    const [i, j, k] = at;
    const isHanging = kind === "wall" && j > 0 && !cells.has([i, j - 1, k]) && hasGroundWellBelow(cells, at);
    if (isHanging) {
      cells.delete(at);
    }
  }
}

// the cells just behind each face: floor behind faces facing up, pit behind the
// faces of objects named pit..., and wall behind the rest, except faces facing
// down: the game never stops a jump at a ceiling in the octree (see FindCeilY in
// src/solid.c), so crash would jump through it and land on top. pit wins over
// floor, and floor over wall, where they share a cell. cells outside the zone
// (size w, h, d) are left out
export function solidCells(mesh: Mesh, size: Vec3, cell: number): Cells {
  const cells = new Cells();
  for (const triangle of mesh.triangles) {
    const facing = normal(mesh, triangle);
    if (!facing || facesDown(facing) || isSpawn(triangle)) {
      continue;
    }
    const kind = faceKind(triangle, facing);
    for (const at of cellsBehind(mesh, triangle, facing, cell)) {
      if (isInside(at, size, cell) && RANK[kind] >= RANK[cells.get(at) ?? "wall"]) {
        cells.set(at, kind);
      }
    }
  }
  removeHangingWalls(cells);
  return cells;
}

// makes the cells under a flat floor from low to high (x, z) at height y
// solid, as a floor face there would; for floors that aren't part of the map,
// such as the warp pad's base
export function addFloor(cells: Cells, low: [number, number], high: [number, number], y: number, size: Vec3, cell: number): void {
  const [x0, z0] = low;
  const [x1, z1] = high;
  const vertices: Vec3[] = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
  const mesh: Mesh = { vertices, triangles: [], materialLibraries: [] };
  const halves: Triangle[] = [[0, 1, 2], [0, 2, 3]].map((corners) => ({ corners: corners as [number, number, number], object: null, material: null }));
  for (const half of halves) {
    for (const at of cellsBehind(mesh, half, [0, 1, 0], cell)) {
      if (isInside(at, size, cell) && RANK.floor >= RANK[cells.get(at) ?? "wall"]) {
        cells.set(at, "floor");
      }
    }
  }
}
