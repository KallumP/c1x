import { expect, test } from "vitest";
import { isCollisionOnly } from "../../../src/three/collisionObjects";

test("objects named collision... are collision only (solid in the game, not drawn), as the builder takes them", () => {
  expect(isCollisionOnly("collision_floor")).toBe(true);
  expect(isCollisionOnly("Collision.001")).toBe(true);
  expect(isCollisionOnly("k0_4W")).toBe(false);
  expect(isCollisionOnly("pit_acid")).toBe(false);
});
