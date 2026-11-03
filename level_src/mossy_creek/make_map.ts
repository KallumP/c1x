// makes mossy_creek.obj, .mtl and objects.json: an organic level, made for
// c1x. run it from tools/level_editor (npx tsx ../../level_src/mossy_creek/make_map.ts);
// it writes next to itself.
//
// the ground is a heightfield on a 1 m grid, cut along the contours of smooth
// fields (water, stones, boulders, terraces, the rim, painted paths), so shores
// and ledges are curves rather than grid lines. each piece between the cuts is
// flat or gently rolling; where neighbouring pieces have different heights, a
// wall joins them. it's all one surface, so nothing overlaps (the game has no
// depth test for level geometry).
//
// blender coordinates: x across, y along the route, z up; the .obj is written as
// blender's default export (x, z, -y). numbers are rounded and written as python
// did, so the files come out as make_map.py made them
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const NAME = "mossy_creek";

// python's numbers

// round(x, digits): the exact value rounded to digits decimals, halves to even, keeping the sign of a zero
export function pythonRound(x: number, digits: number): number {
  const [whole, fraction] = Math.abs(x).toFixed(100).split(".");
  const kept = whole + fraction.slice(0, digits);
  const rest = fraction.slice(digits);
  const isHalf = /^50*$/.test(rest);
  const isOverHalf = rest[0] > "5" || (rest[0] === "5" && !isHalf);
  const isOddBelow = Number(kept[kept.length - 1]) % 2 === 1;
  const rounded = (BigInt(kept) + (isOverHalf || (isHalf && isOddBelow) ? 1n : 0n)).toString().padStart(digits + 1, "0");
  const magnitude = Number(`${rounded.slice(0, rounded.length - digits)}.${rounded.slice(rounded.length - digits)}`);
  return x < 0 || Object.is(x, -0) ? -magnitude : magnitude;
}

const isNegative = (x: number) => x < 0 || Object.is(x, -0);

// "%.4f" % x for an x already rounded to 4 decimals
const fixed4 = (x: number) => `${isNegative(x) ? "-" : ""}${Math.abs(x).toFixed(4)}`;

// repr(x): the shortest digits that read back as x, with a .0 on whole numbers
export function pythonFloat(x: number): string {
  const digits = String(Math.abs(x));
  const sign = isNegative(x) ? "-" : "";
  return sign + (Number.isInteger(x) ? `${digits}.0` : digits);
}

// the 2d grid

const X0 = -15.0; // across
const X1 = 15.0;
const Y0 = -4.0;  // along the route
const Y1 = 116.0;
// the game slices the map every 1.28 m along the route and 2.56 m across, from
// 0.32 m (its margin) outside the map's corner (the -x, far +y one). the grid's
// lines are on those slices, so they don't cut it up any more
const SLICE_Y = 1.28;
const SLICE_X = 2.56;
const MARGIN = 0.32;
const byValue = (first: number, second: number) => first - second;
const sliceRows = Array.from({ length: Math.trunc((Y1 - Y0) / SLICE_Y) }, (_, index) => Y1 + MARGIN - SLICE_Y * (index + 1));
const ROWS_BEFORE = [Y1, ...sliceRows].sort(byValue);
// and twice as many rows over the creek and the pond, so the stones and lily pads
// (which are only a little bigger than a cell) keep their shape
const FINE = [[18.0, 35.0], [80.0, 98.0]];
const isFine = (y: number) => FINE.some(([low, high]) => low < y && y < high);
const halfRows = ROWS_BEFORE.slice(0, -1).flatMap((y, index) => (isFine(y) ? [(y + ROWS_BEFORE[index + 1]) / 2] : []));
const YS = [...ROWS_BEFORE, ...halfRows].sort(byValue);
// across: every half slice in the middle, a slice out on the hilltops nobody walks on
const XS = [
  X0, X0 - MARGIN + SLICE_X,
  ...Array.from({ length: 17 }, (_, index) => X0 - MARGIN + (SLICE_X * (index + 4)) / 2),
  X0 - MARGIN + SLICE_X * 11, X1,
];
const WL = -1.0; // water level
const END = 108;  // where the warp pad is

// noise

