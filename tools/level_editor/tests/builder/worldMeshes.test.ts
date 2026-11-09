import { describe, expect, test } from "vitest";
import { normal } from "../../builder/faces";
import type { Mesh } from "../../builder/obj";
import { floorDivide } from "../../builder/pyMath";
import { tileRegion, uvTileRegion } from "../../builder/tileRegions";
import { LAYOUTS } from "../../builder/tpage";
import { cross, subtract, type Vec3 } from "../../builder/vectors";
import {
  isTileRegion, WGEO_ITEMS_MAX, worldMeshes, type PageTexture, type WorldMesh, type WorldPolygon,
} from "../../builder/worldMeshes";
import { floorMesh, meshOf, merged, quadMesh } from "./meshes";

const GROUND: PageTexture = { texinfo: 5, page: 1 };
const SIDE: PageTexture = { texinfo: 9, page: 2 };

const worldsOf = (mesh: Mesh, piece = 256) => worldMeshes(mesh, { piece, ground: GROUND, side: SIDE });

const cornersOf = ({ vertices }: WorldMesh, polygon: WorldPolygon) => polygon.corners.map((index) => vertices[index].at);

function area(world: WorldMesh, polygon: WorldPolygon): number {
  const [a, b, c] = cornersOf(world, polygon);
  const [x, y, z] = cross(subtract(b, a), subtract(c, a));
  return Math.sqrt(x * x + y * y + z * z) / 2;
}
const totalArea = (world: WorldMesh) => world.polygons.reduce((sum, polygon) => sum + area(world, polygon), 0);

// whether a polygon's corners are all within one slice of size along axis
function isInOneSlice(world: WorldMesh, polygon: WorldPolygon, axis: number, size: number): boolean {
  const coordinates = cornersOf(world, polygon).map((corner) => corner[axis]);
  return floorDivide(Math.min(...coordinates), size) === floorDivide(Math.max(...coordinates) - 1, size);
}

const WALL = quadMesh([[0, 0, 512], [1024, 0, 512], [1024, 768, 512], [0, 768, 512]]);
const EAST_WALL = quadMesh([[512, 0, 0], [512, 256, 0], [512, 256, 256], [512, 0, 256]]);

// 250 rows of 10 floors, stepping up and down, 5000 triangles in all
function manyFloors(): Mesh {
  const rows = Array.from({ length: 250 }, (_, k) => {
    const row = floorMesh(0, k * 256, 256, k * 256 + 256, (k % 7) * 8);
    return merged(...Array.from({ length: 10 }, (_, i) =>
      meshOf(row.vertices.map(([x, y, z]) => [x + i * 256, y, z] as Vec3), row.triangles)));
  });
  return merged(...rows);
}

const withMaterials = (mesh: Mesh, materialOf: (index: number) => string) =>
  meshOf(mesh.vertices, mesh.triangles.map((triangle, index) => ({ ...triangle, material: materialOf(index) })));

