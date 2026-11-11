// a mossy slide's plank, made for custom levels to look like the great gate's:
// a row of logs laid across the slope, its top mossy, their ends along its
// front (towards the camera), bark behind, under and at its ends. it's added to
// the map's mesh, so it's drawn, textured and solid as the map is. and the
// slider's path along its top (the great gate's WalOC subtype 2, invisible)
import type { RgbImage } from "./images";
import type { Mesh, Triangle, Uv } from "./obj";
import { cross, subtract, type Vec3 } from "./vectors";

// its materials, whose images (made here) the map's textures take in
export const SLIDE_MATERIALS = { moss: "c1x_mossy_slide_moss", logEnd: "c1x_mossy_slide_log_end", bark: "c1x_mossy_slide_bark" };

const LOG = 250;              // a log's width along the slide, about (game units)
const PLANK_WIDTH = 1000;     // across it (the great gate's, about)
const PLANK_THICKNESS = 200;  // a log's
const SLIDE_PAST_PLANK = 400; // how far the slider's path goes on past the plank (the great gate's: 2000 over a 1600 plank)
const SLIDE_STEP = 450;       // how far apart its points are, about (the great gate's long slides': 3600 in 8)

const IMAGE_SIZE = 32;

// a pixel's colour in an image
type Paint = (x: number, y: number) => [number, number, number];

// a value from 0 to 1 for a pixel, the same each time: the images' speckle
function noise(x: number, y: number, seed: number): number {
  let hash = (x * 374761393 + y * 668265263 + seed * 2147483647) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0;
  return ((hash ^ (hash >>> 16)) >>> 0) / 0xffffffff;
}

// a colour, each channel moved by amount (-1 to 1) of its own size
const shaded = ([r, g, b]: [number, number, number], amount: number): [number, number, number] =>
  [r, g, b].map((channel) => Math.max(0, Math.min(255, Math.round(channel * (1 + amount))))) as [number, number, number];

// moss: green, mottled darker and lighter
const moss: Paint = (x, y) => shaded([70, 120, 35], 0.45 * (noise(x >> 1, y >> 1, 1) - 0.5) + 0.2 * (noise(x, y, 2) - 0.5));

// bark: brown, in darker streaks across (the logs run across the slope)
const bark: Paint = (x, y) => shaded([105, 68, 38], 0.35 * (noise(x >> 3, y, 3) - 0.5) + 0.15 * (noise(x, y, 4) - 0.5));

// a log end: pale wood in rings round its middle, bark round its edge
const logEnd: Paint = (x, y) => {
  const middle = (IMAGE_SIZE - 1) / 2;
  const distance = Math.hypot(x - middle, y - middle);
  if (distance > IMAGE_SIZE * 0.45) {
    return bark(x, y);
  }
  const ring = Math.cos(distance * 1.4) * 0.12;
  return shaded([196, 158, 102], ring + 0.1 * (noise(x, y, 5) - 0.5));
};

function painted(paint: Paint): RgbImage {
  const rgb = new Uint8Array(IMAGE_SIZE * IMAGE_SIZE * 3);
  for (let y = 0; y < IMAGE_SIZE; y++) {
    for (let x = 0; x < IMAGE_SIZE; x++) {
      rgb.set(paint(x, y), 3 * (y * IMAGE_SIZE + x));
    }
  }
  return { width: IMAGE_SIZE, height: IMAGE_SIZE, rgb };
}

// the slide's images, by material
export function mossySlideImages(): Map<string, RgbImage> {
  return new Map([
    [SLIDE_MATERIALS.moss, painted(moss)],
    [SLIDE_MATERIALS.logEnd, painted(logEnd)],
    [SLIDE_MATERIALS.bark, painted(bark)],
  ]);
}

const QUAD_UVS: Uv[] = [[0, 1], [1, 1], [1, 0], [0, 0]]; // a quad's corners on its image: bottom left, round anticlockwise

// a mesh being made: its vertices and triangles
interface MeshMaker {
  vertices: Vec3[];
  triangles: Triangle[];
}

// whether a triangle's front (anticlockwise) faces out (along outward)
function facesOut(corners: Vec3[], outward: Vec3): boolean {
  const [x, y, z] = cross(subtract(corners[1], corners[0]), subtract(corners[2], corners[0]));
  return x * outward[0] + y * outward[1] + z * outward[2] > 0;
}

// a triangle of the made mesh, turned to face out
function addTriangle(mesh: MeshMaker, corners: number[], uvs: Uv[], material: string, outward: Vec3): void {
  const at = corners.map((corner) => mesh.vertices[corner]);
  if (facesOut(at, outward)) {
    mesh.triangles.push({ corners: corners as [number, number, number], object: null, material, uvs });
    return;
  }
  mesh.triangles.push({ corners: [corners[0], corners[2], corners[1]], object: null, material, uvs: [uvs[0], uvs[2], uvs[1]] });
}

