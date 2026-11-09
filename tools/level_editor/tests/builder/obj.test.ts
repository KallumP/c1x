import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { readMtl, readObj, turned } from "../../builder/obj";

const QUAD_OBJ = `# a comment
mtllib level.mtl
o Floor
v 0 0 0
v 1 0 0
v 1 0 1
v 0 0 1
vt 0 0
vn 0 1 0
usemtl floor
s off
f 1/1/1 2/1/1 3/1/1 4/1/1
o Wall
v 0 0 0
v 0 1 0
v 1 1 0
usemtl wall
f -3 -2 -1
`;

describe("reading a .obj", () => {
  test("vertices are scaled to zone units", () => {
    const mesh = readObj(QUAD_OBJ, 256);
    expect(mesh.vertices[0]).toEqual([0, 0, 0]);
    expect(mesh.vertices[2]).toEqual([256, 0, 256]);
    expect(mesh.vertices[6]).toEqual([256, 256, 0]);
    expect(mesh.vertices.length).toBe(7);
  });

  test("vertex colours (blender's v x y z r g b, 0 to 1) are read as 0 to 255, none where a vertex has none", () => {
    const mesh = readObj(["v 0 0 0 1 0.5 0", "v 1 0 0", "v 0 0 1 0.2 0.4 0.6", "f 1 2 3"].join("\n"), 256);
    expect(mesh.colours).toEqual([[255, 128, 0], null, [51, 102, 153]]);
  });

  test("polygons are fanned into triangles", () => {
    const floor = readObj(QUAD_OBJ, 256).triangles.filter((triangle) => triangle.object === "Floor");
    expect(floor.map((triangle) => triangle.corners)).toEqual([[0, 1, 2], [0, 2, 3]]);
  });

  test("negative indices count back from the last vertex", () => {
    const wall = readObj(QUAD_OBJ, 256).triangles.filter((triangle) => triangle.object === "Wall");
    expect(wall.map((triangle) => triangle.corners)).toEqual([[4, 5, 6]]);
  });

  test("triangles know their object and material", () => {
    const triangles = readObj(QUAD_OBJ, 256).triangles;
    expect(triangles.map(({ object, material }) => [object, material])).toEqual([
      ["Floor", "floor"], ["Floor", "floor"], ["Wall", "wall"],
    ]);
  });

  test("turn rotates about the up axis", () => {
    // a quarter turn takes +x to -z (seen from above, anticlockwise), up stays up
    expect(readObj("v 1 2 0\n", 1, 90).vertices[0]).toEqual([0, 2, -1]);
    expect(readObj("v 1 2 0\n", 1, 180).vertices[0]).toEqual([-1, 2, 0]);
    expect(turned(1, 0, 270)).toEqual([0, 1]);
  });

  test("turn has to be a multiple of 90", () => {
    expect(() => readObj("v 1 2 0\n", 1, 45)).toThrow();
  });

  test("a face with a missing vertex is an error", () => {
    expect(() => readObj("v 0 0 0\nv 1 0 0\nf 1 2 3\n", 1)).toThrow(/line 3/);
  });

  test("it lists its material libraries", () => {
    expect(readObj("mtllib level.mtl\nv 0 0 0\n", 1).materialLibraries).toEqual(["level.mtl"]);
  });
});

describe("reading a .mtl", () => {
  const absolute = resolve("wall tiles.png");
  const mtl = `# Blender MTL File
newmtl floor
Kd 0.8 0.8 0.8
map_Kd textures/floor.png
newmtl wall
map_Kd -s 2 2 1 ${absolute}
newmtl plain
Kd 1 0 0
`;

  test("each material's image is relative to the .mtl", () => {
    expect(readMtl(mtl, join("level_src", "x")).get("floor")).toBe(join("level_src", "x", "textures", "floor.png"));
  });

  test("options before the image are skipped, and absolute paths kept", () => {
    expect(readMtl(mtl, "level_src").get("wall")).toBe(absolute);
  });

  test("materials without an image are left out", () => {
    expect(readMtl(mtl, "level_src").has("plain")).toBe(false);
  });
});
