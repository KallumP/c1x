// fitting a map into the game's zones: moved to the zone's corner on the
// vertex grid, each side a power of two cells, and a long route split into zones
import { Cells } from "./collision";
import type { Mesh } from "./obj";
import { floorDivide, roundHalfToEven } from "./pyMath";
import type { Vec3 } from "./vectors";

export const VERTEX_MAX = 32760;  // world mesh vertices are 13 bits of multiples of 8 (src/formats/wgeo.h)
export const SIDE_CELLS_MAX = 128; // the game's octree queries keep a cell's depth in 3 bits (zone_query_result
                                   // in src/level.h), so a side halves 7 times at most (as in the game's levels)
const AXES = "xyz";
const UP = 1;
const ROUTE = 2; // z, which the route runs along

// a map longer along axis than a zone side can be: extent zone units, fixed of
// them margin or headroom, which don't scale
export class TooBig extends Error {
  constructor(public axis: number, public extent: number, public sideMax: number, public fixed = 0) {
    super(`the map is ${extent} zone units along ${AXES[axis]}, more than a zone's ${sideMax}`);
  }
}

// a mesh moved into a zone: vertices in zone units relative to the zone (on
// multiples of 8), the zone's size, and the offset the mesh was moved by
export interface Fit {
  mesh: Mesh;
  size: Vec3;
  offset: Vec3;
}

export type Span = [number, number]; // a zone's (z0, z1) along the route

const lowestAlong = (vertices: Vec3[], axis: number) => vertices.reduce((low, vertex) => Math.min(low, vertex[axis]), Infinity);
const highestAlong = (vertices: Vec3[], axis: number) => vertices.reduce((high, vertex) => Math.max(high, vertex[axis]), -Infinity);

const snapToVertexGrid = (coordinate: number) => roundHalfToEven(coordinate / 8) * 8;

interface SideRoom {
  cell: number;
  headroom: number;
  margin: number;
  longZ: boolean;
}

// a zone's side along axis for a map extent long: a power of two cells with the
// room it needs, or along a long route whole zones of SIDE_CELLS_MAX cells
function zoneSide(axis: number, extent: number, { cell, headroom, margin, longZ }: SideRoom): number {
  const zoneMax = cell * SIDE_CELLS_MAX;
  const isLongRoute = longZ && axis === ROUTE && extent + margin > zoneMax;
  if (extent > VERTEX_MAX && !isLongRoute) { // a long route's meshes are each relative to their zone
    throw new Error(`the map is ${extent} zone units along ${AXES[axis]}, more than ${VERTEX_MAX}; scale it down`);
  }
  if (isLongRoute) {
    return -floorDivide(-(extent + margin), zoneMax) * zoneMax;
  }
  const room = extent + (axis === UP ? headroom : margin);
  let side = cell;
  while (side < room) {
    side *= 2;
  }
  if (side > zoneMax) {
    const fixed = axis === UP ? headroom + margin : 2 * margin; // margin below too, and on both ends
    throw new TooBig(axis, room, zoneMax, fixed);
  }
  return side;
}

// mesh moved so its lowest corner is margin (zone units) in from the zone's,
// with each side of the zone a power of two cells, margin to spare along x and
// z, and headroom above it. a side is at most SIDE_CELLS_MAX cells (TooBig);
// with longZ, z (the route) can run on for whole zones of that (zoneSpans)
export function fit(mesh: Mesh, cell: number, headroom: number, margin = 0, longZ = false): Fit {
  const offset = [0, 1, 2].map((axis) => lowestAlong(mesh.vertices, axis) - margin) as Vec3;
  const vertices = mesh.vertices.map((vertex) => vertex.map((coordinate, axis) => snapToVertexGrid(coordinate - offset[axis])) as Vec3);
  const room = { cell, headroom, margin, longZ };
  const size = [0, 1, 2].map((axis) => zoneSide(axis, highestAlong(vertices, axis), room)) as Vec3;
  return { mesh: { ...mesh, vertices }, size, offset };
}

// the zones a fitted map depth long along z is split into, SIDE_CELLS_MAX cells
// each, from the route's start (the +z end)
export function zoneSpans(depth: number, cell: number): Span[] {
  const zone = Math.min(depth, cell * SIDE_CELLS_MAX);
  const spans: Span[] = [];
  for (let z = depth - zone; z > -1; z -= zone) {
    spans.push([z, z + zone]);
  }
  return spans;
}

// the cells in a zone span, relative to the zone
export function zoneCells(cells: Cells, span: Span, cell: number): Cells {
  const [first, end] = span.map((z) => floorDivide(z, cell));
  const inZone = new Cells();
  for (const { at: [i, j, k], kind } of cells) {
    if (k >= first && k < end) {
      inZone.set([i, j, k - first], kind);
    }
  }
  return inZone;
}
