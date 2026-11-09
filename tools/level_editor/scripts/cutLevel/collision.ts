// a cut level's collision: each zone's octree (zone_rect in src/formats/zdat.h,
// as builder/octree.ts writes them) read back into its solid boxes
import type { Entry } from "../../builder/levelFiles";
import type { Vec3 } from "../../builder/vectors";

// a solid box of the zone's octree, from low to high (game units, in the level), and its leaf
export interface CutSolid {
  low: Vec3;
  high: Vec3;
  leaf: number;
}

const RECT_ITEM = 1;  // a zone's item holding its bounds and octree
const ROOT_AT = 28;   // after x y z w h d and a word: the root node's offset, then the depth along each axis
const DEPTHS_AT = 30;
const EMPTY = 0;
const isLeaf = (node: number) => (node & 1) === 1; // odd: a leaf; even, but for 0: a node's offset

interface Region {
  low: Vec3;
  size: Vec3;
}

interface Octree {
  rect: Buffer;
  depths: Vec3;
}

// a region's children, as the octree splits it at level: in half along each axis it isn't yet as deep as
function childRegions({ low, size }: Region, level: number, depths: Vec3): Region[] {
  const splits = depths.map((depth) => level < depth);
  const childSize = size.map((side, axis) => (splits[axis] ? side / 2 : side)) as Vec3;
  const regions: Region[] = [];
  for (let i = 0; i <= Number(splits[0]); i++) {
    for (let j = 0; j <= Number(splits[1]); j++) {
      for (let k = 0; k <= Number(splits[2]); k++) {
        regions.push({ low: [low[0] + i * childSize[0], low[1] + j * childSize[1], low[2] + k * childSize[2]], size: childSize });
      }
    }
  }
  return regions;
}

// the solid boxes under a node of the octree, for the region it covers
function solidsUnder(octree: Octree, node: number, region: Region, level: number): CutSolid[] {
  if (node === EMPTY) {
    return [];
  }
  if (isLeaf(node)) {
    return [{ low: region.low, high: region.low.map((value, axis) => value + region.size[axis]) as Vec3, leaf: node }];
  }
  return childRegions(region, level, octree.depths).flatMap((child, index) =>
    solidsUnder(octree, octree.rect.readUInt16LE(node + 2 * index), child, level + 1));
}

export function zoneSolids(zone: Entry): CutSolid[] {
  const rect = zone.items[RECT_ITEM];
  const low = [0, 4, 8].map((at) => rect.readInt32LE(at)) as Vec3;
  const size = [12, 16, 20].map((at) => rect.readUInt32LE(at)) as Vec3;
  const depths = [0, 1, 2].map((axis) => rect.readUInt16LE(DEPTHS_AT + 2 * axis)) as Vec3;
  return solidsUnder({ rect, depths }, rect.readUInt16LE(ROOT_AT), { low, size }, 0);
}
