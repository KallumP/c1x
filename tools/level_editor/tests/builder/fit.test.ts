import { describe, expect, test } from "vitest";
import { Cells } from "../../builder/collision";
import { fit, TooBig, zoneCells, zoneSpans } from "../../builder/fit";
import { toZone } from "../../builder/levelObjects";
import { readObj } from "../../builder/obj";
import type { Vec3 } from "../../builder/vectors";
import { boxMesh } from "./meshes";

const lowest = (vertices: Vec3[]) => [0, 1, 2].map((axis) => Math.min(...vertices.map((vertex) => vertex[axis])));
const highest = (vertices: Vec3[]) => [0, 1, 2].map((axis) => Math.max(...vertices.map((vertex) => vertex[axis])));

describe("fitting a map into a zone", () => {
  test("the mesh moves to the zone's corner", () => {
    const fitted = fit(boxMesh(-1000, -500, 300, 1000, 500, 900), 128, 0);
    expect(lowest(fitted.mesh.vertices)).toEqual([0, 0, 0]);
    expect(highest(fitted.mesh.vertices)).toEqual([2000, 1000, 600]);
    expect(fitted.offset).toEqual([-1000, -500, 300]);
  });

  test("vertices are on multiples of 8", () => {
    const fitted = fit(boxMesh(0.4, 3, 13, 1001, 20.2, 30), 128, 0);
    expect(fitted.mesh.vertices.flat().every((coordinate) => coordinate % 8 === 0)).toBe(true);
    expect(fitted.mesh.vertices[2]).toEqual([1000, 16, 16]);
  });

  test("each side is a power of two cells", () => {
    expect(fit(boxMesh(0, 0, 0, 1000, 140, 5000), 128, 0).size).toEqual([1024, 256, 8192]);
  });

  test("headroom is added above", () => {
    expect(fit(boxMesh(0, 0, 0, 1000, 100, 1000), 128, 1500).size[1]).toBe(2048);
  });

  test("the triangles are kept", () => {
    const mesh = boxMesh(0, 0, 0, 1, 1, 1);
    expect(fit(mesh, 128, 0).mesh.triangles).toBe(mesh.triangles);
  });

  test("margin leaves room around the mesh", () => {
    const fitted = fit(boxMesh(0, 0, 0, 1000, 100, 1000), 128, 0, 128);
    expect(lowest(fitted.mesh.vertices)).toEqual([128, 128, 128]);
    expect(fitted.size).toEqual([2048, 256, 2048]); // 1000 + 2 margins, 100 + 1 margin below
  });

  test("too big for a world mesh is an error", () => {
    // world mesh vertices are 13 bits of multiples of 8 (src/formats/wgeo.h)
    expect(() => fit(boxMesh(0, 0, 0, 40000, 10, 10), 128, 0)).toThrow();
  });

  test("a side is at most 128 cells", () => {
    // the game's octree queries keep a cell's depth in 3 bits (zone_query_result in src/level.h)
    expect(fit(boxMesh(0, 0, 0, 16000, 10, 10), 128, 0).size[0]).toBe(16384);
    const tooBig = () => fit(boxMesh(0, 0, 0, 20000, 10, 10), 128, 0, 128);
    expect(tooBig).toThrow(TooBig);
    expect(tooBig).toThrow(expect.objectContaining({ axis: 0, extent: 20000 + 2 * 128, sideMax: 16384 }));
  });

  test("the route can run on for several zones", () => {
    const fitted = fit(boxMesh(0, 0, 0, 1000, 10, 40000), 128, 0, 128, true);
    expect(fitted.size[2]).toBe(3 * 16384);
    expect(highest(fitted.mesh.vertices)[2]).toBe(40000 + 128);
    expect(() => fit(boxMesh(0, 0, 0, 20000, 10, 40000), 128, 0, 128, true)).toThrow(TooBig);
  });

  test("a short route is one zone", () => {
    expect(fit(boxMesh(0, 0, 0, 1000, 140, 5000), 128, 0, 0, true).size).toEqual([1024, 256, 8192]);
  });

  test("an object lands where a vertex in the .obj at the same place does", () => {
    const obj = "v 1.5 0.25 2\nv -4 0 -8\nv 4 2 8\nf 1 2 3\n"; // the first at blender (1.5, -2, 0.25)
    for (const turn of [0, 90, 180, 270]) {
      const fitted = fit(readObj(obj, 256, turn), 128, 1024, 128, true);
      const at = toZone([1.5, -2, 0.25], 256, turn, fitted.offset);
      fitted.mesh.vertices[0].forEach((coordinate, axis) => {
        expect(Math.abs(coordinate - at[axis])).toBeLessThanOrEqual(4);
      });
    }
  });
});

describe("zones along the route", () => {
  test("a short map is one zone", () => {
    expect(zoneSpans(8192, 128)).toEqual([[0, 8192]]);
  });

  test("a long map is zones of 128 cells, from the route's start", () => {
    // the route runs along -z, so the first zone is the +z end
    expect(zoneSpans(49152, 128)).toEqual([[32768, 49152], [16384, 32768], [0, 16384]]);
  });

  test("a zone's cells are the ones in it, relative to it", () => {
    const cells = new Cells();
    cells.set([1, 2, 0], "floor");
    cells.set([1, 2, 127], "wall");
    cells.set([1, 2, 128], "pit");
    cells.set([3, 0, 172], "floor");
    cells.set([3, 0, 300], "floor");
    expect([...zoneCells(cells, [16384, 32768], 128)]).toEqual([
      { at: [1, 2, 0], kind: "pit" },
      { at: [3, 0, 44], kind: "floor" },
    ]);
    expect([...zoneCells(cells, [0, 16384], 128)]).toEqual([
      { at: [1, 2, 0], kind: "floor" },
      { at: [1, 2, 127], kind: "wall" },
    ]);
  });
});