describe("world meshes", () => {
  test("polygons are sliced into pieces along z", () => {
    const [world] = worldsOf(floorMesh(0, 0, 512, 1024, 256));
    expect(world.polygons.every((polygon) => isInOneSlice(world, polygon, 2, 256))).toBe(true);
    expect(totalArea(world)).toBeCloseTo(512 * 1024);
  });

  test("polygons are sliced into pieces along x and y too", () => {
    // a texture covers a whole polygon, so a big one would stretch it
    const [world] = worldsOf(WALL);
    for (const axis of [0, 1]) {
      expect(world.polygons.every((polygon) => isInOneSlice(world, polygon, axis, 256))).toBe(true);
    }
    expect(totalArea(world)).toBeCloseTo(1024 * 768);
  });

  test("x and y can be sliced less often than z", () => {
    const [world] = worldMeshes(WALL, { piece: 256, ground: GROUND, side: SIDE, tile: 512 });
    const widths = world.polygons.map((polygon) => {
      const xs = cornersOf(world, polygon).map((corner) => corner[0]);
      return Math.max(...xs) - Math.min(...xs);
    });
    expect(Math.max(...widths)).toBeLessThanOrEqual(512);
    expect(Math.max(...widths)).toBeGreaterThan(256);
  });

  test("slicing leaves no cracks along shared edges", () => {
    // two triangles sharing a slanted edge (x = z / 2, so every cut along it is on a multiple of 8)
    const mesh = meshOf([[0, 0, 0], [512, 0, 1024], [0, 0, 1024], [512, 0, 0]], [
      { corners: [0, 2, 1], object: null, material: null },
      { corners: [0, 1, 3], object: null, material: null },
    ]);
    const [world] = worldsOf(mesh);
    const sides = [new Set<string>(), new Set<string>()];
    for (const polygon of world.polygons) {
      const corners = cornersOf(world, polygon);
      const isLeft = corners.reduce((sum, corner) => sum + 2 * corner[0], 0) < corners.reduce((sum, corner) => sum + corner[2], 0);
      corners.filter((corner) => corner[2] === 2 * corner[0]).forEach((corner) => sides[isLeft ? 1 : 0].add(corner.join()));
    }
    expect(sides[0]).toEqual(sides[1]);
    expect(sides[0].size).toBeGreaterThan(2);
  });

  test("vertices are on multiples of 8", () => {
    const mesh = meshOf([[0, 0, 0], [504, 96, 1000], [0, 0, 1000]], [{ corners: [0, 1, 2], object: null, material: null }]);
    for (const world of worldsOf(mesh)) {
      expect(world.vertices.every(({ at }) => at.every((coordinate) => coordinate % 8 === 0))).toBe(true);
    }
  });

  test("up facing polygons use the ground texture, and the rest the side", () => {
    const [world] = worldsOf(merged(floorMesh(0, 0, 256, 256, 0), EAST_WALL));
    for (const polygon of world.polygons) {
      const isFlat = new Set(cornersOf(world, polygon).map((corner) => corner[1])).size === 1;
      expect(polygon.texture).toEqual(isFlat ? GROUND : SIDE);
    }
  });

  test("down facing polygons aren't drawn", () => {
    // a ceiling would hide the level from the camera above it
    expect(worldsOf(quadMesh([[0, 1024, 0], [256, 1024, 0], [256, 1024, 256], [0, 1024, 256]]))).toEqual([]);
  });

  test("polygons facing away from the camera aren't drawn", () => {
    // the camera always looks along -z, so it never sees a face pointing that way
    const corners: Vec3[] = [[0, 0, 256], [256, 0, 256], [256, 256, 256], [0, 256, 256]];
    const one = quadMesh(corners);
    const other = quadMesh([...corners].reverse());
    const [away, towards] = normal(one, one.triangles[0])![2] < 0 ? [one, other] : [other, one];
    expect(worldsOf(away)).toEqual([]);
    expect(worldsOf(towards)).not.toEqual([]);
  });

  test("up facing polygons are lit brighter than walls", () => {
    const [world] = worldsOf(merged(floorMesh(0, 0, 256, 256, 0), EAST_WALL));
    const brightness = (texture: PageTexture) => world.polygons.filter((polygon) => polygon.texture === texture)
      .flatMap((polygon) => polygon.corners.map((index) => world.vertices[index].colour[0]));
    expect(new Set(brightness(GROUND)).size).toBe(1);
    expect(Math.min(...brightness(GROUND))).toBeGreaterThan(Math.max(...brightness(SIDE)));
  });

  test("split into several meshes when over 4096", () => {
    const worlds = worldsOf(manyFloors());
    expect(worlds.length).toBeGreaterThan(1);
    for (const { vertices, polygons } of worlds) {
      expect(vertices.length).toBeLessThanOrEqual(4096);
      expect(polygons.length).toBeLessThanOrEqual(4096);
      expect(vertices.length + polygons.length).toBeLessThanOrEqual(WGEO_ITEMS_MAX); // fits in a page
      expect(polygons.every((polygon) => polygon.corners.every((index) => index < vertices.length))).toBe(true);
    }
    expect(worlds.reduce((sum, world) => sum + world.polygons.length, 0)).toBe(2 * 250 * 10);
  });

  test("too many meshes for a zone is an error", () => {
    expect(() => worldMeshes(manyFloors(), { piece: 256, ground: GROUND, side: SIDE, worldsMax: 1 })).toThrow();
  });

  test("a zone's meshes are the pieces in it, relative to it", () => {
    const [world] = worldMeshes(floorMesh(0, 0, 1024, 4096, 256), { piece: 512, ground: GROUND, side: SIDE, span: [2048, 4096] });
    expect(totalArea(world)).toBeCloseTo(1024 * 2048); // half of it along z
    const zs = world.vertices.map(({ at }) => at[2]);
    expect([Math.min(...zs), Math.max(...zs)]).toEqual([0, 2048]);
  });
});

