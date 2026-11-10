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
const OPTIONS = { centre: [0, 0, 0] as [number, number, number], halfWidth: 8000, scale: 400 };

describe("a cut level as a blender scene", () => {
  test("each world mesh is an object of its faces, in blender metres from the centre", () => {
    // x, -z, y: its route, along -z, along +y
    const scene = cutLevelScene(levelOf(worldWith([ROCK_WORD], [400, 800, -1200])), OPTIONS);
    const [object] = scene.objects;
    expect(object.name).toBe("k0_4W");
    expect(object.faces[0].corners).toContainEqual([1, 3, 2]); // its first vertex, game (400, 800, -1200)
  });

  test("its triangles are turned round to face up for the builder", () => {
    // the builder takes the other corner order as facing up
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

  test("a floor faces up whichever way it's wound", () => {
    // the game draws world polygons from both sides, so their winding says nothing
    const [face] = cutLevelScene(levelOf(triangleWorld([[0, 0, 0], [0, 0, 400], [400, 0, 0]])), OPTIONS).objects[0].faces;
    expect(upOf(face)).toBeGreaterThan(0.5);
  });

  const normalOf = ({ corners: [a, b, c] }: { corners: Vec3[] }) => cross(subtract(b, a), subtract(c, a));
  const wallFaces = (corners: Vec3[]) => cutLevelScene(levelOf(triangleWorld(corners)), OPTIONS).objects[0].faces;
  const bothWays = (corners: Vec3[]) => wallFaces(corners).concat(wallFaces([corners[0], corners[2], corners[1]]));

  test("a wall across the route faces back along it, whichever way it's wound", () => {
    // blender -y: the camera looks along the route, and the builder hides walls facing away from it
    // a wall across the route (game x, up) at game z -2000, ahead of the camera
    const faces = bothWays([[0, 0, -2000], [400, 0, -2000], [0, 400, -2000]]);
    expect(faces.every((face) => normalOf(face)[1] < 0)).toBe(true);
    expect(faces.length).toBe(2); // one face each, not two
  });

  test("a sloping wall a little across the route faces back along it", () => {
    // a mound's foot, whatever the collision says
    // a mound's foot facing mostly along the route and out to +x, over the acid's solid ground
    const acidGround = { low: [-2000, -2000, -4000] as Vec3, high: [2000, 250, 0] as Vec3, leaf: 1 };
    const level = (corners: Vec3[]): CutLevel => ({ worlds: [triangleWorld(corners)], texturePages: new Map([[PAGE, page]]), entities: [], solids: [acidGround] });
    const corners: Vec3[] = [[0, 200, -2000], [400, 200, -2200], [0, 600, -2100]];
    const faces = [corners, [corners[0], corners[2], corners[1]]].map((wound) => cutLevelScene(level(wound), OPTIONS).objects[0].faces[0]);
    expect(faces.every((face) => normalOf(face)[1] < 0)).toBe(true);
  });

  test("a wall beside the route keeps its winding", () => {
    // facing across it: the builder never hides those
    const corners: Vec3[] = [[1600, 0, 0], [1600, 400, 0], [1600, 0, 400]];
    const [face] = wallFaces(corners);
    const [reversedFace] = wallFaces([corners[0], corners[2], corners[1]]);
    expect(Math.sign(normalOf(face)[0])).toBe(-Math.sign(normalOf(reversedFace)[0]));
  });

  test("each texture region is a material with its image, under its triangles' UVs", () => {
    // a triangle's UVs are its layout's corners (v up), turned round with it
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

  test("the acid is in a pit object, so it kills crash", () => {
    // bright yellow-green
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
