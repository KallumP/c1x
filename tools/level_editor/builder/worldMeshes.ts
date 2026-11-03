// world meshes (wgeo): a map's faces, sliced along z so the sort list can drop
// the pieces behind the camera a little at a time (see slst.ts), and along x
// and y so textures, which cover a whole polygon, are about the same size
// everywhere; split into meshes of at most WGEO_MAX vertices and polygons
import { facesDown, facesUp, FACING, isSpawn, normal } from "./faces";
import type { Span } from "./fit";
import type { Mesh } from "./obj";
import { floorDivide, roundHalfToEven } from "./pyMath";
import { tileRegion, type RegionOnTile } from "./tileRegions";
import type { Rgb } from "./tpage";
import { cross, subtract, type Vec3 } from "./vectors";

export const WGEO_MAX = 4096;        // polygon and vertex indices are 12 bits
export const WGEO_ITEMS_MAX = 7500;  // vertices, polygons and texinfos (8 bytes each) a mesh fits in a page
                                     // beside its header
export const WORLDS_MAX = 8;         // world meshes in a zone
const LIGHT: Vec3 = [0.3, 0.8, 0.5]; // towards the light: above, a little to the side and towards the camera
const LIGHT_LENGTH = Math.sqrt(LIGHT[0] * LIGHT[0] + LIGHT[1] * LIGHT[1] + LIGHT[2] * LIGHT[2]);

// one of the level's own textures: a texinfo (word index into a mesh header's) on a texture page slot
export interface PageTexture {
  texinfo: number;
  page: number;
}

// a part of a material's tile, which becomes a texinfo once the textures are laid out
export interface TileRegion extends RegionOnTile {
  material: string;
}

export type PolygonTexture = PageTexture | TileRegion;

export const isTileRegion = (texture: PolygonTexture): texture is TileRegion => "material" in texture;

export interface WorldVertex {
  at: Vec3; // relative to its mesh's zone, on multiples of 8
  colour: Rgb;
}

export interface WorldPolygon {
  corners: [number, number, number]; // indices into its mesh's vertices
  texture: PolygonTexture;
}

export interface WorldMesh {
  vertices: WorldVertex[];
  polygons: WorldPolygon[];
}

export interface WorldMeshOptions {
  piece: number;             // faces are sliced every piece along z
  ground: PageTexture;       // on faces facing up
  side: PageTexture;         // on the rest
  tile?: number;             // and every tile along x and y (piece by default), a textured material's tile repeating as often
  textured?: Set<string>;    // the materials with their own image
  regionsMax?: number;       // tile regions (texinfos) a mesh can have
  span?: Span;               // only the pieces in this zone (on multiples of piece), relative to it
  worldsMax?: number;        // meshes there can be
}

// a face's vertex colour: grey, from 70 facing away from the light to 128 (full brightness) facing it
function shade(facing: Vec3): Rgb {
  const towardsLight = (facing[0] * LIGHT[0] + facing[1] * LIGHT[1] + facing[2] * LIGHT[2]) / LIGHT_LENGTH;
  const lit = Math.max(0, towardsLight);
  const level = roundHalfToEven(128 * (0.55 + 0.45 * lit));
  return [level, level, level];
}

// slicing

// two points in python's tuple order, so an edge is cut the same way whichever way round it is
function inOrder(p: Vec3, q: Vec3): [Vec3, Vec3] {
  for (let axis = 0; axis < 3; axis++) {
    if (p[axis] !== q[axis]) {
      return p[axis] < q[axis] ? [p, q] : [q, p];
    }
  }
  return [p, q];
}

// the part of a convex polygon on one side of the plane where axis is value. a
// cut point is worked out from the edge's ends in the same order whichever way
// round the edge is, so two faces sharing an edge get exactly the same point
function clip(points: Vec3[], axis: number, value: number, keepAbove: boolean): Vec3[] {
  const isKept = (point: Vec3) => (keepAbove ? point[axis] >= value : point[axis] <= value);
  const kept: Vec3[] = [];
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    if (isKept(point)) {
      kept.push(point);
    }
    if (isKept(point) !== isKept(next)) {
      const [low, high] = inOrder(point, next);
      const t = (value - low[axis]) / (high[axis] - low[axis]);
      const cut = [0, 1, 2].map((k) => low[k] + (high[k] - low[k]) * t) as Vec3;
      cut[axis] = value;
      kept.push(cut);
    }
  });
  return kept;
}

type Slicing = [axis: number, size: number][];

// a convex polygon cut by the planes along each (axis, size) at multiples of size
function slices(points: Vec3[], slicing: Slicing): Vec3[][] {
  if (slicing.length === 0) {
    return [points];
  }
  const [[axis, size], ...rest] = slicing;
  const coordinates = points.map((point) => point[axis]);
  const first = Math.trunc(floorDivide(Math.min(...coordinates), size));
  const last = Math.trunc(floorDivide(Math.max(...coordinates), size));
  const parts: Vec3[][] = [];
  for (let k = first; k <= last; k++) {
    const part = clip(clip(points, axis, k * size, true), axis, (k + 1) * size, false);
    if (part.length >= 3) {
      parts.push(...slices(part, rest));
    }
  }
  return parts;
}

