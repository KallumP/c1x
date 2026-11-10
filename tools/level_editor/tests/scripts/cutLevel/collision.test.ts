import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { blocksRectBytes, LEAF_FLOOR, LEAF_GROUND } from "../../../builder/octree";
import type { Vec3 } from "../../../builder/vectors";
import { zoneSolids, type CutSolid } from "../../../scripts/cutLevel/collision";
import { collisionFloors } from "../../../scripts/cutLevel/objects";
import { readCutLevel, type CutLevel } from "../../../scripts/cutLevel/readCutLevel";

const ORIGIN: Vec3 = [1000, 2000, 3000];
const SIZE: Vec3 = [1024, 1024, 1024];
const zoneWith = (blocks: { low: Vec3; high: Vec3; leaf: number }[]) =>
  ({ eid: 1, type: 7, items: [Buffer.alloc(0), blocksRectBytes(ORIGIN, SIZE, blocks, 128)] });
const volume = (solids: CutSolid[], leaf: number) =>
  solids.filter((solid) => solid.leaf === leaf).reduce((sum, { low, high }) => sum + (high[0] - low[0]) * (high[1] - low[1]) * (high[2] - low[2]), 0);

describe("a cut level's collision (its zones' octrees)", () => {
  test("is read back into the solid boxes it was made of", () => {
    // by leaf, at their places in the level
    const solids = zoneSolids(zoneWith([
      { low: [0, 0, 0], high: [512, 128, 1024], leaf: LEAF_FLOOR },
      { low: [512, 0, 0], high: [1024, 256, 256], leaf: LEAF_GROUND },
    ]));
    expect(volume(solids, LEAF_FLOOR)).toBe(512 * 128 * 1024);
    expect(volume(solids, LEAF_GROUND)).toBe(512 * 256 * 256);
    expect(Math.min(...solids.map(({ low }) => low[0]))).toBe(ORIGIN[0]);
    expect(Math.max(...solids.filter(({ leaf }) => leaf === LEAF_FLOOR).map(({ high }) => high[1]))).toBe(ORIGIN[1] + 128);
  });
});

describe("a cut level's collision floors", () => {
  const levelOf = (solids: CutSolid[]): CutLevel => ({ worlds: [], texturePages: new Map(), entities: [], solids });
  const OPTIONS = { centre: [0, 0, 0] as Vec3, scale: 400 };

  test("are upward quads on its floor leaves' tops, in a collision object", () => {
    // solid, not drawn
    const floors = collisionFloors(levelOf([{ low: [0, 0, 0], high: [400, 400, 400], leaf: LEAF_FLOOR }]), OPTIONS);
    expect(floors.name.startsWith("collision")).toBe(true);
    expect(floors.faces.length).toBe(2);
    expect(floors.faces.flatMap(({ corners }) => corners).every(([, , z]) => z === 1)).toBe(true);
  });

  test("leave out covered tops and ground leaves", () => {
    const floors = collisionFloors(levelOf([
      { low: [0, 0, 0], high: [400, 400, 400], leaf: LEAF_FLOOR },
      { low: [0, 400, 0], high: [400, 800, 400], leaf: LEAF_FLOOR },
      { low: [800, 0, 0], high: [1200, 400, 400], leaf: LEAF_GROUND },
    ]), OPTIONS);
    expect(floors.faces.flatMap(({ corners }) => corners).every(([, , z]) => z === 2)).toBe(true);
    expect(floors.faces.length).toBe(2);
  });
});

const ACID_CAVE = fileURLToPath(new URL("../../../../../streams/s0000004.nsf", import.meta.url));

describe.skipIf(!existsSync(ACID_CAVE))("the acid cave's collision", () => {
  test("has floor under crash's spawn", () => {
    // its path has floor, though its mesh may have holes in it
    const { solids, entities } = readCutLevel(ACID_CAVE);
    const [x, y, z] = entities.find(({ type }) => type === 0)!.at;
    const isUnderSpawn = ({ low, high }: CutSolid) => low[0] <= x && x < high[0] && low[2] <= z && z < high[2] && high[1] <= y;
    expect(solids.filter(({ leaf }) => leaf === LEAF_FLOOR).some(isUnderSpawn)).toBe(true);
  });
});
