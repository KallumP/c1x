import { describe, expect, test } from "vitest";
import type { Vec3 } from "../../src/objects";
import { blenderToView, BOX_UNITS, boxSize, cameraFacing, enemyTurn, facingFrom, fishLeap, LEAF_DRIFT, leafDrift, leafDriftShares, labAssistantThrow, BAT_SWOOP, batSwoop, batSwoopEnd, LEADER_BATS_FLIGHT, leaderBatsFlight, leaderBatsGap, stackCentres, stonePath, stoneRolling, STONE_TRACK, viewToBlender } from "../../src/coords";
import { expectCloseTo, noMinusZero } from "../helpers";

describe("blender and the viewport", () => {
  test("blenderToView turns blender's (x, y, z) into the viewport's (x, z, -y)", () => {
    // the viewport has the .obj's axes, y up
    expect(blenderToView([1, 2, 3])).toEqual([1, 3, -2]);
  });

  test("viewToBlender undoes blenderToView", () => {
    expect(viewToBlender([1, 3, -2])).toEqual([1, 2, 3]);
    expect(viewToBlender(blenderToView([-4.5, 9.5, 0.6]))).toEqual([-4.5, 9.5, 0.6]);
  });

  test("converting 0 back gives 0, not -0", () => {
    expect(Object.is(viewToBlender([0, 0, 0])[1], 0)).toBe(true);
  });
});

