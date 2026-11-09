import { describe, expect, test } from "vitest";
import { blenderToView, BOX_UNITS, boxSize, cameraFacing, BADGER_RUN, MONKEY_WALK, WALKING_SPIDER_RUN, WARTHOG_RUN, CRAB_WALK, NATIVE_WALK, enemyTurn, facingFrom, FISH_LEAP, fishLeap, TURTLE_WALK, stackCentres, stonePath, stoneRolling, STONE_TRACK, viewToBlender } from "../../src/coords";

describe("blender and the viewport", () => {
  test("the viewport has the .obj's axes: blender (x, z, -y), y up", () => {
    expect(blenderToView([1, 2, 3])).toEqual([1, 3, -2]);
  });

  test("back again", () => {
    expect(viewToBlender([1, 3, -2])).toEqual([1, 2, 3]);
    expect(viewToBlender(blenderToView([-4.5, 9.5, 0.6]))).toEqual([-4.5, 9.5, 0.6]);
  });

  test("no -0 from a 0 coming back", () => {
    expect(Object.is(viewToBlender([0, 0, 0])[1], 0)).toBe(true);
  });
});

describe("boxes", () => {
  test("a box is 400 game units, in blender metres at the level's scale", () => {
    expect(boxSize(400)).toBe(1);
    expect(boxSize(2000)).toBe(0.2);
  });

  test("a stack's boxes stand on the ground it's at, raised, one on another", () => {
    expect(stackCentres([1, 2, 3], 0, 1, 400)).toEqual([[1, 2, 3.5]]);
    expect(stackCentres([1, 2, 3], 2.5, 2, 400)).toEqual([[1, 2, 6], [1, 2, 7]]);
    expect(stackCentres([0, 0, 0], 0, 2, 2000)).toEqual([[0, 0, 0.1], [0, 0, 0.30000000000000004]]);
  });
});

describe("the camera", () => {
  test("faces along blender +y in an unturned level", () => {
    expect(cameraFacing(0)).toEqual([0, 1, 0]);
  });

  test("faces the other way round as the build turns the level anticlockwise", () => {
    expect(cameraFacing(90)).toEqual([1, 0, 0]);
    expect(cameraFacing(180)).toEqual([0, -1, 0]);
    expect(cameraFacing(270)).toEqual([-1, 0, 0]);
  });

  test("a whole turn is no turn", () => {
    expect(cameraFacing(360)).toEqual([0, 1, 0]);
    expect(cameraFacing(-90)).toEqual([-1, 0, 0]);
  });
});

describe("rolling stones", () => {
  test("roll across the map: along +x unturned, turning with the level as the camera does", () => {
    expect(stoneRolling(0)).toEqual([1, 0, 0]);
    expect(stoneRolling(90)).toEqual([0, -1, 0]);
    expect(stoneRolling(180)).toEqual([-1, 0, 0]);
    expect(stoneRolling(270)).toEqual([0, 1, 0]);
    for (const turn of [0, 90, 180, 270]) {
      const [a, b] = [stoneRolling(turn), cameraFacing(turn)];
      expect(a[0] * b[0] + a[1] * b[1] + 0).toBe(0); // across the way the camera faces (+ 0 turns -0 into 0)
    }
  });

  test("roll jungle rollers' path, its middle a stone's radius over the track's floor, lifted a box's height over the spot, dipping from its ends", () => {
    const path = stonePath([1, 2, 3], 0, 0, 400);
    expect(path.length).toBe(11);
    expect(STONE_TRACK.lift).toBe(BOX_UNITS);
    const radius = (STONE_TRACK.radius + STONE_TRACK.lift) / 400;
    expect(path[5]).toEqual([1, 2, 3 + radius]);
    expect(path[0][0]).toBeCloseTo(1 + 1800 / 400);
    expect(path[10][0]).toBeCloseTo(1 - 1800 / 400);
    expect(path[0][2]).toBeCloseTo(3 + radius + 472 / 400);
    expect(path.every(([, y]) => y === 2)).toBe(true);
  });

  test("a fish leaps from its spot as up the creek's do: 14 points, 1600 across the map, 2172 at its highest (game units)", () => {
    expect(FISH_LEAP.length).toBe(14);
    const path = fishLeap([1, 2, 3], 0, 0, 400);
    expect(path[0]).toEqual([1, 2, 3]);
    expect(path[13][0]).toBeCloseTo(1 + 1600 / 400);
    expect(path[13][2]).toBeCloseTo(3);
    expect(Math.max(...path.map(([, , z]) => z))).toBeCloseTo(3 + 2172 / 400);
    expect(path.every(([, y]) => y === 2)).toBe(true);
  });

  test("a fish's leap turns with the level, across the map as a stone rolls, and lifts with raise", () => {
    const path = fishLeap([0, 0, 0], 1, 90, 400);
    expect(path[13][0]).toBeCloseTo(0);
    expect(path[13][1]).toBeCloseTo(-1600 / 400);
    expect(path[0][2]).toBeCloseTo(1);
  });

  test("a stone's path turns with the level and lifts with raise", () => {
    const path = stonePath([0, 0, 0], 1, 90, 400);
    expect(path[0][0]).toBeCloseTo(0);
    expect(path[0][1]).toBeCloseTo(-1800 / 400);
    expect(path[5][2]).toBeCloseTo(1 + (STONE_TRACK.radius + STONE_TRACK.lift) / 400);
  });
});

