// where crash starts, and the camera path that follows him along the route
// (-z, or +x for a side view), in zone units relative to the zone
import { Cells } from "./collision";
import { isSpawn } from "./faces";
import { inSpan, ROUTE_BEHIND, ROUTE_SIDE, type Route, type Span } from "./fit";
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

// the route a camera view's level runs along
export function routeOf({ view }: Camera): Route {
  if (view === "side") {
    return ROUTE_SIDE;
  }
  return ROUTE_BEHIND;
}

// a column of cells (i, k) by its place across the route and along it
function columnAt(across: number, along: number, route: Route): [number, number] {
  if (route.axis === 0) {
    return [along, across];
  }
  return [across, along];
}

// a column's place across the route and along it
function placeOf(i: number, k: number, route: Route): { across: number; along: number } {
  if (route.axis === 0) {
    return { across: k, along: i };
  }
  return { across: i, along: k };
}

// the floors in each column of cells, to find the ground crash can stand on
class Ground {
  private floorRows = new Map<string, number[]>(); // (i, k) to the rows (j) of its floor cells, lowest first

  constructor(private cells: Cells, private cell: number, private route = ROUTE_BEHIND) {
    for (const { at: [i, j, k], kind } of cells) {
      if (kind === "floor") {
        const rows = this.floorRows.get(`${i},${k}`) ?? [];
        this.floorRows.set(`${i},${k}`, [...rows, j]);
      }
    }
    this.floorRows.forEach((rows) => rows.sort((first, second) => first - second));
  }

  // each column with floor in it, by its place across the route and along it
  private floorPlaces(): { across: number; along: number }[] {
    return [...this.floorRows.keys()].map((column) => {
      const [i, k] = column.split(",").map(Number);
      return placeOf(i, k, this.route);
    });
  }

  // the lines across the route with floor in them
  columnsAcross(): number[] {
    return [...new Set(this.floorPlaces().map(({ across }) => across))];
  }