describe("boxes", () => {
  test("a box's size in metres follows the level's scale", () => {
    // a box is 400 game units
    expect(boxSize(400)).toBe(1);
    expect(boxSize(2000)).toBe(0.2);
  });

  test("a stack's boxes stand one on another from its raised spot", () => {
    expect(stackCentres([1, 2, 3], 0, 1, 400)).toEqual([[1, 2, 3.5]]);
    expect(stackCentres([1, 2, 3], 2.5, 2, 400)).toEqual([[1, 2, 6], [1, 2, 7]]);
    expect(stackCentres([0, 0, 0], 0, 2, 2000).map(noMinusZero)).toEqual([[0, 0, 0.1], [0, 0, 0.3]]);
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
  test("roll across the camera's view, turning with the level", () => {
    // along +x unturned
    expect(stoneRolling(0)).toEqual([1, 0, 0]);
    expect(stoneRolling(90)).toEqual([0, -1, 0]);
    expect(stoneRolling(180)).toEqual([-1, 0, 0]);
    expect(stoneRolling(270)).toEqual([0, 1, 0]);
    for (const turn of [0, 90, 180, 270]) {
      const [a, b] = [stoneRolling(turn), cameraFacing(turn)];
      expect(a[0] * b[0] + a[1] * b[1]).toBeCloseTo(0); // across the way the camera faces
    }
  });

  test("a stone's path dips from its ends to its middle over its spot", () => {
    // jungle rollers' path: its middle a stone's radius over the track's floor, lifted a box's height over the spot
    const path = stonePath([1, 2, 3], 0, 0, 400);
    expect(path.length).toBe(11);
    const radius = (STONE_TRACK.radius + BOX_UNITS) / 400;
    expect(path[5]).toEqual([1, 2, 3 + radius]);
    expect(path[0][0]).toBeCloseTo(1 + 1800 / 400);
    expect(path[10][0]).toBeCloseTo(1 - 1800 / 400);
    expect(path[0][2]).toBeCloseTo(3 + radius + 472 / 400);
    expect(path.every(([, y]) => y === 2)).toBe(true);
  });

  test("a leaf drifts from its spot back towards the spawn, swaying across the map", () => {
    // as up the creek's first leaf: 13 points, 2400 along the game's z (back
    // along the way the camera faces) and 400 across (game units), level
    const path = leafDrift([1, 2, 3], 0, 0, 400);
    expect(path.length).toBe(LEAF_DRIFT.length);
    expect(path[0]).toEqual([1, 2, 3]);
    expectCloseTo(path[12], [1 + 400 / 400, 2 - 2400 / 400, 3]);
  });

  test("a leaf's drift's points are bunched at its ends: how far along it each is", () => {
    const shares = leafDriftShares();
    expect(shares.length).toBe(LEAF_DRIFT.length);
    expect([shares[0], shares[12]]).toEqual([0, 1]);
    shares.slice(1).forEach((share, point) => expect(share).toBeGreaterThan(shares[point]));
    expect(shares[1]).toBeLessThan(shares[6] - shares[5]); // its first step shorter than one in the middle
  });

  test("a leaf's drift turns with the level and lifts with raise", () => {
    const path = leafDrift([0, 0, 0], 0.5, 90, 400);
    expectCloseTo(path[12], [-2400 / 400, -400 / 400, 0.5]);
  });

  test("a fish leaps across the map from its spot", () => {
    // as up the creek's do: 14 points, 1600 across the map, 2172 at its highest (game units)
    const path = fishLeap([1, 2, 3], 0, 0, 400);
    expect(path.length).toBe(14);
    expect(path[0]).toEqual([1, 2, 3]);
    expect(path[13][0]).toBeCloseTo(1 + 1600 / 400);
    expect(path[13][2]).toBeCloseTo(3);
    expect(Math.max(...path.map(([, , z]) => z))).toBeCloseTo(3 + 2172 / 400);
    expect(path.every(([, y]) => y === 2)).toBe(true);
  });

  test("a fish's leap turns with the level and lifts with raise", () => {
    // across the map, as a stone rolls
    const path = fishLeap([0, 0, 0], 1, 90, 400);
    expect(path[13][0]).toBeCloseTo(0);
    expect(path[13][1]).toBeCloseTo(-1600 / 400);
    expect(path[0][2]).toBeCloseTo(1);
  });

  test("a reversed fish leaps the other way across the map", () => {
    const path = fishLeap([1, 2, 3], 0, 0, 400, true);
    expect(path[13][0]).toBeCloseTo(1 - 1600 / 400);
    expect(Math.max(...path.map(([, , z]) => z))).toBeCloseTo(3 + 2172 / 400);
  });

  test("a bat roost's swoop ends back along the camera's facing by default", () => {
    // 10000 game units, turning with the level
    expect(noMinusZero(batSwoopEnd(0, 400))).toEqual([0, -25, 0]);
    expectCloseTo(batSwoopEnd(90, 400), cameraFacing(90).map((value) => value * -25));
  });

  test("a bat roost's bats follow the game's swoop to its end", () => {
    // as temple ruins' do, its end 10000 back along the route: 14 points, down 1336 at most (game units)
    const path = batSwoop([1, 2, 3], [1, 2 - 25, 3], 0, 400);
    expect(path.length).toBe(14);
    expect(path[0]).toEqual([1, 2, 3]);
    path.forEach((point, index) => {
      const [along, up] = BAT_SWOOP[index];
      expectCloseTo(point, [1, 2 - along / 400, 3 + up / 400]);
    });
  });

  test("a swoop stretches and turns to reach its end", () => {
    // wherever it is, its dip kept, rising or falling to it, each step split to keep its points about as far apart
    const path = batSwoop([0, 0, 0], [50, 0, 1], 0, 400);
    expect(path.length).toBe(27);
    expectCloseTo(path.at(-1)!, [50, 0, 1]);
    expect(path.every(([, y]) => Math.abs(y) < 1e-9)).toBe(true);
    const [along, up] = BAT_SWOOP[1];
    expectCloseTo(path[2], [(2 * along) / 400, 0, up / 400 + (2 * along) / 20000]);
  });

  test("a shorter swoop keeps its points, closer together", () => {
    // temple ruins' 14 points
    const path = batSwoop([0, 0, 0], [0, -10, 0], 0, 400);
    expect(path.length).toBe(14);
    expect(path.at(-1)![1]).toBeCloseTo(-10);
  });

  test("leader bats' second leader is back across the map from the first by default", () => {
    // 6000 game units, the other way from a rolling stone, turning with the level
    expect(noMinusZero(leaderBatsGap(0, 400))).toEqual([-15, 0, 0]);
    expectCloseTo(leaderBatsGap(90, 400), stoneRolling(90).map((value) => value * -15));
  });

  test("leader bats' bats fly the game's flight between the leaders", () => {
    // as sunset vista's do, the leaders 6000 apart: from 1700 over the first leader and 200 before it, down past it, to the second and up 1700 again, 400 behind them (game units)
    const first: Vec3 = [1, 2, 3];
    const flight = leaderBatsFlight(first, [1 - 15, 2, 3], 0, 400);
    expect(flight.length).toBe(13);
    const [startX, startY, startZ] = flight[0];
    expectCloseTo(flight[0], [1 + 200 / 400, 2 - 1, 3 + 1700 / 400]);
    flight.forEach((point, index) => {
      const [across, up] = LEADER_BATS_FLIGHT[index];
      expectCloseTo(point, [startX + across / 400, startY, startZ + up / 400]);
    });
  });

  test("the bats' flight stretches to reach the second leader", () => {
    // wherever it is: along the route, further and higher, in steps of at most 800 between the dive and the climb
    const flight = leaderBatsFlight([0, 0, 0], [0, 20, 1], 0, 400);
    expectCloseTo(flight[0], [0, -200 / 400 - 1, 1700 / 400]);
    expectCloseTo(flight.at(-1)!, [0, 20 + 200 / 400 - 1, 1 + 1700 / 400]);
    const run = flight.slice(3, -3);
    expect(run[0][1]).toBeCloseTo(600 / 400 - 1);
    expect(run.at(-1)![1]).toBeCloseTo(20 - 600 / 400 - 1);
    run.slice(1).forEach((point, step) => expect(Math.hypot(point[0] - run[step][0], point[1] - run[step][1])).toBeLessThanOrEqual(800 / 400 + 1e-9));
  });

  test("between leaders too close for the dive and climb, the bats turn at their middle", () => {
    const flight = leaderBatsFlight([0, 0, 0], [-1, 0, 0], 0, 400);
    expect(flight.length).toBe(7);
    expect(flight[3][0]).toBeCloseTo(-0.5);
  });

  test("a lab assistant throws the other way from a rolling stone", () => {
    // back along the game's x (every throw custom levels get does), turning with the level
    expect(labAssistantThrow(0)).toEqual([-1, 0, 0]);
    expectCloseTo(labAssistantThrow(90), stoneRolling(90).map((value) => -value));
  });

  test("a stone's path turns with the level and lifts with raise", () => {
    const path = stonePath([0, 0, 0], 1, 90, 400);
    expect(path[0][0]).toBeCloseTo(0);
    expect(path[0][1]).toBeCloseTo(-1800 / 400);
    expect(path[5][2]).toBeCloseTo(1 + (STONE_TRACK.radius + STONE_TRACK.lift) / 400);
  });
});

describe("enemies facing the player", () => {
  const turned = (yaw: number): { front: number[]; side: number[] } => ({
    front: noMinusZero([Math.sin(yaw), 0, Math.cos(yaw)]),
    side: noMinusZero([Math.cos(yaw), 0, -Math.sin(yaw)]),
  });

  test.each([0, 90, 180, 270])("at a turn of %i, an enemy's front (+z) faces back along the camera's facing", (turn) => {
    const [dx, dy, dz] = blenderToView(cameraFacing(turn));
    expect(turned(enemyTurn(turn)).front).toEqual(noMinusZero([-dx, dy, -dz]));
  });

  test.each([0, 90, 180, 270])("at a turn of %i, its side (+x) lies along the way a crab walks", (turn) => {
    expect(turned(enemyTurn(turn)).side).toEqual(noMinusZero(blenderToView(stoneRolling(turn))));
  });

  test("an enemy in an unturned level isn't turned", () => {
    expect(enemyTurn(0)).toBe(0);
  });
});

describe("an enemy facing the way it walks", () => {
  const front = (yaw: number) => noMinusZero([Math.sin(yaw), 0, Math.cos(yaw)]);

  test("turns its front (+z) from one place (in blender) towards another", () => {
    expect(front(facingFrom([0, 0, 0], [0, 1, 0]))).toEqual(noMinusZero(blenderToView([0, 1, 0])));
    expect(front(facingFrom([0, 0, 0], [-1, 0, 0]))).toEqual([-1, 0, 0]);
    expect(front(facingFrom([1, 1, 0], [2, 2, 5]))).toEqual([0.707, 0, -0.707]); // level, whatever the height
  });

  test("faces the player when it isn't going anywhere", () => {
    expect(facingFrom([1, 1, 0], [1, 1, 0], 90)).toBe(enemyTurn(90));
  });
});
