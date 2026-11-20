// sort lists (slst, see src/formats/slst.h and src/slst.c): for each camera
// path point, the polygons the game draws, in the order it draws them
import { ByteWriter, padTo4 } from "./bytes";
import type { Vec3 } from "./vectors";
import type { BuiltPolygon } from "./worldGeometry";
import type { WorldVertex } from "./worldMeshes";

export const POLY_IDS_MAX = 4095; // polygons the game lists for custom levels (SLST_CUSTOM_POLY_IDS in src/slst.h)
const SLST_FULL = 0;               // item types: SlstUpdate copies an even one, applies an odd one
const SLST_CHANGE = 1;
const SLST_RUN_MAX = 16;           // ids a change node can hold
const SLST_NEXT = 0x8000;          // a node's id flag: this one goes one place on from the last
export const SLST_NEAR = 64;       // how far in front of the camera a polygon has to be to be listed

// a polygon's id: flag:1, world mesh index:3, polygon index:12
export const polyId = (world: number, polygon: number) => (world << 12) | polygon;

function slstItem(type: number, words: number[]): Buffer {
  const writer = new ByteWriter().u16(words.length).u16(type);
  words.forEach((word) => writer.u16(word));
  return padTo4(writer.toBuffer());
}

const slstFull = (ids: number[]) => slstItem(SLST_FULL, ids);

// runs of places next to each other, at most SLST_RUN_MAX long
function consecutiveRuns(places: number[]): number[][] {
  const runs: number[][] = [];
  let rest = places;
  while (rest.length) {
    let length = 1;
    while (length < Math.min(rest.length, SLST_RUN_MAX) && rest[length] === rest[0] + length) {
      length++;
    }
    runs.push(rest.slice(0, length));
    rest = rest.slice(length);
  }
  return runs;
}

// remove nodes: (count - 1) << 12 | the first id's place in before, plus 1,
// then the ids, each after the first flagged as the next place on
function removeNodes(before: number[], after: Set<number>): number[] {
  const gone = before.flatMap((id, place) => (after.has(id) ? [] : [place]));
  return consecutiveRuns(gone).flatMap((run) => [
    ((run.length - 1) << 12) | (run[0] + 1),
    before[run[0]],
    ...run.slice(1).map((place) => before[place] | SLST_NEXT),
  ]);
}

// add nodes: (count - 1) << 12 | how many of before's kept ids come first,
// then the ids, which go in together there
function addNodes(after: number[], before: Set<number>): number[] {
  const nodes: number[] = [];
  let kept = 0;
  let waiting: number[] = [];
  for (const id of [...after, null]) {
    if (id !== null && !before.has(id)) {
      waiting.push(id);
      continue;
    }
    while (waiting.length) {
      const run = waiting.slice(0, SLST_RUN_MAX);
      nodes.push(((run.length - 1) << 12) | kept, ...run);
      waiting = waiting.slice(SLST_RUN_MAX);
    }
    kept++;
  }
  return nodes;
}

// a sort list item that turns list before into list after, going forward along
// the path, and after into before going back (SlstDecodeForward and
// SlstDecodeBackward in src/slst.c). both lists have to be in the same order, so
// it only removes and adds ids, without swaps
export function slstChange(before: number[], after: number[]): Buffer {
  const removes = removeNodes(before, new Set(after));
  const adds = addNodes(after, new Set(before));
  const split = 2 + removes.length;
  const swaps = split + adds.length;
  return slstItem(SLST_CHANGE, [split, swaps, ...removes, ...adds]);
}

// how far a side view sees either side of its camera: this much for each unit
// in front of it (the game's view is about 0.8), and a margin
const SIDE_VIEW_SLOPE = 1;
const SIDE_VIEW_MARGIN = 512;

// where a polygon is across a side view: its least and greatest x, and its
// farthest place along the view
export interface SideExtent {
  xMin: number;
  xMax: number;
  far: number;
}

// a side view's camera on its way from x to the next point's x
interface SideCamera {
  x: number;
  nextX: number;
}

interface ListedPolygon {
  zmax: number;
  zmid: number;
  id: number;
  side?: SideExtent;
}

// whether a side view sees a polygon from a camera at cameraZ anywhere on its
// way along x; the further away the polygon, the more the view takes in either side
function isAlongside({ xMin, xMax, far }: SideExtent, cameraZ: number, { x, nextX }: SideCamera): boolean {
  const reach = (cameraZ - far) * SIDE_VIEW_SLOPE + SIDE_VIEW_MARGIN;
  return xMax >= Math.min(x, nextX) - reach && xMin <= Math.max(x, nextX) + reach;
}

// whether a polygon is on screen: in front of the camera for the whole step to
// the next point, and in a side view, near enough either side of it
function isOnScreen(polygon: ListedPolygon, cameraZ: number, step: number, near: number, side?: SideCamera): boolean {
  if (polygon.zmax >= cameraZ - step - near) {
    return false;
  }
  if (!side || !polygon.side) {
    return true;
  }
  return isAlongside(polygon.side, cameraZ, side);
}

// the polygons on screen from a camera at cameraZ for the whole step to the next
// point, at most POLY_IDS_MAX (the nearest), farthest first by their middles
function listAt(polygons: ListedPolygon[], cameraZ: number, step: number, near: number, side?: SideCamera): number[] {
  let front = polygons.filter((polygon) => isOnScreen(polygon, cameraZ, step, near, side));
  if (front.length > POLY_IDS_MAX) { // too many to list: leave out the farthest
    front = [...front].sort((first, second) => second.zmax - first.zmax).slice(0, POLY_IDS_MAX);
  }
  return [...front].sort((first, second) => first.zmid - second.zmid || first.id - second.id).map(({ id }) => id);
}