describe("vertex colours", () => {
  // a floor from z 0 to 512, black along z 0 and grey (200) along z 512
  const shadedFloor: Mesh = {
    vertices: [[0, 0, 0], [256, 0, 0], [256, 0, 512], [0, 0, 512]],
    colours: [[0, 0, 0], [0, 0, 0], [200, 200, 200], [200, 200, 200]],
    triangles: [{ corners: [0, 2, 1], object: null, material: null }, { corners: [0, 3, 2], object: null, material: null }],
    materialLibraries: [],
  };

  test("a face whose vertices have colours is shaded by them, in place of the builder's light", () => {
    const [world] = worldsOf(shadedFloor, 1024);
    const colourAt = (z: number) => world.vertices.find(({ at }) => at[2] === z)!.colour;
    expect(colourAt(0)).toEqual([0, 0, 0]);
    expect(colourAt(512)).toEqual([200, 200, 200]);
  });

  test("where a face is sliced, its colours are blended along it", () => {
    const [world] = worldsOf(shadedFloor, 256);
    expect(world.vertices.filter(({ at }) => at[2] === 256).map(({ colour }) => colour)).toContainEqual([100, 100, 100]);
  });

  test("a face with a vertex without a colour is lit as usual", () => {
    const [world] = worldsOf({ ...shadedFloor, colours: [[0, 0, 0], null, [0, 0, 0], [0, 0, 0]] }, 1024);
    const unlit = worldsOf({ ...shadedFloor, colours: undefined }, 1024)[0];
    expect(world.vertices.slice(0, 3).map(({ colour }) => colour)).toEqual(unlit.vertices.slice(0, 3).map(({ colour }) => colour));
  });
});

describe("textured materials", () => {
  test("their polygons get tile regions", () => {
    const mesh = withMaterials(merged(floorMesh(0, 0, 512, 512, 0), EAST_WALL), (index) => (index < 2 ? "stone" : "plain"));
    const [world] = worldMeshes(mesh, { piece: 512, ground: GROUND, side: SIDE, tile: 1024, textured: new Set(["stone"]) });
    const regions = world.polygons.map(({ texture }) => texture).filter(isTileRegion);
    expect(regions.length).toBeGreaterThan(0);
    expect(new Set(regions.map((region) => region.material))).toEqual(new Set(["stone"]));
    expect(world.polygons.filter((polygon) => !isTileRegion(polygon.texture)).every((polygon) => polygon.texture === SIDE)).toBe(true);
  });

  test("meshes split before their texture regions overflow", () => {
    // each region a mesh uses is a texinfo (8 bytes) in its header, so it counts
    // towards fitting a page, and a header's texinfo indices only reach so far
    const mesh = withMaterials(floorMesh(0, 0, 2048, 1024, 0), () => "stone");
    const worlds = worldMeshes(mesh, {
      piece: 512, ground: GROUND, side: SIDE, tile: 1024, textured: new Set(["stone"]), regionsMax: 4,
    });
    expect(worlds.length).toBeGreaterThan(1);
    for (const { vertices, polygons } of worlds) {
      const regions = new Set(polygons.map(({ texture }) => JSON.stringify(texture)));
      expect(regions.size).toBeLessThanOrEqual(4);
      expect(vertices.length + polygons.length + regions.size).toBeLessThanOrEqual(WGEO_ITEMS_MAX);
    }
    expect(worlds.reduce((sum, world) => sum + world.polygons.length, 0)).toBe(2 * 2 * 2); // 1024 across, 512 along
  });
});

