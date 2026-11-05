import { describe, expect, test } from "vitest";
import { addFaces, addFloor, solidCells, type CellKind } from "../../builder/collision";
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

  test("a floor can be added where the map has none, solid as a floor face there would be", () => {
    // for the warp pad's base, which isn't part of the map but has to be stood on
    const cells = cellsOf(floorMesh(0, 0, 512, 256, 0));
    addFloor(cells, [128, 0], [384, 256], 600, SIZE, 128);
    const added = positionsOfKind(floorMesh(128, 0, 384, 256, 600), "floor");
    expect(added.size).toBeGreaterThan(0);
    for (const at of added) {
      expect(cells.get(at.split(",").map(Number) as [number, number, number])).toBe("floor");
    }
  });

  test("faces can be added where the map has none, solid as they would be in the map", () => {
    // for a rolling stone's track, which isn't part of the map but has to be stood in and walked into
    const cells = cellsOf(floorMesh(0, 0, 512, 256, 256));
    const raised = floorMesh(128, 0, 384, 256, 600);
    const wall = quadMesh([[512, 768, 0], [512, 1024, 0], [512, 1024, 256], [512, 768, 256]]); // facing +x, clear of the floors
    addFaces(cells, merged(raised, wall), SIZE, 128);
    for (const [mesh, kind] of [[raised, "floor"], [wall, "wall"]] as const) {
      for (const at of positionsOfKind(mesh, kind)) {
        expect(cells.get(at.split(",").map(Number) as [number, number, number])).toBe(kind);
      }
    }
    expect(positionsOfKind(floorMesh(0, 0, 512, 256, 256), "floor").size).toBeGreaterThan(0);
    for (const at of positionsOfKind(floorMesh(0, 0, 512, 256, 256), "floor")) {
      expect(cells.get(at.split(",").map(Number) as [number, number, number])).toBe("floor"); // the map's own stay
    }
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

  test("a wall's top goes to the nearest cell top, like a floor's", () => {
    // a bank 20 units above the water: its wall would otherwise fill the whole cell above, 128 units
    // over the floor beside it, which crash can't step over (more than 50 up, PlotQueryWalls in src/solid.c)
    const bank = quadMesh([[512, 0, 0], [512, 276, 0], [512, 276, 256], [512, 0, 256]]); // top 20 into the third cell
    expect(positions(bank)).toEqual(grid([3], upTo(2), upTo(2)));
    const higher = quadMesh([[512, 0, 0], [512, 330, 0], [512, 330, 256], [512, 0, 256]]); // past the third cell's middle
    expect(positions(higher)).toEqual(grid([3], upTo(3), upTo(2)));
  });

  test("a bank's wall is no higher than the floor beside it", () => {
    const sand = floorMesh(0, 0, 512, 256, 276);
    const bank = quadMesh([[512, 0, 0], [512, 276, 0], [512, 276, 256], [512, 0, 256]]);
    const cells = cellsOf(merged(sand, bank));
    const top = (kind: CellKind) => Math.max(...[...cells].filter((cell) => cell.kind === kind).map(({ at }) => at[1]));
    expect(top("wall")).toBeLessThanOrEqual(top("floor"));
  });

  test("a wall one cell over the floor beside it is a lip crash steps onto, not a wall", () => {
    // sand at 250 rounds to the cell top at 256, a bank wall to 330 rounds to 384: 20 cm apart in
    // the map, a cell apart in the octree. crash can step up a floor cell (land_offset, about 244)
    const sand = floorMesh(0, 0, 512, 256, 250);
    const bank = quadMesh([[512, 0, 0], [512, 330, 0], [512, 330, 256], [512, 0, 256]]);
    const cells = cellsOf(merged(sand, bank));
    expect(cells.get([3, 2, 0])).toBe("floor");
    expect(cells.get([3, 0, 0])).toBe("wall"); // the bank's cells under the sand stay wall
  });

  test("a wall more than a cell over the floor beside it stays a wall", () => {
    const sand = floorMesh(0, 0, 512, 256, 250);
    const wall = quadMesh([[512, 0, 0], [512, 600, 0], [512, 600, 256], [512, 0, 256]]);
    const cells = cellsOf(merged(sand, wall));
    expect(cells.get([3, 4, 0])).toBe("wall");
    expect(cells.get([3, 2, 0])).toBe("wall");
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