  // the places along the route with floor in line across
  rowsAlong(across: number): number[] {
    return this.floorPlaces().filter((place) => place.across === across).map(({ along }) => along);
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

// a place along a walk: how far along the route (a cell index on its axis) and the ground's top there
interface Step {
  along: number;
  top: number;
}

const stepKey = ({ along, top }: Step) => `${along},${top}`;

// where the longest walk along the route down the line across starts: from
// ground to the next place's ground a cell up or down at most, so not over walls,
// gaps or drops. the one nearest the route's start of the longest, then on along
// it until the camera, CAM_LEAD behind, is over it too
function walkStart(ground: Ground, across: number, cell: number, route: Route): Step | null {
  const { way } = route;
  const places = ground.rowsAlong(across).sort((first, second) => (second - first) * way); // the route's end first
  const tops = new Map(places.map((along) => [along, ground.tops(...columnAt(across, along, route), HEADROOM)]));
  const length = new Map<string, number>(); // cells walked from a step along the route, itself included
  const lengthOf = (step: Step) => length.get(stepKey(step))!;
  const next = new Map<string, Step | null>();
  const steps: Step[] = [];
  for (const along of places) {
    for (const top of tops.get(along)!) {
      const reachable = (tops.get(along + way) ?? [])
        .filter((onwardTop) => Math.abs(onwardTop - top) <= cell)
        .map((onwardTop) => ({ along: along + way, top: onwardTop }));
      const onward = firstBest(reachable, (candidate, best) => lengthOf(candidate) > lengthOf(best));
      const step = { along, top };
      length.set(stepKey(step), 1 + (onward ? lengthOf(onward) : 0));
      next.set(stepKey(step), onward ?? null);
      steps.push(step);
    }
  }
  // the longest walk, and of those, the one starting nearest the route's start
  const backFromEnd = (step: Step) => -way * step.along;
  const isLongerOrFurther = (candidate: Step, best: Step) =>
    lengthOf(candidate) > lengthOf(best) || (lengthOf(candidate) === lengthOf(best) && backFromEnd(candidate) > backFromEnd(best));
  let start = firstBest(steps, isLongerOrFurther);
  if (!start) {
    return null;
  }
  const stepsOn = Math.min(-floorDivide(-CAM_LEAD, cell), floorDivide(lengthOf(start), 2));
  for (let walked = 0; walked < stepsOn; walked++) {
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
// spawn..., or without one, where the longest walk along the route starts,
// down the middle across, so not behind something he can't get past
export function spawnPoint(mesh: Mesh, cells: Cells, cell: number, route = ROUTE_BEHIND): Vec3 {
  const ground = new Ground(cells, cell, route);
  const marked = spawnMarkerPoint(mesh, ground, cell);
  if (marked) {
    return marked;
  }
  for (const across of columnsFromTheMiddle(ground, cell)) {
    const start = walkStart(ground, across, cell, route);
    if (start) {
      const middleOf = (index: number) => index * cell + floorDivide(cell, 2);
      const [i, k] = columnAt(across, start.along, route);
      return [middleOf(i), start.top, middleOf(k)];
    }
  }
  throw new Error("the map has no ground for crash to start on");
}

// the ground nearest a height (the first, where two are as near)
function nearestTop(tops: number[], height: number): number {
  return tops.reduce((nearest, top) => (Math.abs(top - height) < Math.abs(nearest - height) ? top : nearest));
}

// the height of the ground crash walks on, column by column: the ground nearest
// the last height, which is kept over gaps
function groundFollower(ground: Ground, startHeight: number): (i: number, k: number) => number {
  let height = startHeight;
  return (i, k) => {
    const tops = i >= 0 && k >= 0 ? ground.tops(i, k) : [];
    if (tops.length) {
      height = nearestTop(tops, height);
    }
    return height;
  };
}

// points step apart along -z from behind crash's start to the far end of the
// zone, offsets.height above the ground offsets.lead ahead of each, along crash's start x
function pathBehind(ground: Ground, size: Vec3, cell: number, start: Vec3, step: number, offsets: CameraOffsets): Vec3[] {
  const [x, startHeight, z] = start;
  const i = floorDivide(x, cell);
  const heightAt = groundFollower(ground, startHeight);
  const points: Vec3[] = [];
  for (let cameraZ = Math.min(z + offsets.lead, size[2] - CAM_EDGE); cameraZ > CAM_EDGE; cameraZ -= step) {
    const height = heightAt(i, floorDivide(cameraZ - offsets.lead, cell));
    points.push([x + CAM_OFFSET[0], height + offsets.height, cameraZ]);
  }
  return points;
}

// points step apart along +x the whole zone, so the camera follows crash
// whichever way he goes from his start, offsets.lead out across from him (+z)
// and offsets.height above the ground beside each, along crash's start z
function pathBeside(ground: Ground, size: Vec3, cell: number, start: Vec3, step: number, offsets: CameraOffsets): Vec3[] {
  const [, startHeight, z] = start;
  const k = floorDivide(z, cell);
  const heightAt = groundFollower(ground, startHeight);
  const points: Vec3[] = [];
  for (let cameraX = CAM_EDGE; cameraX < size[0] - CAM_EDGE; cameraX += step) {
    const height = heightAt(floorDivide(cameraX, cell), k);
    points.push([cameraX, height + offsets.height, z + offsets.lead]);
  }
  return points;
}

// the camera path that follows crash along the route from his start: behind
// him, or beside him for a side view
export function cameraPath(cells: Cells, size: Vec3, cell: number, start: Vec3, step: number, offsets = USUAL_OFFSETS, route = ROUTE_BEHIND): Vec3[] {
  const ground = new Ground(cells, cell);
  if (route === ROUTE_SIDE) {
    return pathBeside(ground, size, cell, start, step, offsets);
  }
  return pathBehind(ground, size, cell, start, step, offsets);
}

// how far along the route crash is ahead of the camera: lead behind him, none beside him
function crashAhead(route: Route, lead: number): number {
  if (route === ROUTE_SIDE) {
    return 0;
  }
  return route.way * lead;
}

// which zone span a place along the route's axis is in (past either end of the map, the end one)
export function zoneIndex(spans: Span[], along: number): number {
  const low = Math.min(...spans.map(([start]) => start));
  const high = Math.max(...spans.map(([, end]) => end));
  const clamped = Math.min(Math.max(along, low), high - 1);
  return spans.findIndex(([start, end]) => start <= clamped && clamped < end);
}

// camera path points split into each zone span's path, by the zone crash is in
// (lead ahead along the route behind him, CAM_LEAD as on n. sanity beach; level
// with the camera beside him), relative to it; zones before crash's start have none
export function zonePaths(points: Vec3[], spans: Span[], lead = CAM_LEAD, route = ROUTE_BEHIND): Vec3[][] {
  const paths: Vec3[][] = spans.map(() => []);
  for (const point of points) {
    const zone = zoneIndex(spans, point[route.axis] + crashAhead(route, lead));
    paths[zone].push(inSpan(point, spans[zone], route));
  }
  return paths;
}