describe("textured faces with their own UVs", () => {
  // a 1024 floor triangle in stone, the whole image on it, upside down from how it'd be projected
  const uvFloor = (uvs: [number, number][]): Mesh => ({
    vertices: [[0, 0, 0], [1024, 0, 0], [0, 0, 1024]],
    triangles: [{ corners: [0, 2, 1], object: null, material: "stone", uvs }],
    materialLibraries: [],
  });
  const regionsOf = (mesh: Mesh, piece: number) =>
    worldMeshes(mesh, { piece, ground: GROUND, side: SIDE, tile: 256, textured: new Set(["stone"]) })[0].polygons.map(({ texture }) => texture).filter(isTileRegion);

  test("keep them: the whole image on the face, in place of a projected part of it", () => {
    const [region] = regionsOf(uvFloor([[0, 0], [0, 1], [1, 0]]), 2048);
    expect(region).toMatchObject({ x: 0, y: 0, w: 64, h: 64 });
    expect(LAYOUTS[region.layout]).toEqual([[0, 1], [0, 0], [1, 1]]);
  });

  test("sliced, each piece gets the part of the image under it", () => {
    const regions = regionsOf(uvFloor([[0, 0], [0, 1], [1, 0]]), 512);
    expect(regions.length).toBeGreaterThan(1);
    expect(regions.every(({ w, h }) => w <= 64 && h <= 64)).toBe(true);
    expect(regions.some(({ w, h }) => w < 64 || h < 64)).toBe(true);
  });

  test("UVs beyond the image (repeating it) are projected as usual", () => {
    const [region] = regionsOf(uvFloor([[0, 0], [0, 4], [4, 0]]), 2048);
    const [projected] = regionsOf(uvFloor(undefined as unknown as [number, number][]), 2048);
    expect(region).toEqual(projected);
  });
});

describe("tile regions", () => {
  const UP: Vec3 = [0, 1, 0];
  const EAST: Vec3 = [1, 0, 0];

  test("a piece gets the part of the tile under it", () => {
    // floors are mapped by x and z; the tile repeats every 1024, so a 512 square is a quarter
    expect(tileRegion([[0, 0, 0], [512, 0, 0], [512, 0, 512]], UP, 1024)).toMatchObject({ x: 0, y: 0, w: 32, h: 32 });
    const nextCellOver: Vec3[] = [[1536, 0, 1024], [2048, 0, 1024], [2048, 0, 1536]];
    expect(tileRegion(nextCellOver, UP, 1024)).toMatchObject({ x: 32, y: 0, w: 32, h: 32 });
  });

  test("corners go where the points are", () => {
    expect(LAYOUTS[tileRegion([[0, 0, 0], [512, 0, 0], [512, 0, 512]], UP, 1024).layout]).toEqual([[0, 0], [1, 0], [1, 1]]);
    const startingElsewhere: Vec3[] = [[512, 0, 512], [0, 0, 0], [512, 0, 0]];
    expect(LAYOUTS[tileRegion(startingElsewhere, UP, 1024).layout]).toEqual([[1, 1], [0, 0], [1, 0]]);
  });

  test("from a face's UVs: the part of the image under them (v up, as .obj has it), and the corners where they are", () => {
    const whole = uvTileRegion([[0, 1], [1, 1], [0, 0]]);
    expect(whole).toMatchObject({ x: 0, y: 0, w: 64, h: 64 });
    expect(LAYOUTS[whole.layout]).toEqual([[0, 0], [1, 0], [0, 1]]);
    expect(uvTileRegion([[0.5, 0.5], [1, 0.5], [0.5, 0]])).toMatchObject({ x: 32, y: 32, w: 32, h: 32 });
  });

  test("walls are upright", () => {
    // a wall facing +x is mapped by z and y; the image's top is up
    const region = tileRegion([[0, 0, 0], [0, 1024, 0], [0, 1024, 1024]], EAST, 1024);
    expect(region).toMatchObject({ x: 0, y: 0, w: 64, h: 64 });
    expect(LAYOUTS[region.layout][0][1]).toBe(1); // the low point at the bottom
    expect(LAYOUTS[region.layout][1][1]).toBe(0);
  });

  test("an odd triangle gets an aligned region around it", () => {
    const region = tileRegion([[100, 0, 100], [300, 0, 120], [180, 0, 400]], UP, 1024);
    expect(region).toMatchObject({ x: 0, y: 0, w: 32, h: 32 }); // 6..25 x, 6..25 y in pixels
    expect(new Set(LAYOUTS[region.layout].map((corner) => corner.join())).size).toBe(3);
  });
});
