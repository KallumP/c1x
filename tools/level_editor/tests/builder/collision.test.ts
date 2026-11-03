import { describe, expect, test } from "vitest";
import { solidCells, type CellKind } from "../../builder/collision";
import type { Mesh } from "../../builder/obj";
import type { Vec3 } from "../../builder/vectors";
import { floorMesh, meshOf, merged, quadMesh } from "./meshes";

const SIZE: Vec3 = [1024, 2048, 1024];
const cellsOf = (mesh: Mesh) => solidCells(mesh, SIZE, 128);
const positions = (mesh: Mesh) => new Set([...cellsOf(mesh)].map(({ at }) => at.join()));
const kinds = (mesh: Mesh) => new Set([...cellsOf(mesh)].map(({ kind }) => kind));

function positionsOfKind(mesh: Mesh, kind: CellKind, column?: number): Set<string> {
  const matching = [...cellsOf(mesh)].filter((cell) => cell.kind === kind && (column === undefined || cell.at[0] === column));
  return new Set(matching.map(({ at }) => at.join()));
}

// every (i, j, k) of the ones given, as positions
function grid(is: number[], js: number[], ks: number[]): Set<string> {
  return new Set(is.flatMap((i) => js.flatMap((j) => ks.map((k) => [i, j, k].join()))));
}
const upTo = (count: number) => Array.from({ length: count }, (_, index) => index);

describe("collision cells", () => {
  test("a floor is solid just below its top", () => {
    const floor = floorMesh(0, 0, 512, 256, 512);
    expect(positions(floor)).toEqual(grid(upTo(4), [3], upTo(2)));
    expect(kinds(floor)).toEqual(new Set(["floor"]));
  });

  test("a floor off the grid goes to the nearest cell top", () => {
    expect(positions(floorMesh(0, 0, 512, 256, 488))).toEqual(positions(floorMesh(0, 0, 512, 256, 512)));
    expect(positions(floorMesh(0, 0, 512, 256, 600))).toEqual(grid(upTo(4), [4], upTo(2)));
  });

  test("a wall is solid behind its face", () => {
    const wall = quadMesh([[512, 0, 0], [512, 256, 0], [512, 256, 256], [512, 0, 256]]); // facing +x
    expect(positions(wall)).toEqual(grid([3], upTo(2), upTo(2)));
    expect(kinds(wall)).toEqual(new Set(["wall"]));
  });

  test("floor wins where it shares a cell with a wall", () => {
    const wall = quadMesh([[512, 0, 0], [512, 512, 0], [512, 512, 256], [512, 0, 256]]);
    const cells = cellsOf(merged(wall, floorMesh(0, 0, 512, 256, 512)));
    expect(cells.get([3, 3, 0])).toBe("floor");
    expect(cells.get([3, 2, 0])).toBe("wall");
  });

  test("walls hanging in the air are left out", () => {
    // the game blocks crash at any wall cell whose top is above his feet, however
    // high it hangs (PlotNodeWalls in src/solid.c), so a lintel would close a doorway
    const lintel = quadMesh([[512, 1024, 0], [512, 1536, 0], [512, 1536, 256], [512, 1024, 256]]);
    expect(kinds(merged(floorMesh(0, 0, 1024, 256, 512), lintel))).toEqual(new Set(["floor"]));
  });

  test("walls standing on a floor or the zone's bottom are kept", () => {
    const onFloor = quadMesh([[512, 512, 0], [512, 1024, 0], [512, 1024, 256], [512, 512, 256]]);
    const onBottom = quadMesh([[768, 0, 0], [768, 512, 0], [768, 512, 256], [768, 0, 256]]);
    const mesh = merged(floorMesh(0, 0, 512, 256, 512), onFloor, onBottom);
    expect(positionsOfKind(mesh, "wall", 3)).toEqual(grid([3], [4, 5, 6, 7], [0, 1]));
    expect(positionsOfKind(mesh, "wall", 5)).toEqual(grid([5], upTo(4), [0, 1]));
  });

  test("a wall beside a floor's edge with nothing under it is kept", () => {
    const wall = quadMesh([[0, 512, 256], [0, 1024, 256], [1024, 1024, 256], [1024, 512, 256]]); // facing -z
    const mesh = merged(floorMesh(0, 0, 1024, 256, 512), wall);
    expect(positionsOfKind(mesh, "wall")).toEqual(grid(upTo(8), [4, 5, 6, 7], [2]));
  });

  test("ceilings aren't solid", () => {
    // the game never stops a jump at the octree (FindCeilY in src/solid.c)
    const ceiling = quadMesh([[0, 1024, 0], [256, 1024, 0], [256, 1024, 256], [0, 1024, 256]]);
    expect(cellsOf(ceiling).size).toBe(0);
  });

  test("a slope is a staircase", () => {
    const slope = quadMesh([[0, 256, 512], [128, 256, 512], [128, 512, 0], [0, 512, 0]]); // rises along -z
    const cells = positions(slope);
    expect(cells.has("0,3,0")).toBe(true); // top step, under the high end
    expect(cells.has("0,1,3")).toBe(true); // bottom step
    expect(cells.has("0,3,3")).toBe(false);
  });

  test("pit objects are deadly", () => {
    const mesh = merged(floorMesh(0, 0, 256, 256, 256, "Pit.001"), floorMesh(256, 0, 512, 256, 256, "Ground"));
    const cells = cellsOf(mesh);
    expect(cells.get([0, 1, 0])).toBe("pit");
    expect(cells.get([2, 1, 0])).toBe("floor");
  });

  test("pit wins where they share a cell", () => {
    const mesh = merged(floorMesh(0, 0, 256, 256, 256, "Ground"), floorMesh(0, 0, 256, 256, 256, "pit"));
    expect(kinds(mesh)).toEqual(new Set(["pit"]));
  });

  test("cells outside the zone are left out", () => {
    expect(cellsOf(floorMesh(0, 0, 512, 256, 0)).size).toBe(0);
  });

  test("flat triangles are skipped", () => {
    const line = meshOf([[0, 512, 0], [256, 512, 0], [512, 512, 0]], [{ corners: [0, 1, 2], object: null, material: null }]);
    expect(cellsOf(line).size).toBe(0);
  });
});