function hash2(i: number, j: number, seed: number): number {
  const mixed = i * 374761393 + j * 668265263 + seed * 2147483647; // exact: well under 2^53
  let h = ((mixed % 2 ** 32) + 2 ** 32) % 2 ** 32;
  h = Math.imul((h ^ (h >>> 13)) >>> 0, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) & 0xffff) / 32767.5 - 1.0;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

function valueNoise(x: number, y: number, seed: number): number {
  const [i, j] = [Math.floor(x), Math.floor(y)];
  const [fx, fy] = [smooth(x - i), smooth(y - j)];
  const [a, b] = [hash2(i, j, seed), hash2(i + 1, j, seed)];
  const [c, d] = [hash2(i, j + 1, seed), hash2(i + 1, j + 1, seed)];
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

function fbm(x: number, y: number, seed: number, octaves = 3): number {
  let [total, amplitude, norm] = [0.0, 1.0, 0.0];
  for (let octave = 0; octave < octaves; octave++) {
    total += amplitude * valueNoise(x, y, seed + octave * 17);
    norm += amplitude;
    [x, y, amplitude] = [x * 2.03, y * 2.03, amplitude * 0.5];
  }
  return total / norm;
}

const clamp01 = (t: number) => Math.min(Math.max(t, 0.0), 1.0);

function smoothStep(a: number, b: number, t: number): number {
  if (a === b) {
    return t >= b ? 1.0 : 0.0;
  }
  return smooth(clamp01((t - a) / (b - a)));
}

// a smooth max of a and b, rounded over k
function smoothMax(a: number, b: number, k = 1.5): number {
  const h = clamp01(0.5 + (0.5 * (a - b)) / k);
  return b + (a - b) * h + k * h * (1 - h);
}

// smoothly between (t, value) keys
function lerpKeys(keys: [number, number][], t: number): number {
  if (t <= keys[0][0]) {
    return keys[0][1];
  }
  for (let index = 0; index + 1 < keys.length; index++) {
    const [[t0, v0], [t1, v1]] = [keys[index], keys[index + 1]];
    if (t <= t1) {
      return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0));
    }
  }
  return keys[keys.length - 1][1];
}

// the shape of the level

type Field = (x: number, y: number) => number;

// the middle of the trail
const pathX = (y: number) => 3.2 * Math.sin(y * 0.105) + 1.6 * Math.sin(y * 0.27 + 1.3);

const GROUND: [number, number][] = [
  [-10, 0.0], [20, 0.0], [36, 0.0], [44, 0.35], [54, 0.2], [72, 2.2], [77, 2.2], [82, 0.0], [98, 0.0], [104, 1.2], [130, 1.2],
];

function baseHeight(x: number, y: number): number {
  const fromPath = Math.abs(x - pathX(y));
  let hills = 0.7 * smoothStep(2.5, 8.0, fromPath) * (0.6 + 0.5 * fbm(x * 0.15, y * 0.15, 3));
  hills *= smoothStep(14, 22, y); // the beach is flat
  const dunes = 0.18 * fbm(x * 0.3, y * 0.3, 7);
  return lerpKeys(GROUND, y) + hills + dunes;
}

// the sea on the left of the beach
function lagoon(x: number, y: number): number {
  const shore = -4.5 + 1.8 * Math.sin(y * 0.33) + 1.2 * fbm(x * 0.2, y * 0.2, 11);
  return Math.min(shore - x, 17.5 + 2.0 * fbm(x * 0.2, 0.0, 12) - y);
}

const riverY = (x: number) => 25.0 + 1.4 * Math.sin(x * 0.28) + 0.8 * fbm(x * 0.25, 0.0, 21);

function river(x: number, y: number): number {
  const width = 4.5 + 0.4 * fbm(x * 0.3, 1.0, 22);
  return width - Math.abs(y - riverY(x));
}

const POND = [pathX(89) - 1.5, 89.0];

function pond(x: number, y: number): number {
  const [dx, dy] = [(x - POND[0]) / 6.5, (y - POND[1]) / 5.0];
  const wobble = 0.12 * fbm(x * 0.35, y * 0.35, 31);
  return (1.0 + wobble - Math.sqrt(dx * dx + dy * dy)) * 4.5;
}