// a sort list for a camera path along -z (cameras at cameraZs): for each point,
// the polygons (of each world, by their largest z, one list per world) that stay
// in front of the camera all the way to the next point, so none is ever drawn
// from behind the camera, which the renderer would project mirrored.
//
// the game draws a list in order with no depth test (SwTransformAndShadeWorlds
// in src/pc/gfx/soft.c), so each is farthest first by the polygons' middle z
// (worldZmid, laid out like worldZmax; their largest z if not given).
//
// LevelUpdate copies item 0 at the first point and item N (one past the last
// point) at the last, so those are full lists; between them, item k is the
// change from point k-1's list to point k's. as every list is in the same
// order, a change is only what comes into view and what leaves it, so a long
// path stays small
//
// a side view (sideView: each world's polygons' extents across it, and the
// cameras' x) lists only the polygons near enough either side of the camera to see
export function slstItems(
  worldZmax: number[][],
  cameraZs: number[],
  step: number,
  near: number,
  worldZmid = worldZmax,
  sideView?: SideView,
): Buffer[] {
  const polygons = worldZmax.flatMap((zmaxes, world) => zmaxes.map((zmax, index) => ({
    zmax,
    zmid: worldZmid[world][index],
    id: polyId(world, index),
    side: sideView?.extents[world][index],
  })));
  const lists = cameraZs.map((cameraZ, index) => listAt(polygons, cameraZ, step, near, sideCameraAt(sideView, index)));
  const changes = lists.slice(1).map((list, index) => slstChange(lists[index], list));
  return [slstFull(lists[0]), ...changes, slstFull(lists[lists.length - 1])];
}

// a side view's polygons' extents across it, by world, and its cameras' x
export interface SideView {
  extents: SideExtent[][];
  cameraXs: number[];
}

// the side view's camera at a point, on its way to the next (staying put at the last)
function sideCameraAt(sideView: SideView | undefined, index: number): SideCamera | undefined {
  if (!sideView) {
    return undefined;
  }
  const { cameraXs } = sideView;
  return { x: cameraXs[index], nextX: cameraXs[index + 1] ?? cameraXs[index] };
}

// a world mesh a zone's sort list covers, with its offset into the zone's frame
// along z, and along x (a side view's neighbouring zones)
export interface ListedMesh {
  vertices: WorldVertex[];
  polygons: BuiltPolygon[];
  zOffset: number;
  xOffset?: number;
}

// how far a point is along a camera's view, backwards: its z and height seen by
// a camera facing -z and looking lookDown (radians) below level. as with z
// alone (a level camera), less is further in front
const backAlongView = (z: number, height: number, lookDown: number) => z * Math.cos(lookDown) + height * Math.sin(lookDown);

// each camera's place along its view, at the lower of its height and the next
// point's, as the camera may go down between them
function cameraPlaces(cameras: Vec3[], lookDown: number): number[] {
  return cameras.map(([, height, z], index) => {
    const lower = Math.min(height, (cameras[index + 1] ?? cameras[index])[1]);
    return backAlongView(z, lower, lookDown);
  });
}

// each mesh's polygons' places along the view: their corners' furthest back
function polygonPlaces({ vertices, polygons, zOffset }: ListedMesh, lookDown: number): number[] {
  return polygons.map(({ corners }) => Math.max(...corners.map((index) => {
    const [, height, z] = vertices[index].at;
    return backAlongView(z + zOffset, height, lookDown);
  })));
}

// each mesh's polygons' middle z, to draw them farthest first
function polygonMiddles({ vertices, polygons, zOffset }: ListedMesh): number[] {
  return polygons.map(({ corners }) => {
    const [a, b, c] = corners.map((index) => vertices[index].at[2]);
    return (a + b + c) / 3 + zOffset;
  });
}

// each mesh's polygons' extents across a side view: their corners' least and
// greatest x (offset into the zone's frame) and farthest place along the view
function polygonSideExtents({ vertices, polygons, zOffset, xOffset = 0 }: ListedMesh, lookDown: number): SideExtent[] {
  return polygons.map(({ corners }) => {
    const points = corners.map((index) => vertices[index].at);
    const xs = points.map(([x]) => x + xOffset);
    const places = points.map(([, height, z]) => backAlongView(z + zOffset, height, lookDown));
    return { xMin: Math.min(...xs), xMax: Math.max(...xs), far: Math.min(...places) };
  });
}

// a side view of the meshes from the cameras, or none for a view from behind
function sideViewOf(listed: ListedMesh[], cameras: Vec3[], lookDown: number, isSideView: boolean): SideView | undefined {
  if (!isSideView) {
    return undefined;
  }
  return { extents: listed.map((mesh) => polygonSideExtents(mesh, lookDown)), cameraXs: cameras.map(([x]) => x) };
}

// slstItems for a zone's path (its cameras' points, looking lookDown below level)
// over the meshes it lists: its own (offset 0) and its neighbours'. a camera
// looking down sees the floor reaching back under it, so whether a polygon is
// in front is taken along its view, not along z. a side view lists only what's
// near enough either side of the camera to see
export function zoneSlstItems(listed: ListedMesh[], cameras: Vec3[], step: number, lookDown = 0, isSideView = false): Buffer[] {
  const worldPlaces = listed.map((mesh) => polygonPlaces(mesh, lookDown));
  const viewStep = step * Math.cos(lookDown);
  const sideView = sideViewOf(listed, cameras, lookDown, isSideView);
  return slstItems(worldPlaces, cameraPlaces(cameras, lookDown), viewStep, SLST_NEAR, listed.map(polygonMiddles), sideView);
}
