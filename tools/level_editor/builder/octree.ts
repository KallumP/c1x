// a zone's bounds and collision octree (zone_rect in src/formats/zdat.h),
// where given blocks are solid and the rest is empty
import { ByteWriter, padTo4 } from "./bytes";
import type { Vec3 } from "./vectors";

const OCTREE_NODES = 36;   // zone_rect: x y z w h d unk, then root and max depths
export const LEAF_GROUND = 1;   // leaf (low bit) with value 0: plain solid ground
export const LEAF_FLOOR = 3;    // leaf of type 1, floor: crash can step up onto it (by up to land_offset in
                                // src/solid.c, about 244), unlike ground (FindFloorY counts that as a wall)
export const LEAF_PIT = (11 << 4) | 1; // leaf with subtype 11: kills what falls on it (ProcessNode in src/solid.c)
export const FLOOR_CELL_MAX = 1024;    // largest solid cell (zone units): ZoneQueryOctree stores a cell's position
                                       // relative to the query point as int16 (>> 4), so a bigger one is misplaced

// a solid box from low to high (zone units relative to the zone, on the cell grid), of leaf
export interface Block {
  low: Vec3;
  high: Vec3;
  leaf: number;
}

// how many times a side of n cells halves down to one cell
function halvings(cells: number, side: string): number {
  const depth = Math.floor(Math.log2(cells));
  if (cells <= 0 || 2 ** depth !== cells) {
    throw new Error(`${side} (${cells}) has to be a power of two times the cell size`);
  }
  return depth;
}

// cell counts along x, y and z, each from a side of size
class CellGrid {
  readonly leaves: Uint16Array;

  constructor(readonly counts: Vec3) {
    this.leaves = new Uint16Array(counts[0] * counts[1] * counts[2]);
  }

  index(i: number, j: number, k: number): number {
    return (i * this.counts[1] + j) * this.counts[2] + k;
  }

  fill(block: Block, cell: number): void {
    const [i0, j0, k0] = block.low.map((coordinate) => coordinate / cell);
    const [i1, j1, k1] = block.high.map((coordinate) => coordinate / cell);
    for (let i = i0; i < i1; i++) {
      for (let j = j0; j < j1; j++) {
        for (let k = k0; k < k1; k++) {
          this.leaves[this.index(i, j, k)] = block.leaf;
        }
      }
    }
  }
}

// how many cells of one leaf there are in any box of cells, from prefix sums
class LeafCounter {
  private sums: Int32Array;
  private stride: Vec3;

  constructor(grid: CellGrid, readonly leaf: number) {
    const [nx, ny, nz] = grid.counts;
    this.stride = [(ny + 1) * (nz + 1), nz + 1, 1];
    this.sums = new Int32Array((nx + 1) * this.stride[0]);
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        for (let k = 0; k < nz; k++) {
          const isLeaf = grid.leaves[grid.index(i, j, k)] === leaf ? 1 : 0;
          this.sums[this.at(i + 1, j + 1, k + 1)] = isLeaf
            + this.sum(i, j + 1, k + 1) + this.sum(i + 1, j, k + 1) + this.sum(i + 1, j + 1, k)
            - this.sum(i, j, k + 1) - this.sum(i, j + 1, k) - this.sum(i + 1, j, k) + this.sum(i, j, k);
        }
      }
    }
  }

  private at(i: number, j: number, k: number): number {
    return i * this.stride[0] + j * this.stride[1] + k;
  }

  private sum(i: number, j: number, k: number): number {
    return this.sums[this.at(i, j, k)];
  }

  // in the box of cells from (i0, j0, k0) up to (not including) (i1, j1, k1)
  count([i0, j0, k0]: Vec3, [i1, j1, k1]: Vec3): number {
    return this.sum(i1, j1, k1) - this.sum(i0, j1, k1) - this.sum(i1, j0, k1) - this.sum(i1, j1, k0)
      + this.sum(i0, j0, k1) + this.sum(i0, j1, k0) + this.sum(i1, j0, k0) - this.sum(i0, j0, k0);
  }
}

// the octree's nodes: a region is split where its cells differ, and a solid
// region is also split while it's wider than FLOOR_CELL_MAX; the same subtree
// is only stored once, so large regions cost nothing
class OctreeBuilder {
  readonly nodes = new ByteWriter();
  private stored = new Map<string, number>(); // a node's children to where it's stored

