// end caps for the model of an open tube, such as toxic waste's barrels (along
// x), which the game only ever shows rolling straight at the camera, so they
// have no ends, or sunset vista's slabs (along z), open at the end in its walls:
// a fan of triangles over the ring of vertices at an end, wound as the model's
// sides are (so the game culls them as it does the sides), with the sides' texture
import type { Entry } from "./levelFiles";

type Point = [number, number, number];

// which ends of a tube along which axis (0 x, 1 y, 2 z) to cap
export interface CapEnds {
  axis: number;
  ends: "low" | "high" | "both";
}
const TUBE_ENDS: CapEnds = { axis: 0, ends: "both" };

const VERTEX_BYTES = 6;     // an animation frame's vertex: x, y, z, then its normal
const FRAME_HEADER = 56;    // where a frame's vertices start
const POLYGON_BYTES = 8;    // a model's polygon: three vertex offsets, then its texinfo field
const POLYGON_TEXINFO = 6;
const HEADER = 0;           // a model's items: its header (poly count first), then its polygons
const POLYGONS = 1;

const minus = (first: Point, second: Point): Point => [first[0] - second[0], first[1] - second[1], first[2] - second[2]];
const dot = (first: Point, second: Point) => first[0] * second[0] + first[1] * second[1] + first[2] * second[2];
const cross = (first: Point, second: Point): Point =>
  [first[1] * second[2] - first[2] * second[1], first[2] * second[0] - first[0] * second[2], first[0] * second[1] - first[1] * second[0]];

// a frame's vertices (their place relative to the frame's origin is all that matters here)
function framePoints(frame: Buffer): Point[] {
  const count = Math.floor((frame.length - FRAME_HEADER) / VERTEX_BYTES);
  return Array.from({ length: count }, (_, index) =>
    [0, 1, 2].map((axis) => frame.readUInt8(FRAME_HEADER + index * VERTEX_BYTES + axis)) as Point);
}

function centreOf(points: Point[]): Point {
  return [0, 1, 2].map((axis) => points.reduce((sum, point) => sum + point[axis], 0) / points.length) as Point;
}

// a model's polygons' corners, as vertex indices
function polygonCorners(model: Entry): number[][] {
  const polygons = model.items[POLYGONS];
  return Array.from({ length: polygons.length / POLYGON_BYTES }, (_, index) =>
    [0, 1, 2].map((corner) => polygons.readUInt16LE(index * POLYGON_BYTES + 2 * corner) / VERTEX_BYTES));
}

// which way a triangle's corners turn seen from outside the shape (centre its middle): 1 or -1
function windingFromOutside(corners: number[], points: Point[], centre: Point): number {
  const [first, second, third] = corners.map((corner) => points[corner]);
  const normal = cross(minus(second, first), minus(third, first));
  const outward = minus(centreOf([first, second, third]), centre);
  return Math.sign(dot(normal, outward));
}

// the vertices at one end of the tube (where its axis is at), in order round its axis
function endRing(points: Point[], axis: number, at: number): number[] {
  const ring = points.flatMap((point, index) => (point[axis] === at ? [index] : []));
  const middle = centreOf(ring.map((index) => points[index]));
  const [across, up] = [0, 1, 2].filter((other) => other !== axis);
  const angle = (index: number) => Math.atan2(points[index][up] - middle[up], points[index][across] - middle[across]);
  return ring.sort((first, second) => angle(first) - angle(second));
}

// where along its axis the ends to cap are
function capAts(points: Point[], { axis, ends }: CapEnds): number[] {
  const along = points.map((point) => point[axis]);
  const [low, high] = [Math.min(...along), Math.max(...along)];
  if (ends === "low") {
    return [low];
  }
  if (ends === "high") {
    return [high];
  }
  return [low, high];
}

// a fan of triangles over a ring of vertices, each turning winding seen from outside
function capFan(ring: number[], points: Point[], centre: Point, winding: number): number[][] {
  return ring.slice(1, -1).map((corner, index) => {
    const triangle = [ring[0], corner, ring[index + 2]];
    if (windingFromOutside(triangle, points, centre) === winding) {
      return triangle;
    }
    return [triangle[0], triangle[2], triangle[1]];
  });
}

function polygonBytes(corners: number[], texinfo: number): Buffer {
  const polygon = Buffer.alloc(POLYGON_BYTES);
  corners.forEach((corner, at) => polygon.writeUInt16LE(corner * VERTEX_BYTES, 2 * at));
  polygon.writeUInt16LE(texinfo, POLYGON_TEXINFO);
  return polygon;
}

// the model (an open tube, its vertices as frame has them) with a cap over its
// ends (both ends along x without), wound as its first polygon (a side) is, with its texture
export function withEndCaps(model: Entry, frame: Buffer, ends: CapEnds = TUBE_ENDS): Entry {
  const points = framePoints(frame);
  const centre = centreOf(points);
  const winding = windingFromOutside(polygonCorners(model)[0], points, centre);
  const caps = capAts(points, ends).flatMap((at) => capFan(endRing(points, ends.axis, at), points, centre, winding));
  const texinfo = model.items[POLYGONS].readUInt16LE(POLYGON_TEXINFO);
  const header = Buffer.from(model.items[HEADER]);
  header.writeUInt32LE(header.readUInt32LE(0) + caps.length, 0);
  const polygons = Buffer.concat([model.items[POLYGONS], ...caps.map((corners) => polygonBytes(corners, texinfo))]);
  return { ...model, items: model.items.map((item, index) => [header, polygons][index] ?? item) };
}
