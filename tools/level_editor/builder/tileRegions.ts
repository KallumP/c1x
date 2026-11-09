// the part of a material's tile on a polygon: the region (pixels of the tile)
// and the corner layout (LAYOUTS) putting its corners on the polygon's
import { floorDivide } from "./pyMath";
import { LAYOUTS, SIZES, TILE, type Region } from "./tpage";
import type { Vec3 } from "./vectors";

export interface RegionOnTile extends Region {
  layout: number; // an index into LAYOUTS
}

// the axis (0 x, 1 y, 2 z) a face with normal facing faces most along (the first, where they tie)
function mainAxis(facing: Vec3): number {
  let main = 0;
  for (let axis = 1; axis < 3; axis++) {
    if (Math.abs(facing[axis]) > Math.abs(facing[main])) {
      main = axis;
    }
  }
  return main;
}

// (u, v) of a point on a face with normal facing, along the two axes across the
// axis it faces most: x and z for floors, and z or x and y for walls, with v
// down so the top of an image is up
function planeCoordinates(point: Vec3, facing: Vec3): [number, number] {
  const axis = mainAxis(facing);
  if (axis === 1) {
    return [point[0], point[2]];
  }
  return [axis === 0 ? point[2] : point[0], -point[1] + 0];
}

// (start, size) of the smallest region a side of a tile can have (SIZES,
// starting on a multiple of its size and of step) that covers low..high
function alignedSpan(low: number, high: number, step: number): [number, number] {
  for (const size of SIZES) {
    const start = Math.min(Math.trunc(floorDivide(low, size)) * size, TILE - size); // inside the tile, even on its far edge
    if (size >= step && start + size >= high - 1e-6) {
      return [start, size];
    }
  }
  return [0, TILE];
}

// the tile's pixel under each point: the tile repeats every repeat units, from
// the repeat the points' middle is in
function pixelsOnTile(planePoints: [number, number][], repeat: number): [number, number][] {
  const repeatAt = [0, 1].map((axis) =>
    Math.trunc(floorDivide(planePoints.reduce((sum, point) => sum + point[axis], 0) / 3, repeat)));
  const toPixel = (coordinate: number, axis: number) =>
    Math.min(Math.max(((coordinate - repeatAt[axis] * repeat) * TILE) / repeat, 0), TILE);
  return planePoints.map((point) => [toPixel(point[0], 0), toPixel(point[1], 1)]);
}

// how far the points (as fractions of the region) are from a layout's corners
function layoutMiss(relative: [number, number][], layout: number): number {
  return relative.reduce((sum, [u, v], corner) => {
    const [cornerU, cornerV] = LAYOUTS[layout][corner];
    const [du, dv] = [u - cornerU, v - cornerV];
    return sum + (du * du + dv * dv); // added up as the python did, for the same rounding
  }, 0);
}

function nearestLayout(relative: [number, number][]): number {
  let best = 0;
  for (let layout = 1; layout < LAYOUTS.length; layout++) {
    if (layoutMiss(relative, layout) < layoutMiss(relative, best)) {
      best = layout;
    }
  }
  return best;
}

// the region of the tile under a triangle (points in zone units) on a face with
// normal facing, the tile repeating every repeat units across the face, and the
// layout whose corners are nearest its points
export function tileRegion(points: Vec3[], facing: Vec3, repeat: number): RegionOnTile {
  return regionUnder(pixelsOnTile(points.map((point) => planeCoordinates(point, facing)), repeat));
}

const onTile = (coordinate: number) => Math.min(Math.max(coordinate * TILE, 0), TILE);

// the region of the tile under a triangle with texture coordinates uvs (.obj's:
// 0 to 1 across the image, v up), and the layout whose corners are nearest them
export function uvTileRegion(uvs: [number, number][]): RegionOnTile {
  return regionUnder(uvs.map(([u, v]) => [onTile(u), onTile(1 - v)] as [number, number]));
}

// the smallest region the game can address around a triangle's pixels on the
// tile, and the layout whose corners are nearest them
function regionUnder(pixels: [number, number][]): RegionOnTile {
  const us = pixels.map(([u]) => u);
  const vs = pixels.map(([, v]) => v);
  const [x, w] = alignedSpan(Math.min(...us), Math.max(...us), 8); // 4 bit textures step 8 across
  const [y, h] = alignedSpan(Math.min(...vs), Math.max(...vs), 4);
  const relative = pixels.map(([u, v]) => [(u - x) / w, (v - y) / h] as [number, number]);
  return { x, y, w, h, layout: nearestLayout(relative) };
}
