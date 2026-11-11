import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { entityId, entityPath, entityType } from "../../builder/entities";
import { readLevel } from "../../builder/levelFiles";
import { levelEntity, mossyPlank, mossySlats, mossySlope } from "../../builder/templates";
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
    // every corner is near the slide's line: from 1.25 m below it to 0.75 m above, 2 m to either side (at scale 400), and not past its ends
    const drop = slope.path.at(-1)![1] / slope.path.at(-1)![0];
    slope.vertices.forEach(({ at: [x, y, z] }) => {
      expect(y - drop * x).toBeGreaterThanOrEqual(-500);
      expect(y - drop * x).toBeLessThanOrEqual(300);
      expect(Math.abs(z)).toBeLessThanOrEqual(800);
      expect(x * Math.sign(across)).toBeGreaterThanOrEqual(-20);
      expect(x * Math.sign(across)).toBeLessThanOrEqual(Math.abs(slope.path.at(-1)![0]) + 20);
    });
  });
});

describe.skipIf(!hasGreatGate)("a mossy plank made of the great gate's slats", () => {
  const gate = hasGreatGate ? readLevel(STREAMS, THE_GREAT_GATE) : null!;
  const slats = hasGreatGate ? mossySlats(gate) : [];
  const tan = (degrees: number) => Math.tan((degrees * Math.PI) / 180);

  test("its three slats, each from its start, on the great gate's texture page", () => {
    expect(slats.map(({ width }) => width)).toEqual([304, 232, 264]);
    slats.forEach((slat) => {
      expect(slat.polygons.length).toBeGreaterThan(3);
      expect(slat.polygons.every(({ page }) => page === stringToEid("Vi1iT"))).toBe(true);
      slat.vertices.forEach(({ at: [x] }) => expect(x).toBeGreaterThanOrEqual(-1));
      slat.vertices.forEach(({ at: [x] }) => expect(x).toBeLessThanOrEqual(slat.width + 1));
    });
  });

  test.each([
    { length: 4000, angle: 20 },
    { length: 1500, angle: 8 },
  ])("a plank $length long at $angle degrees: slats in turn down its slope, the slider's path along it", ({ length, angle }) => {
    const plank = mossyPlank(slats, length, angle, false);
    const xs = plank.vertices.map(({ at: [x] }) => x);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-1);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(length);
    expect(Math.max(...xs)).toBeLessThan(length + 305);
    plank.vertices.forEach(({ at: [x, y] }) => expect(Math.abs(y + x * tan(angle))).toBeLessThan(700));
    expect(plank.path[0]).toEqual([0, 0, 0]);
    const [endX, endY, endZ] = plank.path.at(-1)!;
    expectNear(endX, Math.max(...xs) + 400, 1);
    expectNear(endY, -endX * tan(angle), 1);
    expect(endZ).toBe(0);
    plank.path.slice(1).forEach(([x], point) => expectNear(x - plank.path[point][0], 450, 60));
  });

  test("reversed, it runs back across the map: mirrored, its triangles wound the other way so they still face out", () => {
    const [forward, back] = [mossyPlank(slats, 3000, 15, false), mossyPlank(slats, 3000, 15, true)];
    expect(back.vertices.map(({ at: [x, y, z] }) => [-x + 0, y, z])).toEqual(forward.vertices.map(({ at }) => at));
    expect(back.polygons.map(({ corners: [a, b, c] }) => [a, c, b])).toEqual(forward.polygons.map(({ corners }) => corners));
    expect(back.path.map(([x, y, z]) => [-x + 0, y, z])).toEqual(forward.path);
  });
});
