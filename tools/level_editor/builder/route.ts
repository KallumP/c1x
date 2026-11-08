// where crash starts, and the camera path that follows him along the route
// (-z), in zone units relative to the zone
import { Cells } from "./collision";
import { isSpawn } from "./faces";
import type { Span } from "./fit";
import type { Mesh } from "./obj";
import { floorDivide, roundHalfToEven } from "./pyMath";
import type { Vec3 } from "./vectors";
import { DEFAULT_CAMERA, type Camera } from "../src/camera";

export const CAM_OFFSET = [101, 1316]; // follow camera from crash: x, height (as on n. sanity beach)
export const CAM_LEAD = 1450;          // how far ahead of the camera crash is (as on the beach)
const CAM_EDGE = 200;                  // how far in from the zone's ends the camera path stays

// how far behind crash (along the route) and above him the camera is, in game units
export interface CameraOffsets {
  lead: number;
  height: number;
}

// where a level's camera is from crash: CAM_LEAD behind and CAM_OFFSET's height
// above, turned up or down about him by how far its angle is from the usual
// one, and scaled by its distance
export function cameraOffsets({ distance, angle }: Camera): CameraOffsets {
  const turn = ((angle - DEFAULT_CAMERA.angle) * Math.PI) / 180;
  const lead = CAM_LEAD * Math.cos(turn) - CAM_OFFSET[1] * Math.sin(turn);
  const height = CAM_LEAD * Math.sin(turn) + CAM_OFFSET[1] * Math.cos(turn);
  return { lead: Math.round(lead * distance), height: Math.round(height * distance) };
}

const USUAL_OFFSETS: CameraOffsets = { lead: CAM_LEAD, height: CAM_OFFSET[1] };
const HEADROOM = 2;                    // empty cells crash needs above the ground to start on it

// the floors in each column of cells, to find the ground crash can stand on
class Ground {
  private floorRows = new Map<string, number[]>(); // (i, k) to the rows (j) of its floor cells, lowest first

  constructor(private cells: Cells, private cell: number) {
    for (const { at: [i, j, k], kind } of cells) {
      if (kind === "floor") {
        const rows = this.floorRows.get(`${i},${k}`) ?? [];
        this.floorRows.set(`${i},${k}`, [...rows, j]);
      }
    }
    this.floorRows.forEach((rows) => rows.sort((first, second) => first - second));
  }

  // the columns across (i) with floor in them
  columnsAcross(): number[] {
    return [...new Set([...this.floorRows.keys()].map((column) => Number(column.split(",")[0])))];
  }

  // the rows along (k) with floor in column i
  rowsAlong(i: number): number[] {
    return [...this.floorRows.keys()].map((column) => column.split(",").map(Number))
      .filter(([columnI]) => columnI === i).map(([, k]) => k);
  }

  // the tops of the floor cells in column (i, k) with headroom empty cells above them, lowest first
  tops(i: number, k: number, headroom = 1): number[] {
    const rows = this.floorRows.get(`${i},${k}`) ?? [];
    const hasRoomAbove = (j: number) => Array.from({ length: headroom }, (_, h) => j + h + 1).every((above) => !this.cells.has([i, above, k]));
    return rows.filter(hasRoomAbove).map((j) => (j + 1) * this.cell);
  }
}

// the first of values that no later one is better than
function firstBest<T>(values: T[], isBetter: (value: T, best: T) => boolean): T | undefined {
  let best: T | undefined;
  for (const value of values) {
    if (best === undefined || isBetter(value, best)) {
      best = value;
    }
  }
  return best;
}

// a place along a walk: a row (k) and the ground's top there
interface Step {
  k: number;
  top: number;
}

const stepKey = ({ k, top }: Step) => `${k},${top}`;

// where the longest walk along the route (-z) down column i starts: from ground
// to the next row's ground a cell up or down at most, so not over walls, gaps or
// drops. the +z most of the longest, then on along it until the camera, CAM_LEAD
// behind, is over it too
function walkStart(ground: Ground, i: number, cell: number): Step | null {
  const rows = ground.rowsAlong(i).sort((first, second) => first - second);
  const tops = new Map(rows.map((k) => [k, ground.tops(i, k, HEADROOM)]));
  const length = new Map<string, number>(); // cells walked from a step along -z, itself included
  const lengthOf = (step: Step) => length.get(stepKey(step))!;
  const next = new Map<string, Step | null>();
  const steps: Step[] = [];
  for (const k of rows) {
    for (const top of tops.get(k)!) {
      const reachable = (tops.get(k - 1) ?? [])
        .filter((below) => Math.abs(below - top) <= cell)
        .map((below) => ({ k: k - 1, top: below }));
      const onward = firstBest(reachable, (candidate, best) => lengthOf(candidate) > lengthOf(best));
      const step = { k, top };
      length.set(stepKey(step), 1 + (onward ? lengthOf(onward) : 0));
      next.set(stepKey(step), onward ?? null);
      steps.push(step);
    }
  }
  // the longest walk, and of those, the one starting furthest along +z
  const isLongerOrFurther = (candidate: Step, best: Step) =>
    lengthOf(candidate) > lengthOf(best) || (lengthOf(candidate) === lengthOf(best) && candidate.k > best.k);
  let start = firstBest(steps, isLongerOrFurther);
  if (!start) {
    return null;
  }
  const along = Math.min(-floorDivide(-CAM_LEAD, cell), floorDivide(lengthOf(start), 2));
  for (let walked = 0; walked < along; walked++) {
    start = next.get(stepKey(start))!;
  }
  return start;
}

