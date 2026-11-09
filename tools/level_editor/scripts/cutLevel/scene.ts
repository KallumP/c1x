// a cut level as a scene for blender (scripts/blender/build_cut_level.py):
// each world mesh an object of textured triangles in blender metres, each
// texture region a material with its image, and the acid in a pit object
import type { RgbImage } from "../../builder/images";
import type { Uv } from "../../builder/obj";
import type { Rgb } from "../../builder/tpage";
import type { BuiltPolygon } from "../../builder/worldGeometry";
import { cross, subtract, type Vec3 } from "../../builder/vectors";
import type { CutSolid } from "./collision";
import type { CutLevel, CutWorld } from "./readCutLevel";
import { polygonTexture, regionImage, triangleUVs, type PolygonTexture } from "./textures";

export interface SceneFace {
  corners: Vec3[]; // blender metres
  uvs: Uv[];       // .obj's: v up
  colours: Rgb[];  // the game's vertex colours, 0 to 255 (128 leaves a texture as it is)
  material: string;
}

export interface SceneObject {
  name: string;
  faces: SceneFace[];
}

export interface SceneMaterial {
  name: string;
  image: string; // its image's file name
}

export interface CutLevelScene {
  objects: SceneObject[];
  materials: SceneMaterial[];
  images: Map<string, RgbImage>; // by file name
}

export interface SceneOptions {
  centre: Vec3;      // the game point that goes at blender's origin
  halfWidth: number; // faces reaching further across (x) from it than this are cropped
  scale: number;     // game units a blender metre
  route?: Vec3[];    // places along the level's route (blender metres), which its walls face
}

const ACID_MATERIAL = "acid";
const PIT_OBJECT = "pit_acid"; // a pit (builder/collision.ts) kills crash
const FLAT_IMAGE_SIZE = 8;

// a game point in blender metres from the centre: blender's y is the game's -z, its z the game's y (up)
export function toBlender([x, y, z]: Vec3, { centre, scale }: Pick<SceneOptions, "centre" | "scale">): Vec3 {
  return [(x - centre[0]) / scale, -(z - centre[2]) / scale + 0, (y - centre[1]) / scale]; // + 0 turns -0 into 0
}

const meanOf = (image: RgbImage, channel: number) =>
  image.rgb.reduce((sum, value, index) => sum + (index % 3 === channel ? value : 0), 0) / (image.width * image.height);

// whether an image is the acid's: bright yellow-green
function isAcidImage(image: RgbImage): boolean {
  const [red, green, blue] = [0, 1, 2].map((channel) => meanOf(image, channel));
  return green > 150 && red > 110 && blue < 100;
}

const hex = (colour: Rgb) => colour.map((value) => value.toString(16).padStart(2, "0")).join("");

function flatImage(colour: Rgb): RgbImage {
  const rgb = new Uint8Array(FLAT_IMAGE_SIZE * FLAT_IMAGE_SIZE * 3).map((_, index) => colour[index % 3]);
  return { width: FLAT_IMAGE_SIZE, height: FLAT_IMAGE_SIZE, rgb };
}

// what makes a polygon's texture the same as another's: its region, or its flat colour
function keyOf(texture: PolygonTexture): string {
  if (!texture.textured) {
    return `flat_${hex(texture.colour)}`;
  }
  return [texture.page, texture.x, texture.y, texture.w, texture.h, texture.clutX, texture.clutY, texture.colourMode].join("_");
}

// acid materials: acid, then acid_1, acid_2...
function acidName(count: number): string {
  if (count === 0) {
    return ACID_MATERIAL;
  }
  return `${ACID_MATERIAL}_${count}`;
}

const isAcid = (material: string) => material === ACID_MATERIAL || material.startsWith(`${ACID_MATERIAL}_`);

// the materials a level's polygons use, as they're met: a texture region's, or a flat colour's
class Materials {
  readonly materials: SceneMaterial[] = [];
  readonly images = new Map<string, RgbImage>();
  private readonly byKey = new Map<string, string>();

  constructor(private readonly texturePages: Map<number, Buffer>) {}

  of(texture: PolygonTexture): string {
    const key = keyOf(texture);
    const known = this.byKey.get(key);
    if (known) {
      return known;
    }
    const image = this.imageOf(texture);
    const name = this.nameFor(texture, image);
    this.add(key, name, image);
    return name;
  }

