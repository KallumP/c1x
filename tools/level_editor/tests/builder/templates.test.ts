import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { entityId, entityPath, entityType } from "../../builder/entities";
import { readLevel } from "../../builder/levelFiles";
import { levelEntity, mossySlope } from "../../builder/templates";
import { stringToEid } from "../../builder/entryIds";
import { expectNear } from "../helpers";

const STREAMS = fileURLToPath(new URL("../../../../streams", import.meta.url));
const N_SANITY_BEACH = 0x9;
const hasBeach = existsSync(`${STREAMS}/s0000009.nsd`);

describe.skipIf(!hasBeach)("an example entity from any level", () => {
  const beach = hasBeach ? readLevel(STREAMS, N_SANITY_BEACH) : null!;

  test("is the level's first of that type and subtype", () => {
    const crab = levelEntity(beach, 31, 0);
    expect(entityType(crab)).toEqual([31, 0]);
    expect([entityId(crab), entityPath(crab).length]).toEqual([14, 17]);
  });

  test("a type and subtype the level has none of is an error naming them", () => {
    expect(() => levelEntity(beach, 31, 9)).toThrow(/31.*9/);
  });
});

const THE_GREAT_GATE = 0x12;
const hasGreatGate = existsSync(`${STREAMS}/s0000012.nsd`);

describe.skipIf(!hasGreatGate)("the great gate's mossy slides' planks", () => {
  const gate = hasGreatGate ? readLevel(STREAMS, THE_GREAT_GATE) : null!;
  const VI1IT = stringToEid("Vi1iT"); // the texture page they're all on

  test.each([
    { long: true, reverse: false, points: 9, across: 3600 },
    { long: true, reverse: true, points: 9, across: -3600 },
    { long: false, reverse: false, points: 5, across: 2000 },
    { long: false, reverse: true, points: 5, across: -2000 },
  ])("a slide (long $long, reversed $reverse) has its path and the plank under it", ({ long, reverse, points, across }) => {
    const slope = mossySlope(gate, long, reverse);
    expect(slope.path.length).toBe(points);
    expect(slope.path[0]).toEqual([0, 0, 0]);
    expectNear(slope.path.at(-1)![0], across, 16);
    expect(slope.polygons.length).toBeGreaterThan(40);
    expect(slope.polygons.every(({ page }) => page === VI1IT)).toBe(true);
    // every corner is near the slide's line: from 0.9 m below it to 0.3 m above, 1.75 m to either side (at scale 400)
    const drop = slope.path.at(-1)![1] / slope.path.at(-1)![0];
    slope.vertices.forEach(({ at: [x, y, z] }) => {
      expect(y - drop * x).toBeGreaterThanOrEqual(-360);
      expect(y - drop * x).toBeLessThanOrEqual(120);
      expect(Math.abs(z)).toBeLessThanOrEqual(700);
    });
  });
});