const wet: Field = (x, y) => Math.max(lagoon(x, y), river(x, y), pond(x, y));

// a roundish field: r - distance, with its edge wobbling
function blob(centreX: number, centreY: number, r: number, seed: number, wobble = 0.18): Field {
  return (x, y) => {
    const angle = Math.atan2(y - centreY, x - centreX);
    const radius = r * (1 + wobble * (0.6 * Math.sin(3 * angle + seed) + 0.4 * Math.sin(5 * angle + seed * 1.7)));
    return radius - Math.hypot(x - centreX, y - centreY);
  };
}

const onPath = (y: number, dx = 0.0) => pathX(y) + dx;

// where the trail goes into the creek and comes out of it, along y
function crossing(): [number, number] {
  const ys = Array.from({ length: 36 * 20 - 15 * 20 }, (_, index) => (15 * 20 + index) / 20);
  const inside = ys.filter((y) => river(pathX(y), y) > 0);
  return [inside[0], inside[inside.length - 1]];
}

type Circle = [x: number, y: number, r: number];

// stones evenly across the creek on the trail: the gaps between them, and to the banks, all the same
function steppingStones(count = 3, r = 0.95, wobble = [0.3, -0.4, 0.25]): Circle[] {
  const [y0, y1] = crossing();
  const gap = (y1 - y0 - 2 * r * count) / (count + 1);
  return Array.from({ length: count }, (_, k) => {
    const y = y0 + gap + r + k * (gap + 2 * r);
    return [onPath(y, wobble[k]), y, r];
  });
}

// stepping stones across the creek, along the trail, and some to the side
const STONES: Circle[] = [...steppingStones(), [-7.5, 24.2, 1.0], [8.5, 26.8, 1.0], [-11.0, 26.5, 1.2]];
// lily pads across the pond
const PADS: Circle[] = [
  [POND[0] - 2.2, 84.6, 1.15], [POND[0] - 3.6, 87.2, 1.1], [POND[0] - 1.9, 89.7, 1.2],
  [POND[0] - 3.4, 92.2, 1.05], [POND[0] + 1.6, 88.6, 0.9], [POND[0] + 3.4, 91.0, 0.8],
];
const ISLANDS = [
  ...STONES.map(([x, y, r], k) => blob(x, y, r, 3 + k, 0.1)),
  ...PADS.map(([x, y, r], k) => blob(x, y, r, 40 + k, 0.08)),
];

const water: Field = (x, y) => Math.min(wet(x, y), -Math.max(...ISLANDS.map((island) => island(x, y))));

const corridor = (y: number) => 9.0 + 1.6 * fbm(0.0, y * 0.07, 51);

// the hills either side and at the ends
const rim: Field = (x, y) => {
  const side = Math.abs(x - 0.5 * pathX(y)) - corridor(y) + 1.4 * fbm(x * 0.22, y * 0.22, 52);
  const ends = Math.max(-1.0 - y, y - (END + 5.0)) + 1.5 * fbm(x * 0.2, y * 0.2, 53);
  return smoothMax(side, ends, 1.0);
};

const rimHeight = (x: number, y: number) => 3.3 + 1.0 * smoothStep(0, 4, rim(x, y)) + 0.4 * fbm(x * 0.12, y * 0.12, 54);

// rounded mossy boulders: x, y, radius, edge height, dome height
type Boulder = [x: number, y: number, r: number, edge: number, dome: number];
const BOULDERS: Boulder[] = [
  [7.2, 6.5, 1.3, 0.5, 0.4], [-2.4, 15.2, 1.0, 0.4, 0.3],
  [onPath(37, 3.6), 37.0, 1.6, 0.6, 0.5], [onPath(40, -4.2), 40.0, 2.0, 0.7, 0.6],
  [onPath(45, 3.0), 45.0, 1.2, 0.5, 0.3], [onPath(48.5, -2.9), 48.5, 1.4, 0.55, 0.4],
  [onPath(78, 4.5), 78.0, 1.5, 0.6, 0.5], [onPath(97, -4.5), 97.0, 1.3, 0.5, 0.4],
];
const BOULDER_FIELDS = BOULDERS.map(([x, y, r], k) => blob(x, y, r, 60 + k));