  private imageOf(texture: PolygonTexture): RgbImage {
    if (!texture.textured) {
      return flatImage(texture.colour);
    }
    return regionImage(this.texturePages.get(texture.page)!, texture);
  }

  private nameFor(texture: PolygonTexture, image: RgbImage): string {
    if (!texture.textured) {
      return `flat_${hex(texture.colour)}`;
    }
    if (isAcidImage(image)) {
      return acidName(this.materials.filter(({ name }) => isAcid(name)).length);
    }
    return `tex_${String(this.materials.length).padStart(3, "0")}`;
  }

  private add(key: string, name: string, image: RgbImage): void {
    this.byKey.set(key, name);
    this.images.set(`${name}.png`, image);
    this.materials.push({ name, image: `${name}.png` });
  }
}

// a polygon's UVs: its region's corners in its layout (v up); a flat colour's anywhere on its image
function polygonUvs(texture: PolygonTexture): Uv[] {
  return triangleUVs(texture.layout).map(([u, v]) => [u, 1 - v]);
}

// a polygon as a scene face, turned round (the builder takes the other corner order as facing up)
function sceneFace(world: CutWorld, polygon: BuiltPolygon, materials: Materials, options: SceneOptions): SceneFace {
  const texture = polygonTexture(world, polygon);
  const order = [0, 2, 1];
  const vertices = polygon.corners.map((index) => world.vertices[index]);
  const uvs = polygonUvs(texture);
  return {
    corners: order.map((corner) => toBlender(vertices[corner].at.map((value, axis) => value + world.origin[axis]) as Vec3, options)),
    uvs: order.map((corner) => uvs[corner]),
    colours: order.map((corner) => vertices[corner].colour),
    material: materials.of(texture),
  };
}

const FACING = 0.5; // a face whose normal's up is over this faces up, under -FACING down (FACING in builder/faces.ts)

// a face the other way round: its corners in the other order, with their UVs and colours
export function reversed({ corners, uvs, colours, material }: SceneFace): SceneFace {
  const order = [0, 2, 1];
  return { corners: order.map((corner) => corners[corner]), uvs: order.map((corner) => uvs[corner]), colours: order.map((corner) => colours[corner]), material };
}

// how much a face faces up (its unit normal's z, blender's up)
export function upness({ corners: [a, b, c] }: SceneFace): number {
  const normal = cross(subtract(b, a), subtract(c, a));
  const length = Math.hypot(...normal);
  if (length === 0) {
    return 0;
  }
  return normal[2] / length;
}

const middleOf = ({ corners }: SceneFace): Vec3 => [0, 1, 2].map((axis) => corners.reduce((sum, corner) => sum + corner[axis], 0) / 3) as Vec3;

// the place along the route nearest point, from above
function nearestOnRoute([x, y]: Vec3, route: Vec3[]): Vec3 {
  const distance = ([px, py]: Vec3) => Math.hypot(px - x, py - y);
  return [...route].sort((first, second) => distance(first) - distance(second))[0];
}

// whether a wall faces away from the route (its normal, from above, points away from the nearest place along it)
function facesAwayFromRoute(face: SceneFace, route: Vec3[]): boolean {
  const [a, b, c] = face.corners;
  const normal = cross(subtract(b, a), subtract(c, a));
  const middle = middleOf(face);
  const [routeX, routeY] = nearestOnRoute(middle, route);
  return normal[0] * (routeX - middle[0]) + normal[1] * (routeY - middle[1]) < 0;
}

const SOLID_CELL = 512; // game units: the solid index's buckets
// how far in front of and behind a wall (blender metres) its solid side is looked
// for: several depths, as the cut level's collision reaches a little past its rock
const PROBES = [0.15, 0.4, 0.8, 1.5];

// the cut level's collision (its solid boxes), to ask whether a point is inside it
export class SolidIndex {
  private readonly buckets = new Map<string, CutSolid[]>();

  constructor(solids: CutSolid[]) {
    for (const solid of solids) {
      for (const key of bucketsOver(solid)) {
        const bucket = this.buckets.get(key) ?? [];
        bucket.push(solid);
        this.buckets.set(key, bucket);
      }
    }
  }