// (x, y, z) on the highest ground below at, or at most a cell above it; with none, an error naming what
function groundBelow(ground: Ground, [x, y, z]: Vec3, cell: number, what: string): Vec3 {
  const column = [floorDivide(x, cell), floorDivide(z, cell)].map(Math.trunc);
  const tops = ground.tops(column[0], column[1]).filter((top) => top <= y + cell);
  if (tops.length === 0) {
    throw new Error(`there's no ground below ${what}`);
  }
  return [roundHalfToEven(x), tops[tops.length - 1], roundHalfToEven(z)];
}

// where an object named spawn... puts crash: on the ground below its middle
function spawnMarkerPoint(mesh: Mesh, ground: Ground, cell: number): Vec3 | null {
  const marker = new Set(mesh.triangles.filter(isSpawn).flatMap((triangle) => triangle.corners));
  if (marker.size === 0) {
    return null;
  }
  const corners = [...marker].map((index) => mesh.vertices[index]);
  const middle = (axis: number) => corners.reduce((sum, corner) => sum + corner[axis], 0) / corners.length;
  const bottom = Math.min(...corners.map((corner) => corner[1]));
  return groundBelow(ground, [middle(0), bottom, middle(2)], cell, "the spawn object");
}

// the columns across, nearest the middle of the floors first (the lower first, where two are as near)
function columnsFromTheMiddle(ground: Ground, cell: number): number[] {
  const columns = ground.columnsAcross().sort((first, second) => first - second);
  if (columns.length === 0) {
    return [];
  }
  const middle = ((columns[0] + columns[columns.length - 1] + 1) * cell) / 2;
  const distance = (i: number) => Math.abs((i + 0.5) * cell - middle);
  return columns.sort((first, second) => distance(first) - distance(second));
}

// where crash starts: on the ground below the middle of an object named
// spawn..., or without one, where the longest walk along the route (-z)
// starts, down the middle across, so not behind something he can't get past
export function spawnPoint(mesh: Mesh, cells: Cells, cell: number): Vec3 {
  const ground = new Ground(cells, cell);
  const marked = spawnMarkerPoint(mesh, ground, cell);
  if (marked) {
    return marked;
  }
  for (const i of columnsFromTheMiddle(ground, cell)) {
    const start = walkStart(ground, i, cell);
    if (start) {
      const middleOf = (index: number) => index * cell + floorDivide(cell, 2);
      return [middleOf(i), start.top, middleOf(start.k)];
    }
  }
  throw new Error("the map has no ground for crash to start on");
}

// the ground nearest a height (the first, where two are as near)
function nearestTop(tops: number[], height: number): number {
  return tops.reduce((nearest, top) => (Math.abs(top - height) < Math.abs(nearest - height) ? top : nearest));
}

// camera path points, step apart along -z from behind crash's start to the far
// end of the zone, offsets.height above the ground offsets.lead ahead of each
// point (the ground nearest the last height, which is kept over gaps), along crash's start x
export function cameraPath(cells: Cells, size: Vec3, cell: number, start: Vec3, step: number, offsets = USUAL_OFFSETS): Vec3[] {
  const ground = new Ground(cells, cell);
  const [x, startHeight, z] = start;
  const i = floorDivide(x, cell);
  let height = startHeight;
  const points: Vec3[] = [];
  for (let cameraZ = Math.min(z + offsets.lead, size[2] - CAM_EDGE); cameraZ > CAM_EDGE; cameraZ -= step) {
    const k = floorDivide(cameraZ - offsets.lead, cell);
    const tops = k >= 0 ? ground.tops(i, k) : [];
    if (tops.length) {
      height = nearestTop(tops, height);
    }
    points.push([x + CAM_OFFSET[0], height + offsets.height, cameraZ]);
  }
  return points;
}

// which zone span z is in (past either end of the map, the end one)
export function zoneIndex(spans: Span[], z: number): number {
  const clamped = Math.min(Math.max(z, spans[spans.length - 1][0]), spans[0][1] - 1);
  return spans.findIndex(([z0, z1]) => z0 <= clamped && clamped < z1);
}

// camera path points split into each zone span's path, by the zone crash is in
// (lead ahead, along -z; CAM_LEAD as on n. sanity beach), with z relative to it;
// zones before crash's start have none
export function zonePaths(points: Vec3[], spans: Span[], lead = CAM_LEAD): Vec3[][] {
  const paths: Vec3[][] = spans.map(() => []);
  for (const [x, y, z] of points) {
    const zone = zoneIndex(spans, z - lead);
    paths[zone].push([x, y, z - spans[zone][0]]);
  }
  return paths;
}
