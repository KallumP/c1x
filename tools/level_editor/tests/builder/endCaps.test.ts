import { describe, expect, test } from "vitest";
import { withEndCaps } from "../../builder/endCaps";
import type { Entry } from "../../builder/levelFiles";

type Point = [number, number, number];

const VERTEX_BYTES = 6;
const FRAME_HEADER = 56;
const POLYGON_BYTES = 8;
const SIDE_TEXINFO = 3; // the sides' texinfo field: a word offset into the model's texinfos

// an open square tube along x, 10 long: four corners round each end
const LEFT: Point[] = [[0, 0, 0], [0, 10, 0], [0, 10, 10], [0, 0, 10]];
const RIGHT: Point[] = LEFT.map(([, y, z]): Point => [10, y, z]);
const TUBE: Point[] = [...LEFT, ...RIGHT]; // vertices 0-3 the left end, 4-7 the right

// an animation frame with the tube's vertices
function tubeFrame(): Buffer {
  const frame = Buffer.alloc(FRAME_HEADER + TUBE.length * VERTEX_BYTES);
  TUBE.forEach((point, index) => point.forEach((value, axis) => frame.writeUInt8(value, FRAME_HEADER + index * VERTEX_BYTES + axis)));
  return frame;
}

// the tube's four sides, two triangles each, wound (outward) the way the game's are, or the other way
function tubeSides(outwardWinding: boolean): [number, number, number][] {
  return [0, 1, 2, 3].flatMap((side) => {
    const [a, b] = [side, (side + 1) % 4];
    const quad: [number, number, number][] = [[a, b, b + 4], [a, b + 4, a + 4]];
    return quad.map(([p, q, r]): [number, number, number] => (outwardWinding ? [p, q, r] : [p, r, q]));
  });
}

// a model with polygons (vertex indices), a header of poly count, scale and texinfos
function tubeModel(polygons: [number, number, number][]): Entry {
  const header = Buffer.alloc(20 + 2 * 12);
  header.writeUInt32LE(polygons.length, 0);
  [4, 8, 12].forEach((at) => header.writeInt32LE(4800, at));
  header.writeUInt32LE(6, 16);
  const items = Buffer.alloc(polygons.length * POLYGON_BYTES);
  polygons.forEach((corners, index) => {
    corners.forEach((corner, at) => items.writeUInt16LE(corner * VERTEX_BYTES, index * POLYGON_BYTES + 2 * at));
    items.writeUInt16LE(SIDE_TEXINFO, index * POLYGON_BYTES + 6);
  });
  return { eid: 1, type: 2, items: [header, items] };
}

// a model's polygons as vertex indices
const polygonsOf = (model: Entry) => Array.from({ length: model.items[1].length / POLYGON_BYTES }, (_, index) =>
  [0, 1, 2].map((at) => model.items[1].readUInt16LE(index * POLYGON_BYTES + 2 * at) / VERTEX_BYTES));

// which way a triangle's corners turn, seen from outside the tube: +1 or -1
function windingFromOutside(corners: number[]): number {
  const [p, q, r] = corners.map((corner) => TUBE[corner]);
  const centre = [5, 5, 5];
  const cross = [
    (q[1] - p[1]) * (r[2] - p[2]) - (q[2] - p[2]) * (r[1] - p[1]),
    (q[2] - p[2]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[2] - p[2]),
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]),
  ];
  const outward = [0, 1, 2].map((axis) => (p[axis] + q[axis] + r[axis]) / 3 - centre[axis]);
  return Math.sign(cross[0] * outward[0] + cross[1] * outward[1] + cross[2] * outward[2]);
}

describe("end caps on an open tube's model", () => {
  const capped = (outwardWinding = true) => withEndCaps(tubeModel(tubeSides(outwardWinding)), tubeFrame());
  const caps = (outwardWinding = true) => polygonsOf(capped(outwardWinding)).slice(8);

  test("each end gets a fan of triangles over its ring of vertices: two for a square", () => {
    expect(capped().items[0].readUInt32LE(0)).toBe(8 + 4);
    expect(caps().length).toBe(4);
  });

  test("each cap triangle's corners are on one end", () => {
    const onLeft = (corner: number) => corner < 4;
    caps().forEach((corners) => expect(new Set(corners.map(onLeft)).size).toBe(1));
    expect(caps().filter((corners) => onLeft(corners[0])).length).toBe(2);
  });

  test.each([true, false])("the caps are wound as the sides are (sides wound outward: %s)", (outwardWinding) => {
    const sideWinding = windingFromOutside(tubeSides(outwardWinding)[0]);
    caps(outwardWinding).forEach((corners) => expect(windingFromOutside(corners)).toBe(sideWinding));
  });

  test("the caps take the sides' texinfo", () => {
    const model = capped();
    [8, 9, 10, 11].forEach((index) => expect(model.items[1].readUInt16LE(index * POLYGON_BYTES + 6)).toBe(SIDE_TEXINFO));
  });

  test("the rest of the model is as it was", () => {
    const [original, model] = [tubeModel(tubeSides(true)), capped()];
    expect(model.items[0].subarray(4)).toEqual(original.items[0].subarray(4));
    expect(model.items[1].subarray(0, original.items[1].length)).toEqual(original.items[1]);
  });
});
