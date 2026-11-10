import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { readCutLevel } from "../../../scripts/cutLevel/readCutLevel";

const ACID_CAVE = fileURLToPath(new URL("../../../../../streams/s0000004.nsf", import.meta.url));
const hasAcidCave = existsSync(ACID_CAVE);

describe.skipIf(!hasAcidCave)("the cut acid cave (s0000004), read from its pages alone", () => {
  const level = readCutLevel(ACID_CAVE);

  test("has its world meshes, each with its origin, vertices and polygons", () => {
    // the acid cave has five
    expect(level.worlds.map(({ name }) => name).sort()).toEqual(["k0_4W", "k1_4W", "k2_4W", "k3_4W", "k4_4W"]);
    const k0 = level.worlds.find(({ name }) => name === "k0_4W")!;
    expect(k0.origin).toEqual([13450, 5800, 36581]);
    expect(k0.polygons.length).toBe(1549);
    expect(k0.vertices.length).toBeGreaterThan(0);
  });

  test("has its texture pages, by entry id", () => {
    // the acid cave has seven
    expect(level.texturePages.size).toBe(7);
  });

  test("has its zones' entities at their places in the level", () => {
    // seven zones; crash's spawn in k0_4Z
    const crash = level.entities.filter(({ type }) => type === 0);
    expect(crash.length).toBe(1);
    expect(crash[0].zone).toBe("k0_4Z");
    expect(crash[0].at).toEqual([15270 + 1128, 4298 + 5700, 35011 + 988]); // the zone's origin and its place in it
    expect(level.entities.length).toBe(48);
  });
});
