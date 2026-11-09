import { describe, expect, test } from "vitest";
import { colour5551, texinfoBytes, texturePage, TILE, type Rgb } from "../../../builder/tpage";
import { TEXINFOS_AT, type BuiltPolygon } from "../../../builder/worldGeometry";
import type { CutLevel, CutWorld } from "../../../scripts/cutLevel/readCutLevel";
import { cutLevelScene } from "../../../scripts/cutLevel/scene";
import { cross, subtract, type Vec3 } from "../../../builder/vectors";

const PAGE = 0x12345671;
const ACID: Rgb = [200, 230, 40];
const ROCK: Rgb = [120, 40, 140];
const plainTile = (colour: Rgb) => ({ pixels: Array(TILE * TILE).fill(0), palette: [colour5551(colour), ...Array(15).fill(0)] });
const { page, places } = texturePage(PAGE, [plainTile(ACID), plainTile(ROCK)]);
const REGION = { x: 0, y: 0, w: 32, h: 32 };
const header = Buffer.concat([
  Buffer.alloc(TEXINFOS_AT),
  texinfoBytes(places[0], 0, REGION), // word 0: acid
  texinfoBytes(places[1], 0, REGION), // word 2: rock
  Buffer.from([0, 0, 0, 0]),          // word 4: flat black
]);
const ACID_WORD = 0;
const ROCK_WORD = 2;
const BLACK_WORD = 4;

// a world with a triangle per texinfo word, each 400 units across, its vertices grey (100)
function worldWith(words: number[], origin: [number, number, number] = [0, 0, 0], x = 0): CutWorld {
  const vertices = words.flatMap((_, index) => [[x, 0, index * 800], [x + 400, 0, index * 800], [x, 0, index * 800 + 400]])
    .map((at) => ({ at: at as [number, number, number], colour: [100, 100, 100] as Rgb }));
  const polygons: BuiltPolygon[] = words.map((texinfo, index) => ({ corners: [3 * index, 3 * index + 1, 3 * index + 2], texinfo, page: 0 }));
  return { name: "k0_4W", origin, header, pages: [PAGE], vertices, polygons };
}
const levelOf = (...worlds: CutWorld[]): CutLevel => ({ worlds, texturePages: new Map([[PAGE, page]]), entities: [], solids: [] });
const OPTIONS = { centre: [0, 0, 0] as [number, number, number], halfWidth: 8000, scale: 400, route: [[0, 10, 0], [0, -10, 0]] as Vec3[] };

describe("a cut level as a blender scene", () => {
  test("each world mesh is an object of its faces, in blender metres from the centre: x, -z, y (its route, along -z, along +y)", () => {
    const scene = cutLevelScene(levelOf(worldWith([ROCK_WORD], [400, 800, -1200])), OPTIONS);
    const [object] = scene.objects;
    expect(object.name).toBe("k0_4W");
    expect(object.faces[0].corners).toContainEqual([1, 3, 2]); // its first vertex, game (400, 800, -1200)
  });

  test("its triangles are turned round, as the builder takes the other corner order as facing up", () => {
    const [face] = cutLevelScene(levelOf(worldWith([ROCK_WORD])), OPTIONS).objects[0].faces;
    expect(face.corners).toEqual([[0, 0, 0], [0, -1, 0], [1, 0, 0]]); // game (0,0,0), (0,0,400), (400,0,0)
  });

  // a world of one triangle with corners at (game units), in rock
  const triangleWorld = (corners: Vec3[]): CutWorld => ({
    name: "k0_4W", origin: [0, 0, 0], header, pages: [PAGE],
    vertices: corners.map((at) => ({ at, colour: [100, 100, 100] as Rgb })),
    polygons: [{ corners: [0, 1, 2], texinfo: ROCK_WORD, page: 0 }],
  });
  const upOf = ({ corners: [a, b, c] }: { corners: Vec3[] }) => {
    const normal = cross(subtract(b, a), subtract(c, a));
    return normal[2] / Math.hypot(...normal);
  };

  test("a floor wound the other way still faces up: the game draws world polygons from both sides, so their winding says nothing", () => {
    const [face] = cutLevelScene(levelOf(triangleWorld([[0, 0, 0], [0, 0, 400], [400, 0, 0]])), OPTIONS).objects[0].faces;
    expect(upOf(face)).toBeGreaterThan(0.5);
  });

  test("a wall faces the route (the side crash and the camera are on), whichever way it's wound", () => {
    // walls along the route (game z), at x 1600 and -1600; the route runs along x 0
    const wall = (x: number, corners: Vec3[]) => cutLevelScene(levelOf(triangleWorld(corners.map(([dx, y, z]) => [x + dx, y, z] as Vec3))), OPTIONS).objects[0].faces;
    const towards = (x: number) => wall(x, [[0, 0, 0], [0, 400, 0], [0, 0, 400]]).concat(wall(x, [[0, 0, 0], [0, 0, 400], [0, 400, 0]]));
    const acrossOf = ({ corners: [a, b, c] }: { corners: Vec3[] }) => cross(subtract(b, a), subtract(c, a))[0];
    expect(towards(1600).every((face) => acrossOf(face) < 0)).toBe(true); // right of the route, facing -x
    expect(towards(-1600).every((face) => acrossOf(face) > 0)).toBe(true);
    expect(towards(1600).length).toBe(2); // one face each, not two
  });

  test("each texture region is a material with its image, and a triangle's UVs are its layout's corners (v up), turned round with it", () => {
    const scene = cutLevelScene(levelOf(worldWith([ROCK_WORD])), OPTIONS);
    const [face] = scene.objects[0].faces;
    const material = scene.materials.find(({ name }) => name === face.material)!;
    expect(scene.images.get(material.image)!.width).toBe(32);
    expect(face.uvs).toEqual([[0, 1], [0, 0], [1, 1]]); // layout 0's corners (0,0), (1,0), (0,1), the last two swapped
  });

  test("its vertices keep their colours", () => {
    const [face] = cutLevelScene(levelOf(worldWith([ROCK_WORD])), OPTIONS).objects[0].faces;
    expect(face.colours).toEqual([[100, 100, 100], [100, 100, 100], [100, 100, 100]]);
  });

  test("the acid (bright yellow-green) is in a pit object, so it kills crash", () => {
    const scene = cutLevelScene(levelOf(worldWith([ACID_WORD, ROCK_WORD])), OPTIONS);
    const pit = scene.objects.find(({ name }) => name.startsWith("pit"))!;
    expect(pit.faces.map(({ material }) => material)).toEqual(["acid"]);
    expect(scene.objects.find(({ name }) => name === "k0_4W")!.faces.length).toBe(1);
  });

  test("an untextured face is a flat colour's material, its UVs on its image", () => {
    const scene = cutLevelScene(levelOf(worldWith([BLACK_WORD])), OPTIONS);
    const [face] = scene.objects[0].faces;
    expect(face.material).toBe("flat_000000");
    expect(face.uvs.flat().every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(scene.images.has(scene.materials.find(({ name }) => name === "flat_000000")!.image)).toBe(true);
  });

  test("faces reaching more than halfWidth across from the centre are cropped", () => {
    const scene = cutLevelScene(levelOf(worldWith([ROCK_WORD], [0, 0, 0], 7800)), OPTIONS);
    expect(scene.objects.flatMap(({ faces }) => faces)).toEqual([]);
  });
});
