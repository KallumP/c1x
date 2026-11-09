import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { blocksRectBytes, LEAF_FLOOR, LEAF_GROUND } from "../../../builder/octree";
import type { Vec3 } from "../../../builder/vectors";
import { zoneSolids, type CutSolid } from "../../../scripts/cutLevel/collision";
import { collisionFloors } from "../../../scripts/cutLevel/objects";
import type { CutLevel } from "../../../scripts/cutLevel/readCutLevel";

const ORIGIN: Vec3 = [1000, 2000, 3000];
const SIZE: Vec3 = [1024, 1024, 1024];
const zoneWith = (blocks: { low: Vec3; high: Vec3; leaf: number }[]) =>
  ({ eid: 1, type: 7, items: [Buffer.alloc(0), blocksRectBytes(ORIGIN, SIZE, blocks, 128)] });
const volume = (solids: CutSolid[], leaf: number) =>
  solids.filter((solid) => solid.leaf === leaf).reduce((sum, { low, high }) => sum + (high[0] - low[0]) * (high[1] - low[1]) * (high[2] - low[2]), 0);

describe("a cut level's collision (its zones' octrees)", () => {
  test("is read back into the solid boxes it was made of, by leaf, at their places in the level", () => {
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

  test("are quads on the tops of its floor leaves, facing up, in a collision object (solid, not drawn)", () => {
    const floors = collisionFloors(levelOf([{ low: [0, 0, 0], high: [400, 400, 400], leaf: LEAF_FLOOR }]), OPTIONS);
    expect(floors.name.startsWith("collision")).toBe(true);
    expect(floors.faces.length).toBe(2);
    expect(floors.faces.flatMap(({ corners }) => corners).every(([, , z]) => z === 1)).toBe(true);
  });

  test("leave out tops with a floor leaf right on them, and other leaves (ground, under the acid, and rock)", () => {
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

describe.skipIf(!existsSync(ACID_CAVE))("the acid cave's collision", async () => {
  const { readCutLevel } = await import("../../../scripts/cutLevel/readCutLevel");
  test("has floor where its path is, which its mesh may have holes in", () => {
    const solids = readCutLevel(ACID_CAVE).solids;
    expect(solids.filter(({ leaf }) => leaf === LEAF_FLOOR).length).toBeGreaterThan(1000);
  });
});