// a quad (its corners round in order) of the made mesh, as two triangles facing out, its image across it
function addQuad(mesh: MeshMaker, quad: Vec3[], material: string, outward: Vec3): void {
  const first = mesh.vertices.length;
  mesh.vertices.push(...quad);
  addTriangle(mesh, [first, first + 1, first + 2], [QUAD_UVS[0], QUAD_UVS[1], QUAD_UVS[2]], material, outward);
  addTriangle(mesh, [first, first + 2, first + 3], [QUAD_UVS[0], QUAD_UVS[2], QUAD_UVS[3]], material, outward);
}

const [BACK, FRONT] = [-PLANK_WIDTH / 2, PLANK_WIDTH / 2]; // the plank's sides' z: the front towards the camera

// a corner of the plank at x along the slide (either way from its top end),
// on its top (or under it) at z across it, its top dropping drop for each unit along
function plankCorner(x: number, under: boolean, z: number, drop: number): Vec3 {
  return [x, -drop * Math.abs(x) - Number(under) * PLANK_THICKNESS, z];
}

// one log of the plank (from and to along the slide): its mossy top, its end at the front, bark behind and under it
function addLog(mesh: MeshMaker, from: number, to: number, drop: number): void {
  const corner = (x: number, under: boolean, z: number) => plankCorner(x, under, z, drop);
  const [back, front] = [BACK, FRONT];
  addQuad(mesh, [corner(from, false, front), corner(to, false, front), corner(to, false, back), corner(from, false, back)], SLIDE_MATERIALS.moss, [0, 1, 0]);
  addQuad(mesh, [corner(from, true, front), corner(to, true, front), corner(to, false, front), corner(from, false, front)], SLIDE_MATERIALS.logEnd, [0, 0, 1]);
  addQuad(mesh, [corner(to, true, back), corner(from, true, back), corner(from, false, back), corner(to, false, back)], SLIDE_MATERIALS.bark, [0, 0, -1]);
  addQuad(mesh, [corner(from, true, back), corner(to, true, back), corner(to, true, front), corner(from, true, front)], SLIDE_MATERIALS.bark, [0, -1, 0]);
}

// an end of the plank (at x along the slide), bark, facing out along it (outward)
function addEnd(mesh: MeshMaker, x: number, drop: number, outward: number): void {
  const corner = (under: boolean, z: number) => plankCorner(x, under, z, drop);
  addQuad(mesh, [corner(true, BACK), corner(true, FRONT), corner(false, FRONT), corner(false, BACK)], SLIDE_MATERIALS.bark, [outward, 0, 0]);
}

// how far down a slope at angle degrees drops for each unit along it
const dropOf = (angle: number) => Math.tan((angle * Math.PI) / 180);

// which way along the game's x a slide runs: on, or back reversed
function slideWay(reverse: boolean): number {
  if (reverse) {
    return -1;
  }
  return 1;
}

// a mossy slide's plank, length long along the map (game units) from its top
// end (the origin), down at angle degrees, back across the map reversed
export function mossySlidePlank(length: number, angle: number, reverse: boolean): Mesh {
  const way = slideWay(reverse);
  const drop = dropOf(angle);
  const logs = Math.max(1, Math.round(length / LOG));
  const mesh: MeshMaker = { vertices: [], triangles: [] };
  for (let log = 0; log < logs; log++) {
    addLog(mesh, (way * length * log) / logs, (way * length * (log + 1)) / logs, drop);
  }
  addEnd(mesh, 0, drop, -way);
  addEnd(mesh, way * length, drop, way);
  return { ...mesh, materialLibraries: [] };
}

// the slider's path along the plank's top, from its top end and on past its
// other, its points about SLIDE_STEP apart
export function mossySlidePath(length: number, angle: number, reverse: boolean): Vec3[] {
  const way = slideWay(reverse);
  const drop = dropOf(angle);
  const run = length + SLIDE_PAST_PLANK;
  const steps = Math.max(1, Math.round(run / SLIDE_STEP));
  return Array.from({ length: steps + 1 }, (_, point) => {
    const x = (run * point) / steps;
    return [way * x + 0, -drop * x + 0, 0] as Vec3; // + 0 turns -0 into 0
  });
}

// a map's mesh with planks added, each moved to where it goes (at, in the
// map's frame), so they're drawn, textured and solid as the map is
export function withPlanks(map: Mesh, planks: { plank: Mesh; at: Vec3 }[]): Mesh {
  return planks.reduce((mesh, { plank, at }) => {
    const first = mesh.vertices.length;
    const vertices = plank.vertices.map((vertex) => vertex.map((value, axis) => value + at[axis]) as Vec3);
    const triangles = plank.triangles.map((triangle) =>
      ({ ...triangle, corners: triangle.corners.map((corner) => corner + first) as [number, number, number] }));
    return { ...mesh, vertices: [...mesh.vertices, ...vertices], triangles: [...mesh.triangles, ...triangles] };
  }, map);
}
