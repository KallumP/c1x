import { describe, expect, test } from "vitest";
import { ByteWriter } from "../../builder/bytes";
import { stringToEid } from "../../builder/entryIds";
import { pathBytes, type PathLink, type PathPoint } from "../../builder/paths";
import {
  readWorldHeader, readWorldPolygon, readWorldVertex, TEXINFOS_AT, WGEO_PAGES, worldHeaderBytes, worldPolygonBytes, worldVertexBytes,
} from "../../builder/worldGeometry";
import { readCameraPath } from "./zoneReaders";

// a mesh header to build on: an origin and counts a header replaces, then its texture
// pages in their slots and texinfos, which it keeps
function headerTemplate(pages: number[], texinfos: Buffer): Buffer {
  const writer = new ByteWriter().s32(1).s32(2).s32(3).u32(99).u32(99).u32(texinfos.length / 4).u32(pages.length).u32(0);
  for (let slot = 0; slot < WGEO_PAGES; slot++) {
    writer.u32(pages[slot] ?? 0);
  }
  return writer.bytes(texinfos).toBuffer();
}

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
    const template = headerTemplate([stringToEid("Ju89T")], Buffer.from("TEX!TEX?", "latin1"));
    const header = worldHeaderBytes(template, [10, 20, 30], 4, 5);
    expect(readWorldHeader(header)).toEqual({
      origin: [10, 20, 30], polygonCount: 4, vertexCount: 5, texinfoWords: 2, pageCount: 1, isBackdrop: 0, pages: readWorldHeader(template).pages,
    });
    expect(header.subarray(TEXINFOS_AT).equals(template.subarray(TEXINFOS_AT))).toBe(true);
  });

  test("a header adds texture pages in its free slots, and texinfos after its own", () => {
    const ownTexinfos = Buffer.alloc(8, 0xaa);
    const moreTexinfos = Buffer.alloc(16, 0xbb);
    const header = worldHeaderBytes(headerTemplate([111], ownTexinfos), [0, 0, 0], 1, 1, [222, 333], moreTexinfos);
    const { texinfoWords, pageCount, pages } = readWorldHeader(header);
    expect(texinfoWords).toBe((ownTexinfos.length + moreTexinfos.length) / 4);
    expect(pageCount).toBe(3); // its own one and the two added
    expect(pages.slice(0, 4)).toEqual([111, 222, 333, 0]);
    expect(header.subarray(TEXINFOS_AT).equals(Buffer.concat([ownTexinfos, moreTexinfos]))).toBe(true);
  });
});

describe("camera paths", () => {
  test("a path links to the paths either side", () => {
    // as on n. sanity beach: (relation, neighbour zone index, path index, goal); relation 1 the
    // path before, arriving at its end (goal 2), relation 2 the path after, arriving at its start (goal 1)
    const links: PathLink[] = [[1, 1, 0, 2], [2, 2, 0, 1]];
    const path = pathBytes({ slst: 0, points: [[0, 0, 0, 0, 0, 0]], camMode: 5, zoom: 1700, averageNodeDistance: 128, links });
    const fields = readCameraPath(path);
    expect(fields.links).toEqual(links);
    expect(fields.length).toBe(1); // the fields after the links are where they belong
  });

  test("a path without neighbours keeps its sort list, mode and points", () => {
    const points: PathPoint[] = [[10, 20, 30, 0, 0, 0], [40, 50, 60, 0, 0, 0]];
    const slst = stringToEid("Flr0S");
    const path = pathBytes({ slst, points, camMode: 5, zoom: 1700, averageNodeDistance: 400 });
    expect(readCameraPath(path)).toEqual({ slst, links: [], length: 2, camMode: 5, zoom: 1700, followHeight: 0, points });
    expect(path.readUInt32LE(4)).toBe(0); // its second word, unused
    expect(path.length % 4).toBe(0);
  });

  test("a follow camera path keeps the camera's height above crash's floor", () => {
    // in its first spare field, for the game
    const path = pathBytes({ slst: 0, points: [[0, 0, 0, 0, 0, 0]], camMode: 9, zoom: 1700, averageNodeDistance: 128, followHeight: 2632 });
    expect(readCameraPath(path).followHeight).toBe(2632);
  });
});