  constructor(private counters: LeafCounter[], private maxDepths: Vec3, private cell: number) {}

  // the leaf every cell in a region is, if they're all the same solid one
  private uniformLeaf(low: Vec3, high: Vec3, total: number): number | null {
    return this.counters.find((counter) => counter.count(low, high) === total)?.leaf ?? null;
  }

  private isEmpty(low: Vec3, high: Vec3): boolean {
    return this.counters.every((counter) => counter.count(low, high) === 0);
  }

  private store(children: number[]): number {
    const key = children.join();
    if (!this.stored.has(key)) {
      const offset = OCTREE_NODES + this.nodes.length;
      const node = new ByteWriter();
      children.forEach((child) => node.u16(child));
      this.nodes.bytes(padTo4(node.toBuffer()));
      if (offset > 0xffff) {
        throw new Error("octree is too big for 16 bit node offsets");
      }
      this.stored.set(key, offset);
    }
    return this.stored.get(key)!;
  }

  // the node for the region of cells from low, size cells along each side, level deep
  build(level: number, low: Vec3, size: Vec3): number {
    const high: Vec3 = [low[0] + size[0], low[1] + size[1], low[2] + size[2]];
    if (this.isEmpty(low, high)) {
      return 0;
    }
    const leaf = this.uniformLeaf(low, high, size[0] * size[1] * size[2]);
    if (leaf !== null && size[0] * this.cell <= FLOOR_CELL_MAX && size[2] * this.cell <= FLOOR_CELL_MAX) {
      return leaf;
    }
    const splits = this.maxDepths.map((depth) => level < depth);
    const childSize = size.map((side, axis) => (splits[axis] ? side / 2 : side)) as Vec3;
    const children: number[] = [];
    for (let i = 0; i <= Number(splits[0]); i++) {
      for (let j = 0; j <= Number(splits[1]); j++) {
        for (let k = 0; k <= Number(splits[2]); k++) {
          const childLow: Vec3 = [low[0] + i * childSize[0], low[1] + j * childSize[1], low[2] + k * childSize[2]];
          children.push(this.build(level + 1, childLow, childSize));
        }
      }
    }
    return this.store(children);
  }
}

function checkBlock(block: Block, size: Vec3, cell: number): void {
  const isOnGrid = [...block.low, ...block.high].every((coordinate) => coordinate % cell === 0);
  const isInside = [0, 1, 2].every((axis) => block.low[axis] >= 0 && block.low[axis] < block.high[axis] && block.high[axis] <= size[axis]);
  if (!isOnGrid || !isInside) {
    throw new Error(`block ${JSON.stringify(block)} isn't on the ${cell} grid inside the zone`);
  }
}

// zone bounds (origin, size) and a collision octree where the given blocks are
// solid (later blocks win where they overlap) and the rest is empty. size has to
// be a power of two times cell along each side
export function blocksRectBytes(origin: Vec3, size: Vec3, blocks: Block[], cell: number): Buffer {
  const counts = size.map((side) => Math.floor(side / cell)) as Vec3;
  const maxDepths = counts.map((count, axis) => halvings(count, "whd"[axis])) as Vec3;
  if (counts.some((count, axis) => count * cell !== size[axis])) {
    throw new Error("size has to be a multiple of the cell size");
  }
  const grid = new CellGrid(counts);
  for (const block of blocks) {
    checkBlock(block, size, cell);
    grid.fill(block, cell);
  }
  const leaves = [...new Set(blocks.map((block) => block.leaf))];
  const builder = new OctreeBuilder(leaves.map((leaf) => new LeafCounter(grid, leaf)), maxDepths, cell);
  const root = builder.build(0, [0, 0, 0], counts);
  const rect = new ByteWriter()
    .s32(origin[0]).s32(origin[1]).s32(origin[2]).u32(size[0]).u32(size[1]).u32(size[2]).u32(0)
    .u16(root).u16(maxDepths[0]).u16(maxDepths[1]).u16(maxDepths[2])
    .bytes(builder.nodes.toBuffer());
  return padTo4(rect.toBuffer());
}