describe("crabs, turtles, natives, badgers and warthogs", () => {
  test("walk n. sanity beach's paths' lengths by default: a crab 1600 game units, a turtle 2000", () => {
    expect(CRAB_WALK).toBe(1600);
    expect(TURTLE_WALK).toBe(2000);
  });

  test("a native walks the great gate's natives' path's length by default: 1972 game units", () => {
    expect(NATIVE_WALK).toBe(1972);
  });

  test("a badger runs jungle rollers' badgers' path's length by default: 5200 game units along the route", () => {
    expect(BADGER_RUN).toBe(5200);
  });

  test("a warthog charges road to nowhere's warthogs' path's length by default: 5200 game units along the route", () => {
    expect(WARTHOG_RUN).toBe(5200);
  });

  test("a walking spider runs fumbling in the dark's shortest walking spider path's length by default: 3200 game units along the route", () => {
    expect(WALKING_SPIDER_RUN).toBe(3200);
  });

  test("a monkey walks the great gate's monkeys' path's length by default: 2400 game units across the map", () => {
    expect(MONKEY_WALK).toBe(2400);
  });
});

describe("enemies facing the player", () => {
  const turned = (yaw: number): { front: number[]; side: number[] } => ({
    front: [Math.sin(yaw), 0, Math.cos(yaw)].map((value) => Math.round(value) + 0),
    side: [Math.cos(yaw), 0, -Math.sin(yaw)].map((value) => Math.round(value) + 0),
  });

  test.each([0, 90, 180, 270])("at a turn of %i, an enemy's front (+z) faces back along the camera's facing", (turn) => {
    const [dx, dy, dz] = blenderToView(cameraFacing(turn));
    expect(turned(enemyTurn(turn)).front).toEqual([-dx + 0, dy, -dz + 0]);
  });

  test.each([0, 90, 180, 270])("at a turn of %i, its side (+x) lies along the way a crab walks", (turn) => {
    expect(turned(enemyTurn(turn)).side).toEqual(blenderToView(stoneRolling(turn)).map((value) => value + 0));
  });

  test("unturned, it isn't turned", () => {
    expect(enemyTurn(0)).toBe(0);
  });
});

describe("an enemy facing the way it walks", () => {
  const front = (yaw: number) => [Math.sin(yaw), 0, Math.cos(yaw)].map((value) => Math.round(value * 1000) / 1000 + 0);

  test("turns its front (+z) from one place (in blender) towards another", () => {
    expect(front(facingFrom([0, 0, 0], [0, 1, 0]))).toEqual(blenderToView([0, 1, 0]).map((value) => value + 0));
    expect(front(facingFrom([0, 0, 0], [-1, 0, 0]))).toEqual([-1, 0, 0]);
    expect(front(facingFrom([1, 1, 0], [2, 2, 5]))).toEqual([0.707, 0, -0.707]); // level, whatever the height
  });

  test("faces the player when it isn't going anywhere", () => {
    expect(facingFrom([1, 1, 0], [1, 1, 0], 90)).toBe(enemyTurn(90));
  });
});
