import { describe, expect, test } from "vitest";
import { DEFAULT_CAMERA, levelTurn } from "../../src/camera";

describe("how far a level is turned, as the editor and the build both turn its objects", () => {
  const SIDE = { ...DEFAULT_CAMERA, view: "side" as const };

  test("behind crash, it's level.cfg's turn", () => {
    expect([0, 90, 180, 270].map((turn) => levelTurn(turn, DEFAULT_CAMERA))).toEqual([0, 90, 180, 270]);
  });

  test("a side view turns it three quarters further, so a route built along -z runs along +x", () => {
    expect([0, 90, 180, 270].map((turn) => levelTurn(turn, SIDE))).toEqual([270, 360, 450, 540]);
  });
});