// terraced banks either side of the climb up the gully
function terrace(level: number): Field {
  const inner = 2.6 + 2.6 * level;
  return (x, y) => {
    const fromPath = Math.abs(x - pathX(y)) - inner - 0.9 * fbm(x * 0.3, y * 0.3, 70 + level);
    const span = Math.min(y - (52.0 + 2 * level), 75.0 - 1.5 * level - y) + 1.2 * fbm(x * 0.3, y * 0.2, 75);
    return -smoothMax(-fromPath, -span, 2.0); // rounded where the terrace ends
  };
}

const TERRACE_UP = 0.75;

const trail: Field = (x, y) => 1.3 + 0.35 * fbm(0.0, y * 0.3, 81) - Math.abs(x - pathX(y));

const sand: Field = (x, y) =>
  Math.max(16.0 + 2.5 * fbm(x * 0.2, 0.0, 82) - y, lagoon(x, y) + 3.0, river(x, y) + 1.6, pond(x, y) + 1.4);

const CLEARING = [pathX(END), END];
const CLEARING_HEIGHT = 1.35;

const clearing: Field = (x, y) => blob(CLEARING[0], CLEARING[1], 2.4, 90, 0.06)(x, y);

// features, in the order the ground is cut by them
const FEATURES: [name: string, field: Field][] = [
  ["water", water], ["wet", wet], ["rim", rim],
  ...BOULDER_FIELDS.map((field, k): [string, Field] => [`boulder${k}`, field]),
  ["terrace0", terrace(0)], ["terrace1", terrace(1)], ["clearing", clearing], ["sand", sand], ["trail", trail],
];
const NAMES = FEATURES.map(([name]) => name);

type Active = Set<string>; // the features a piece is in

function height(x: number, y: number, active: Active): number {
  if (active.has("water")) {
    return WL;
  }
  if (active.has("clearing")) {
    return CLEARING_HEIGHT;
  }
  if (active.has("wet")) { // a stone or a lily pad
    return WL + 0.45 + 0.06 * fbm(x * 0.8, y * 0.8, 91);
  }
  let h = baseHeight(x, y);
  if (active.has("rim")) {
    h += rimHeight(x, y);
  }
  BOULDERS.forEach(([, , r, edge, dome], k) => {
    if (active.has(`boulder${k}`)) {
      h += edge + dome * smoothStep(0, r * 0.8, BOULDER_FIELDS[k](x, y));
    }
  });
  for (const level of [0, 1]) {
    if (active.has(`terrace${level}`)) {
      h += TERRACE_UP;
    }
  }
  return h;
}

const isOnBoulder = (active: Active) => [...active].some((name) => name.startsWith("boulder"));
const isOnTerrace = (active: Active) => active.has("terrace0") || active.has("terrace1");

function floorMaterial(active: Active, y: number): string {
  if (active.has("water")) {
    return "water";
  }
  if (active.has("clearing")) {
    return "stone";
  }
  if (active.has("wet")) {
    return y > 70 ? "leaf" : "rock";
  }
  if (isOnBoulder(active) || active.has("rim")) {
    return "moss";
  }
  if (isOnTerrace(active)) {
    return "grass";
  }
  if (active.has("sand")) {
    return "sand";
  }
  return active.has("trail") ? "dirt" : "grass";
}

function wallMaterial(active: Active, y: number): string {
  if (active.has("clearing")) {
    return "stone";
  }
  if (active.has("wet") && !active.has("water")) {
    return y < 70 ? "rock" : "wood"; // lily pads have a stem-ish side
  }
  if (isOnBoulder(active)) {
    return "rock";
  }
  return active.has("rim") || isOnTerrace(active) ? "cliff" : "dirt";
}

// cutting the grid into pieces

// a corner of a piece: where it is, and each feature's field there
interface GridPoint {
  x: number;
  y: number;
  values: number[];
}

const isBefore = (a: GridPoint, b: GridPoint) => a.x < b.x || (a.x === b.x && a.y < b.y);

