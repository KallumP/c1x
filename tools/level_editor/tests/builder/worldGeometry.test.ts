import { describe, expect, test } from "vitest";
import { ByteWriter } from "../../builder/bytes";
import { stringToEid } from "../../builder/entryIds";
import { pathBytes, type PathLink } from "../../builder/paths";
import { readWorldPolygon, readWorldVertex, worldHeaderBytes, worldPolygonBytes, worldVertexBytes } from "../../builder/worldGeometry";

// (x, y, z, r, g, b) the way SwTransformWorlds reads a wgeo vertex
function decodeVertex(data: Buffer): number[] {
  const signed = (value: number, bits: number) => (value & (1 << (bits - 1)) ? value - (1 << bits) : value);
  const [r, g, b, z8] = [data[0], data[1], data[2], data[3]];
  const [h0, h1] = [data.readUInt16LE(4), data.readUInt16LE(6)];
  const z = z8 + (((h0 >> 1) & 3) << 8) + (signed(h1 & 7, 3) << 10);
  return [signed(h0 >> 3, 13) * 8, signed(h1 >> 3, 13) * 8, z * 8, r, g, b];
}

describe("world mesh geometry", () => {
  test("a vertex round trips", () => {
    for (const at of [[0, 0, 0], [4088, -800, 8184], [-32768, 32760, -8192]]) {
      const data = worldVertexBytes({ at: at as [number, number, number], colour: [1, 2, 3] });
      expect(decodeVertex(data)).toEqual([...at, 1, 2, 3]);
      expect(readWorldVertex(data)).toEqual({ at, colour: [1, 2, 3] });
    }
  });

  test("a polygon round trips", () => {
    const data = worldPolygonBytes({ corners: [1, 2, 4095], texinfo: 593, page: 3 });
    expect(readWorldPolygon(data)).toEqual({ corners: [1, 2, 4095], texinfo: 593, page: 3 });
  });

  test("a header keeps the template's textures", () => {
    const template = new ByteWriter().s32(1).s32(2).s32(3).u32(99).u32(99).u32(2).u32(1).u32(0)
      .u32(stringToEid("Ju89T")).u32(0).u32(0).u32(0).u32(0).u32(0).u32(0).u32(0)
      .bytes(Buffer.from("TEX!TEX?", "latin1")).toBuffer();
    const header = worldHeaderBytes(template, [10, 20, 30], 4, 5);
    const fields = [0, 4, 8].map((offset) => header.readInt32LE(offset))
      .concat([12, 16, 20, 24, 28].map((offset) => header.readUInt32LE(offset)));
    expect(fields).toEqual([10, 20, 30, 4, 5, 2, 1, 0]);
    expect(header.subarray(32).equals(template.subarray(32))).toBe(true);
  });

  test("a header adds texture pages in its free slots, and texinfos after its own", () => {
    const template = new ByteWriter().s32(0).s32(0).s32(0).u32(0).u32(0).u32(2).u32(1).u32(0)
      .u32(111).u32(0).u32(0).u32(0).u32(0).u32(0).u32(0).u32(0).bytes(Buffer.alloc(8, 0xaa)).toBuffer();
    const header = worldHeaderBytes(template, [0, 0, 0], 1, 1, [222, 333], Buffer.alloc(16, 0xbb));
    expect([header.readUInt32LE(20), header.readUInt32LE(24)]).toEqual([2 + 4, 1 + 2]);
    expect([32, 36, 40, 44].map((offset) => header.readUInt32LE(offset))).toEqual([111, 222, 333, 0]);
    expect(header.subarray(64).equals(Buffer.concat([Buffer.alloc(8, 0xaa), Buffer.alloc(16, 0xbb)]))).toBe(true);
  });
});

describe("camera paths", () => {
  test("a path links to the paths either side", () => {
    // as on n. sanity beach: (relation, neighbour zone index, path index, goal); relation 1 the
    // path before, arriving at its end (goal 2), relation 2 the path after, arriving at its start (goal 1)
    const links: PathLink[] = [[1, 1, 0, 2], [2, 2, 0, 1]];
    const path = pathBytes({ slst: 0, points: [[0, 0, 0, 0, 0, 0]], camMode: 5, zoom: 1700, averageNodeDistance: 128, links });
    expect(path.readUInt32LE(8)).toBe(2);
    expect([0, 1].map((index) => [...path.subarray(12 + 4 * index, 16 + 4 * index)])).toEqual(links);
    expect(path.readUInt16LE(30)).toBe(1); // the rest is where it was
  });

  test("a path without neighbours", () => {
    const points: [number, number, number, number, number, number][] = [[10, 20, 30, 0, 0, 0], [40, 50, 60, 0, 0, 0]];
    const slst = stringToEid("Flr0S");
    const path = pathBytes({ slst, points, camMode: 5, zoom: 1700, averageNodeDistance: 400 });
    expect([path.readUInt32LE(0), path.readUInt32LE(4), path.readUInt32LE(8)]).toEqual([slst, 0, 0]);
    expect(path.readUInt16LE(30)).toBe(2); // length
    expect(path.readUInt16LE(32)).toBe(5); // cam mode
    const readPoint = (index: number) => Array.from({ length: 6 }, (_, field) => path.readInt16LE(50 + 12 * index + 2 * field));
    expect([readPoint(0), readPoint(1)]).toEqual(points);
    expect(path.length % 4).toBe(0);
    expect(path.readUInt16LE(38)).toBe(0); // no follow camera height
  });

  test("a follow camera path keeps the camera's height above crash's floor", () => {
    // in its first spare field, for the game
    const path = pathBytes({ slst: 0, points: [[0, 0, 0, 0, 0, 0]], camMode: 9, zoom: 1700, averageNodeDistance: 128, followHeight: 2632 });
    expect(path.readUInt16LE(38)).toBe(2632);
  });
});
