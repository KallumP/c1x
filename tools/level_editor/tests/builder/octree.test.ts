import { describe, expect, test } from "vitest";
import { blocksRectBytes, FLOOR_CELL_MAX, LEAF_GROUND, LEAF_PIT, type Block } from "../../builder/octree";
import type { Vec3 } from "../../builder/vectors";
import { readZoneRect } from "./zoneReaders";

interface Leaf {
  at: Vec3;
  size: Vec3;
  value: number;
}

// the solid leaves of a zone's octree, in zone units relative to the zone, walked as ZoneQueryOctreeR does
function octreeLeaves(rect: Buffer): Leaf[] {
  const zoneSize: Vec3 = [rect.readUInt32LE(12), rect.readUInt32LE(16), rect.readUInt32LE(20)];
  const [root, ...maxDepths] = [28, 30, 32, 34].map((offset) => rect.readUInt16LE(offset));
  const leaves: Leaf[] = [];
  const walk = (node: number, level: number, at: Vec3, size: Vec3) => {
    if (node === 0) {
      return;
    }
    if (node & 1) {
      leaves.push({ at, size, value: node >> 1 });
      return;
    }
    const splits = maxDepths.map((depth) => level < depth);
    const childSize = size.map((side, axis) => (splits[axis] ? side / 2 : side)) as Vec3;
    let child = 0;
    for (let i = 0; i <= Number(splits[0]); i++) {
      for (let j = 0; j <= Number(splits[1]); j++) {
        for (let k = 0; k <= Number(splits[2]); k++) {
          const childAt: Vec3 = [at[0] + i * childSize[0], at[1] + j * childSize[1], at[2] + k * childSize[2]];
          walk(rect.readUInt16LE(node + 2 * child), level + 1, childAt, childSize);
          child++;
        }
      }
    }
  };
  walk(root, 0, [0, 0, 0], zoneSize);
  return leaves;
}

// the cell sized squares (low corners) a box from low to high covers
function squaresOf(low: Vec3, high: Vec3, cell: number): string[] {
  const squares = [];
  for (let x = low[0]; x < high[0]; x += cell) {
    for (let y = low[1]; y < high[1]; y += cell) {
      for (let z = low[2]; z < high[2]; z += cell) {
        squares.push(`${x},${y},${z}`);
      }
    }
  }
  return squares;
}

const leafSquares = (leaves: Leaf[]) =>
  new Set(leaves.flatMap(({ at, size }) => squaresOf(at, [at[0] + size[0], at[1] + size[1], at[2] + size[2]], 128)));
const blockSquares = (blocks: Block[]) => new Set(blocks.flatMap(({ low, high }) => squaresOf(low, high, 128)));

const ground = (low: Vec3, high: Vec3): Block => ({ low, high, leaf: LEAF_GROUND });

describe("the collision octree", () => {
  const SIZE: Vec3 = [2048, 1024, 4096];
  const BLOCKS = [
    ground([0, 0, 0], [2048, 256, 1024]),       // ground at the start
    ground([0, 0, 1536], [2048, 256, 4096]),    // ground after a gap
    ground([512, 256, 2048], [1024, 512, 2560]), // a step on it
  ];

  test("its solid cells are exactly the blocks", () => {
    const rect = blocksRectBytes([10, 20, 30], SIZE, BLOCKS, 128);
    expect(readZoneRect(rect)).toEqual({ at: [10, 20, 30], width: SIZE[0], height: SIZE[1], depth: SIZE[2] });
    const leaves = octreeLeaves(rect);
    expect(leafSquares(leaves)).toEqual(blockSquares(BLOCKS));
    expect(new Set(leaves.map(({ value }) => value))).toEqual(new Set([0])); // plain ground
  });

  test("solid leaves are small enough to query", () => {
    for (const { size } of octreeLeaves(blocksRectBytes([0, 0, 0], SIZE, BLOCKS, 128))) {
      expect(size[0]).toBeLessThanOrEqual(FLOOR_CELL_MAX);
      expect(size[2]).toBeLessThanOrEqual(FLOOR_CELL_MAX);
    }
  });

  test("identical parts are shared, so it stays small", () => {
    const rect = blocksRectBytes([0, 0, 0], [4096, 4096, 8192], [ground([0, 0, 0], [4096, 384, 8192])], 128);
    expect(rect.length).toBeLessThan(4096);
  });

  test("blocks can have their own leaf value", () => {
    const pit: Block = { low: [0, 0, 1024], high: [2048, 128, 1536], leaf: LEAF_PIT };
    const leaves = octreeLeaves(blocksRectBytes([0, 0, 0], SIZE, [...BLOCKS, pit], 128));
    expect(leafSquares(leaves.filter(({ value }) => value === LEAF_PIT >> 1))).toEqual(blockSquares([pit]));
  });

  test("blocks have to be on the grid", () => {
    expect(() => blocksRectBytes([0, 0, 0], SIZE, [ground([0, 0, 0], [100, 128, 128])], 128)).toThrow();
  });
});