// the part of polygon where the k'th feature's field is over 0 (keepIn) or not
function clip(polygon: GridPoint[], k: number, keepIn: boolean): GridPoint[] | null {
  const kept: GridPoint[] = [];
  polygon.forEach((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    const [aIn, bIn] = [a.values[k] > 0 === keepIn, b.values[k] > 0 === keepIn];
    if (aIn) {
      kept.push(a);
    }
    if (aIn !== bIn) {
      // interpolate from the lower-keyed end, so both sides of a shared edge cut it alike
      const [p, q] = isBefore(a, b) ? [a, b] : [b, a];
      const t = p.values[k] / (p.values[k] - q.values[k]);
      kept.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, values: p.values.map((value, index) => value + (q.values[index] - value) * t) });
    }
  });
  return kept.length >= 3 ? kept : null;
}

interface Piece {
  polygon: GridPoint[];
  active: Active;
}

// a triangle cut by every feature, into the pieces inside and outside each
function cutByFeatures(triangle: GridPoint[]): Piece[] {
  let parts: { polygon: GridPoint[]; active: string[] }[] = [{ polygon: triangle, active: [] }];
  NAMES.forEach((name, k) => {
    parts = parts.flatMap(({ polygon, active }) => [true, false].flatMap((keepIn) => {
      const part = clip(polygon, k, keepIn);
      return part ? [{ polygon: part, active: keepIn ? [...active, name] : active }] : [];
    }));
  });
  return parts.map(({ polygon, active }) => ({ polygon, active: new Set(active) }));
}

function build(): Piece[] {
  const point = (i: number, j: number): GridPoint => ({ x: XS[i], y: YS[j], values: FEATURES.map(([, field]) => field(XS[i], YS[j])) });
  const grid = YS.map((_, j) => XS.map((__, i) => point(i, j)));
  const pieces: Piece[] = [];
  for (let j = 0; j < YS.length - 1; j++) {
    for (let i = 0; i < XS.length - 1; i++) {
      const [a, b, c, d] = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]];
      const triangles = (i + j) % 2 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      triangles.forEach((triangle) => pieces.push(...cutByFeatures(triangle)));
    }
  }
  return pieces;
}

// writing the .obj

type Point3 = [x: number, y: number, z: number];

// a key for a rounded number: -0 and 0 are the same, as they were to python
const keyOf = (...values: number[]) => values.map((value) => String(value + 0)).join(",");
const planKey = (p: Point3) => keyOf(pythonRound(p[0], 4), pythonRound(p[1], 4));

// vertices, rounded, each listed once (from 1), and faces by (object, material)
class ObjWriter {
  vertices: Point3[] = [];
  private vertexIds = new Map<string, number>();
  faces = new Map<string, { object: string; material: string; faces: number[][] }>();

  private vertexId([x, y, z]: Point3): number {
    const rounded: Point3 = [pythonRound(x, 4), pythonRound(y, 4), pythonRound(z, 4)];
    const key = keyOf(...rounded);
    if (!this.vertexIds.has(key)) {
      this.vertexIds.set(key, this.vertices.length + 1);
      this.vertices.push(rounded);
    }
    return this.vertexIds.get(key)!;
  }

  // obj coordinates are (x, z, -y): anticlockwise from above in blender is anticlockwise there too
  add(object: string, material: string, points: Point3[]): void {
    const key = `${object}\u0001${material}`;
    const group = this.faces.get(key) ?? { object, material, faces: [] };
    group.faces.push(points.map((point) => this.vertexId(point)));
    this.faces.set(key, group);
  }

  faceCount(): number {
    return [...this.faces.values()].reduce((sum, { faces }) => sum + faces.length, 0);
  }

  lines(): string[] {
    const lines = [`# ${NAME}, made for c1x by make_map.py`, `mtllib ${NAME}.mtl`];
    lines.push(...this.vertices.map(([x, y, z]) => `v ${fixed4(x)} ${fixed4(z)} ${fixed4(-y)}`));
    const groups = [...this.faces.values()].sort((first, second) =>
      (first.object === second.object ? (first.material < second.material ? -1 : 1) : first.object < second.object ? -1 : 1));
    for (const object of ["pit", "terrain"]) {
      lines.push(`o ${object}`);
      for (const group of groups.filter((candidate) => candidate.object === object)) {
        lines.push(`usemtl ${group.material}`);
        for (const face of group.faces) {
          const ids = [...new Set(face)]; // drop repeated corners (a wall coming to a point)
          if (ids.length >= 3) {
            lines.push(`f ${ids.join(" ")}`);
          }
        }
      }
    }
    return lines;
  }
}

