import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { entityId, entityPath, entityType } from "../../builder/entities";
import { readLevel } from "../../builder/levelFiles";
import { levelEntity } from "../../builder/templates";

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