const snapToVertexGrid = (point: Vec3) => point.map((coordinate) => roundHalfToEven(coordinate / 8) * 8) as Vec3;

const isDegenerate = (a: Vec3, b: Vec3, c: Vec3) => cross(subtract(b, a), subtract(c, a)).every((value) => value === 0);

// filling meshes

const vertexKey = ({ at, colour }: WorldVertex) => `${at.join()},${colour.join()}`;
const regionKey = (region: TileRegion) =>
  `${region.material},${region.x},${region.y},${region.w},${region.h},${region.layout}`;

// world meshes filled a triangle at a time, starting a new one when the next
// triangle wouldn't fit in the one being filled
class WorldMeshFiller {
  meshes: WorldMesh[] = [];
  private current: WorldMesh = { vertices: [], polygons: [] };
  private vertexIndex = new Map<string, number>();
  private regions = new Set<string>();

  constructor(private regionsMax?: number) {}

  private wouldOverflow(newVertices: number, newRegions: number): boolean {
    const vertices = this.current.vertices.length + newVertices;
    const polygons = this.current.polygons.length + 1;
    const regions = this.regions.size + newRegions;
    return vertices > WGEO_MAX || polygons > WGEO_MAX
      || vertices + polygons + regions > WGEO_ITEMS_MAX
      || (this.regionsMax !== undefined && regions > this.regionsMax);
  }

  private startNewMesh(): void {
    this.meshes.push(this.current);
    this.current = { vertices: [], polygons: [] };
    this.vertexIndex = new Map();
    this.regions = new Set();
  }

  private indexOf(vertex: WorldVertex): number {
    const key = vertexKey(vertex);
    if (!this.vertexIndex.has(key)) {
      this.vertexIndex.set(key, this.current.vertices.length);
      this.current.vertices.push(vertex);
    }
    return this.vertexIndex.get(key)!;
  }

  add(corners: WorldVertex[], texture: PolygonTexture): void {
    const newVertices = new Set(corners.map(vertexKey).filter((key) => !this.vertexIndex.has(key))).size;
    const region = isTileRegion(texture) ? regionKey(texture) : null;
    const newRegions = region !== null && !this.regions.has(region) ? 1 : 0;
    if (this.wouldOverflow(newVertices, newRegions)) {
      this.startNewMesh();
    }
    if (region !== null) {
      this.regions.add(region);
    }
    const indices = corners.map((corner) => this.indexOf(corner)) as [number, number, number];
    this.current.polygons.push({ corners: indices, texture });
  }

  finish(): WorldMesh[] {
    if (this.current.polygons.length) {
      this.meshes.push(this.current);
    }
    return this.meshes;
  }
}

// whether the camera never sees a face: facing down (the camera looks down on
// the level, and it would hide it), or a wall facing away from the camera
// (along -z), as it always looks that way. collision still has them
function isHidden(facing: Vec3): boolean {
  return facesDown(facing) || (facing[1] <= FACING && facing[2] < -FACING);
}

function isInSpan(part: Vec3[], span: Span): boolean {
  const middleZ = part.reduce((sum, point) => sum + point[2], 0) / part.length;
  return span[0] <= middleZ && middleZ < span[1];
}

// world meshes for a mesh's faces, sliced every piece along z and every tile
// along x and y, with ground on faces facing up and side on the rest. faces of
// the textured materials get a TileRegion instead, their tile repeating every
// tile units. a mesh's tile regions become texinfos in its header (8 bytes each,
// like a vertex), so they count towards fitting it in a page
export function worldMeshes(mesh: Mesh, options: WorldMeshOptions): WorldMesh[] {
  const { piece, ground, side, textured = new Set(), span, worldsMax = WORLDS_MAX } = options;
  const tile = options.tile || piece;
  const slicing: Slicing = [[2, piece], [0, tile], [1, tile]];
  const filler = new WorldMeshFiller(options.regionsMax);
  for (const triangle of mesh.triangles) {
    const facing = normal(mesh, triangle);
    if (!facing || isHidden(facing) || isSpawn(triangle)) {
      continue;
    }
    const pageTexture = facesUp(facing) ? ground : side;
    const isTextured = triangle.material !== null && textured.has(triangle.material);
    const colour = shade(facing);
    const corners = triangle.corners.map((index) => mesh.vertices[index]);
    for (const part of slices(corners, slicing).map((points) => points.map(snapToVertexGrid))) {
      if (span && !isInSpan(part, span)) {
        continue;
      }
      for (let k = 1; k < part.length - 1; k++) {
        const fan = [part[0], part[k], part[k + 1]];
        if (isDegenerate(fan[0], fan[1], fan[2])) {
          continue;
        }
        const texture = isTextured ? { material: triangle.material!, ...tileRegion(fan, facing, tile) } : pageTexture;
        const inZone = span ? fan.map(([x, y, z]) => [x, y, z - span[0]] as Vec3) : fan;
        filler.add(inZone.map((at) => ({ at, colour })), texture);
      }
    }
  }
  const meshes = filler.finish();
  if (meshes.length > worldsMax) {
    const where = span ? " in a zone" : "";
    throw new Error(`the map needs ${meshes.length} world meshes${where}, more than ${worldsMax}; use fewer faces`);
  }
  return meshes;
}