const signedArea = (points: Point3[]) => points.reduce((sum, [x, y], index) => {
  const [nextX, nextY] = points[(index + 1) % points.length];
  return sum + (x * nextY - nextX * y);
}, 0);

// a side of a piece: its ends (anticlockwise round the piece, so the piece is on its left) and the piece's features
interface Side {
  from: Point3;
  to: Point3;
  active: Active;
}

// the piece's floor, anticlockwise from above; its sides go in sides, by their ends
function addFloor(writer: ObjWriter, { polygon, active }: Piece, sides: Map<string, Side[]>): void {
  const points = polygon.map(({ x, y }): Point3 => [x, y, height(x, y, active)]);
  const area = signedArea(points);
  if (Math.abs(area) < 1e-6) {
    return;
  }
  if (area < 0) {
    points.reverse();
  }
  const middleY = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
  writer.add(active.has("water") ? "pit" : "terrain", floorMaterial(active, middleY), points);
  points.forEach((from, index) => {
    const to = points[(index + 1) % points.length];
    const key = [planKey(from), planKey(to)].sort().join("|");
    sides.set(key, [...(sides.get(key) ?? []), { from, to, active }]);
  });
}

// a wall between two pieces sharing a side, where their heights there differ
function addWall(writer: ObjWriter, [first, second]: Side[]): boolean {
  const heightsOf = ({ from, to }: Side) => new Map([[planKey(from), from[2]], [planKey(to), to[2]]]);
  const [firstHeights, secondHeights] = [heightsOf(first), heightsOf(second)];
  const [keyA, keyB] = [planKey(first.from), planKey(first.to)];
  const [diffA, diffB] = [firstHeights.get(keyA)! - secondHeights.get(keyA)!, firstHeights.get(keyB)! - secondHeights.get(keyB)!];
  if (Math.abs(diffA) < 0.02 && Math.abs(diffB) < 0.02) {
    return false;
  }
  const highActive = diffA + diffB > 0 ? first.active : second.active;
  const [ax, ay, bx, by] = [first.from[0], first.from[1], first.to[0], first.to[1]];
  const top = [Math.max(firstHeights.get(keyA)!, secondHeights.get(keyA)!), Math.max(firstHeights.get(keyB)!, secondHeights.get(keyB)!)];
  const low = [Math.min(firstHeights.get(keyA)!, secondHeights.get(keyA)!), Math.min(firstHeights.get(keyB)!, secondHeights.get(keyB)!)];
  const quad: Point3[] = [[ax, ay, low[0]], [bx, by, low[1]], [bx, by, top[1]], [ax, ay, top[0]]];
  // as it is, it faces right of a -> b, the second piece: turned to face the first when the second is higher
  if (diffA + diffB < 0) {
    quad.reverse();
  }
  writer.add("terrain", wallMaterial(highActive, (ay + by) / 2), quad);
  return true;
}

// the .obj's text, and how many vertices, faces and walls it has
export function mossyCreekObj(): { text: string; vertices: number; faces: number; walls: number } {
  const writer = new ObjWriter();
  const sides = new Map<string, Side[]>();
  build().forEach((piece) => addFloor(writer, piece, sides));
  let walls = 0;
  for (const shared of sides.values()) {
    if (shared.length === 2 && addWall(writer, shared)) {
      walls++;
    }
  }
  return { text: `${writer.lines().join("\n")}\n`, vertices: writer.vertices.length, faces: writer.faceCount(), walls };
}

// the .mtl

const MATERIALS: Record<string, string | null> = {
  cliff: "cliff.png", dirt: "dirt.png", grass: "grass.png", leaf: "leaf.png", moss: "moss.png",
  rock: "rock.png", sand: null, stone: "stone.png", water: "water.png", wood: "wood.png",
};