  isSolid(point: Vec3): boolean {
    const bucket = this.buckets.get(bucketOf(point)) ?? [];
    return bucket.some(({ low, high }) => point.every((value, axis) => value >= low[axis] && value < high[axis]));
  }
}

const bucketIndex = (value: number) => Math.floor(value / SOLID_CELL);
const bucketOf = ([x, y, z]: Vec3) => [x, y, z].map(bucketIndex).join();

function bucketsOver({ low, high }: CutSolid): string[] {
  const keys: string[] = [];
  for (let i = bucketIndex(low[0]); i <= bucketIndex(high[0]); i++) {
    for (let j = bucketIndex(low[1]); j <= bucketIndex(high[1]); j++) {
      for (let k = bucketIndex(low[2]); k <= bucketIndex(high[2]); k++) {
        keys.push([i, j, k].join());
      }
    }
  }
  return keys;
}

// a blender point back in the game (the inverse of toBlender)
function fromBlender([x, y, z]: Vec3, { centre, scale }: Pick<SceneOptions, "centre" | "scale">): Vec3 {
  return [x * scale + centre[0], z * scale + centre[1], -y * scale + centre[2]];
}

type WallSide = "front" | "back" | "unknown";

// which side of a wall the cut level's collision has solid: in front of it
// (where it faces, looking level) or behind, as more of its probes are solid
// there, or neither (as many each side)
function solidSide(face: SceneFace, solids: SolidIndex, options: SceneOptions): WallSide {
  const [a, b, c] = face.corners;
  const [nx, ny] = cross(subtract(b, a), subtract(c, a));
  const length = Math.hypot(nx, ny); // level: what's below a sloping wall (the acid's ground) isn't its solid side
  if (length === 0) {
    return "unknown";
  }
  const across: Vec3 = [nx / length, ny / length, 0];
  const middle = middleOf(face);
  const solidCount = (towards: number) => PROBES.filter((depth) =>
    solids.isSolid(fromBlender(middle.map((value, axis) => value + towards * depth * across[axis]) as Vec3, options))).length;
  const [front, back] = [solidCount(1), solidCount(-1)];
  if (front > back) {
    return "front";
  }
  if (back > front) {
    return "back";
  }
  return "unknown";
}

// whether a wall should be turned round: it faces its solid side, or (where the
// collision doesn't say) it faces away from the route
function isWallBackwards(face: SceneFace, route: Vec3[], solids: SolidIndex, options: SceneOptions): boolean {
  const side = solidSide(face, solids, options);
  if (side !== "unknown") {
    return side === "front";
  }
  return route.length > 0 && facesAwayFromRoute(face, route);
}

// a face as the builder should take it. the game draws world polygons from
// both sides (SwTransformAndShadeWorlds in src/pc/gfx/soft.c doesn't cull),
// so a cut level's winding says nothing: a floor or slope faces up (the camera
// looks down on it), and a wall faces away from its solid side, as the cut
// level's collision has it (or, where that doesn't say, faces the route, where
// crash and the camera are)
function orientedFace(face: SceneFace, solids: SolidIndex, options: SceneOptions): SceneFace {
  const up = upness(face);
  if (up < -FACING) {
    return reversed(face);
  }
  if (up <= FACING && isWallBackwards(face, options.route ?? [], solids, options)) {
    return reversed(face);
  }
  return face;
}

// whether all a face's corners are within halfWidth across of the centre (in blender metres)
const isWithinWidth = (face: SceneFace, { halfWidth, scale }: SceneOptions) =>
  face.corners.every(([x]) => Math.abs(x) <= halfWidth / scale);

export function cutLevelScene(level: CutLevel, options: SceneOptions): CutLevelScene {
  const materials = new Materials(level.texturePages);
  const solids = new SolidIndex(level.solids);
  const objects: SceneObject[] = [];
  const pit: SceneObject = { name: PIT_OBJECT, faces: [] };
  for (const world of level.worlds) {
    const faces = world.polygons.map((polygon) => sceneFace(world, polygon, materials, options))
      .filter((face) => isWithinWidth(face, options)).map((face) => orientedFace(face, solids, options));
    objects.push({ name: world.name, faces: faces.filter(({ material }) => !isAcid(material)) });
    pit.faces.push(...faces.filter(({ material }) => isAcid(material)));
  }
  return { objects: [...objects, pit].filter(({ faces }) => faces.length > 0), materials: materials.materials, images: materials.images };
}