export function mossyCreekMtl(): string {
  const lines = [`# materials of ${NAME}.obj (sand has no image, so it gets n. sanity beach's)`];
  for (const material of Object.keys(MATERIALS).sort()) {
    lines.push("", `newmtl ${material}`, "Kd 1.0 1.0 1.0");
    if (MATERIALS[material]) {
      lines.push(`map_Kd ${MATERIALS[material]}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

// objects

function groundAt(x: number, y: number): number {
  const active = new Set(FEATURES.filter(([, field]) => field(x, y) > 0).map(([name]) => name));
  return height(x, y, active);
}

const at = (x: number, y: number, up = 0.05) => [pythonRound(x, 2), pythonRound(y, 2), pythonRound(groundAt(x, y) + up, 2)];

// an object as python's json.dumps wrote it: its positions are floats, and a stack a whole number
type JsonValue = string | number | number[];
function jsonValue(value: JsonValue): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(pythonFloat).join(", ")}]`;
  }
  return Number.isInteger(value) ? String(value) : pythonFloat(value);
}
const jsonObject = (fields: [string, JsonValue][]) => `{${fields.map(([key, value]) => `"${key}": ${jsonValue(value)}`).join(", ")}}`;

const box = (type: string, x: number, y: number, stack?: number) =>
  jsonObject([["kind", "box"], ["type", type], ["at", at(x, y)], ...(stack ? [["stack", stack] as [string, number]] : [])]);

export function mossyCreekObjects(): string {
  const p = pathX;
  const b = BOULDERS;
  const pads = PADS;
  const objects = [jsonObject([["kind", "spawn"], ["at", at(p(4), 4.0, 0.3)]])];
  // the beach
  objects.push(box("aku_aku", p(8) + 1.5, 8.0), box("basic", p(11), 11.0), box("basic", p(12.5) - 0.6, 12.5),
    box("basic", p(14) - 1.4, 14.0), box("question", b[0][0], b[0][1]));
  // the creek: a box on a side stone
  objects.push(box("basic", STONES[STONES.length - 2][0], STONES[STONES.length - 2][1]));
  // the hills
  objects.push(box("checkpoint", p(33.5), 33.5),
    box("basic", p(36.5) - 1.0, 36.5), box("basic", p(38) + 0.8, 38.0),
    box("life", b[3][0], b[3][1]), box("arrow", b[3][0] + 2.4, b[3][1] - 1.0),
    box("basic", p(42), 42.0, 2), box("slatted", p(46) - 0.8, 46.0),
    box("basic", b[5][0], b[5][1]), box("basic", p(50.5) + 1.0, 50.5));
  // the gully: boxes on the trail and up on the terraces
  objects.push(box("basic", p(56), 56.0), box("basic", p(59) + 0.7, 59.0),
    box("basic", p(61) + 3.7, 61.0), box("basic", p(62) + 3.9, 62.0),
    box("question", p(64) - 6.5, 64.0), box("arrow", p(64) - 3.3, 64.0),
    box("iron", p(67) + 0.9, 67.0), box("basic", p(69) - 0.5, 69.0));
  // the ridge: a switch, and the outline boxes it fills in, up to the boulder
  objects.push(box("checkpoint", p(74), 74.0), box("switch", p(76) - 2.0, 76.0),
    box("outline", b[6][0] - 2.2, b[6][1] - 0.4), box("outline", b[6][0] - 2.2, b[6][1] - 0.4 + 1.0),
    box("aku_aku", b[6][0], b[6][1]));
  // the pond: boxes on the side pads
  objects.push(box("basic", pads[4][0], pads[4][1]), box("life", pads[5][0], pads[5][1]), box("basic", p(83) + 3.0, 83.0));
  // up to the clearing
  objects.push(box("basic", p(99), 99.0), box("basic", p(101) + 0.8, 101.0), box("question", b[7][0], b[7][1]));
  objects.push(jsonObject([["kind", "end"], ["at", at(CLEARING[0], CLEARING[1], 0.0)], ["raise", 0.15]]));
  return `[\n${objects.map((object) => `  ${object}`).join(",\n")}\n]\n`;
}

function main(): void {
  const obj = mossyCreekObj();
  writeFileSync(join(HERE, `${NAME}.obj`), obj.text);
  console.log(`${obj.vertices} vertices, ${obj.faces} faces (${obj.walls} walls)`);
  writeFileSync(join(HERE, `${NAME}.mtl`), mossyCreekMtl());
  writeFileSync(join(HERE, "objects.json"), mossyCreekObjects());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
