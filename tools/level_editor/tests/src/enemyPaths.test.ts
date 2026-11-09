import { describe, expect, test } from "vitest";
import { DEFAULT_PATH_NODES, defaultPath, enemyPath, handleLifts, nodeCount, pathLength, pathPositions, nodesUnderEnds, nodeTurnedRound, pointAlongShare, respaced, turnedRound, withNodeAt, withNodeCount } from "../../src/enemyPaths";
import { leaderBatSpots } from "../../src/coords";
import { PATH_NODES_MAX, type LevelObject, type Vec3 } from "../../src/objects";

const noMinusZero = (nodes: Vec3[]) => nodes.map((node) => node.map((value) => Math.round(value * 1000) / 1000 + 0));
const enemy = (type: "crab" | "turtle" | "native" | "badger" | "warthog" | "walking_spider" | "monkey", more: Partial<LevelObject> = {}): LevelObject =>
  ({ kind: "enemy", enemy: type, at: [1, 2, 3], raise: 0, stack: 1, ...more });

describe("a path enemy's default path", () => {
  test("a crab's: 1600 game units across the map, its middle where it stands, as its two ends and its middle", () => {
    expect(DEFAULT_PATH_NODES).toBe(3);
    expect(noMinusZero(defaultPath("crab", 0, 400))).toEqual([[-2, 0, 0], [0, 0, 0], [2, 0, 0]]);
  });

  test("a turtle's: 2000 game units along the route, the way the camera faces", () => {
    expect(noMinusZero(defaultPath("turtle", 0, 400))).toEqual([[0, -2.5, 0], [0, 0, 0], [0, 2.5, 0]]);
  });

  test("a native's: 1972 game units across the map, as the great gate's natives walk", () => {
    expect(noMinusZero(defaultPath("native", 0, 400))).toEqual([[-2.465, 0, 0], [0, 0, 0], [2.465, 0, 0]]);
    expect(enemyPath(enemy("native"), 90, 400)).toEqual(defaultPath("native", 90, 400));
  });

  test("a badger's: 5200 game units along the route, as jungle rollers' badgers run, from ahead back towards the spawn", () => {
    expect(noMinusZero(defaultPath("badger", 0, 400))).toEqual([[0, 6.5, 0], [0, 0, 0], [0, -6.5, 0]]);
    expect(enemyPath(enemy("badger"), 90, 400)).toEqual(defaultPath("badger", 90, 400));
  });

  test("a warthog's: 5200 game units along the route, the way the camera faces, as road to nowhere's warthogs charge", () => {
    expect(noMinusZero(defaultPath("warthog", 0, 400))).toEqual([[0, -6.5, 0], [0, 0, 0], [0, 6.5, 0]]);
  });

  test("a walking spider's: 3200 game units along the route, from ahead back towards the spawn, as fumbling in the dark's run", () => {
    expect(noMinusZero(defaultPath("walking_spider", 0, 400))).toEqual([[0, 4, 0], [0, 0, 0], [0, -4, 0]]);
  });

  test("a monkey's: 2400 game units across the map, as the great gate's monkeys walk", () => {
    expect(noMinusZero(defaultPath("monkey", 0, 400))).toEqual([[-3, 0, 0], [0, 0, 0], [3, 0, 0]]);
  });

  test("turns with the level, and is longer in metres at a smaller scale", () => {
    expect(noMinusZero(defaultPath("turtle", 90, 200))).toEqual([[-5, 0, 0], [0, 0, 0], [5, 0, 0]]);
    expect(noMinusZero(defaultPath("crab", 90, 400))).toEqual([[0, 2, 0], [0, 0, 0], [0, -2, 0]]);
  });
});

describe("an enemy's path", () => {
  test("is its own, or its default without one", () => {
    expect(enemyPath(enemy("crab", { path: [[0, 0, 0], [3, 0, 0]] }), 0, 400)).toEqual([[0, 0, 0], [3, 0, 0]]);
    expect(enemyPath(enemy("crab"), 0, 400)).toEqual(defaultPath("crab", 0, 400));
  });

  test("its nodes' places in blender: from where the enemy stands, raised", () => {
    expect(pathPositions(enemy("turtle", { raise: 0.5, path: [[0, -1, 0], [2, 1, 0.25]] }), 0, 400)).toEqual([[1, 1, 3.5], [3, 3, 3.75]]);
  });

  test("a leader bats roost's are its leaders, where they hover without a path of its own (as the editor's always drawn them), 2 of them", () => {
    const roost: LevelObject = { kind: "enemy", enemy: "leader_bats", at: [1, 2, 3], raise: 5, stack: 1 };
    expect(pathPositions(roost, 90, 400)).toEqual(leaderBatSpots([1, 2, 3], 5, 90, 400));
    expect(nodeCount(roost)).toBe(2);
    expect(enemyPath({ ...roost, path: [[0, 0, 0], [3, 0, 0]] }, 0, 400)).toEqual([[0, 0, 0], [3, 0, 0]]);
  });

  test("dragging a leader bats roost's leader moves just that one", () => {
    const roost: LevelObject = { kind: "enemy", enemy: "leader_bats", at: [0, 0, 0], raise: 0, stack: 1 };
    const [, far] = leaderBatSpots([0, 0, 0], 0, 0, 400);
    expect(noMinusZero(withNodeAt(roost, 0, [1, 1, 1], 0, 400))).toEqual(noMinusZero([[1, 1, 1], far]));
  });

  test("its length, along all its nodes", () => {
    expect(pathLength([[0, 0, 0], [3, 0, 0], [3, 4, 0]])).toBe(7);
  });
});

describe("respacing a path's nodes", () => {
  test("puts the given number evenly along it, from its first node to its last, keeping its shape", () => {
    expect(noMinusZero(respaced([[0, 0, 0], [3, 0, 0], [3, 3, 0]], 3))).toEqual([[0, 0, 0], [3, 0, 0], [3, 3, 0]]);
    expect(noMinusZero(respaced([[0, 0, 0], [3, 0, 0], [3, 3, 0]], 4))).toEqual([[0, 0, 0], [2, 0, 0], [3, 1, 0], [3, 3, 0]]);
    expect(noMinusZero(respaced([[0, 0, 0], [4, 0, 0]], 5))).toEqual([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0]]);
  });

  test("fewer nodes than it had: still from end to end", () => {
    expect(noMinusZero(respaced([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0]], 2))).toEqual([[0, 0, 0], [4, 0, 0]]);
  });

  test("a path with no length (all its nodes in one place) keeps them there", () => {
    expect(respaced([[1, 1, 0], [1, 1, 0]], 3)).toEqual([[1, 1, 0], [1, 1, 0], [1, 1, 0]]);
  });
});

describe("moving a node", () => {
  test("puts it at a place in blender, from where the enemy stands (raised), the rest of its path as it was", () => {
    const turtle = enemy("turtle", { raise: 0.5, path: [[0, -1, 0], [0, 1, 0]] });
    expect(withNodeAt(turtle, 1, [4, 5, 3.5], 0, 400)).toEqual([[0, -1, 0], [3, 3, 0]]);
  });

  test("an enemy without a path of its own gets its default path, with that node moved", () => {
    const moved = withNodeAt(enemy("crab"), 0, [1, 4, 3], 0, 400);
    expect(noMinusZero(moved)).toEqual([[0, 2, 0], [0, 0, 0], [2, 0, 0]]);
  });
});

describe("changing how many nodes a path has", () => {
  test("respaces its nodes evenly along it, its default if it has none", () => {
    expect(noMinusZero(withNodeCount(enemy("crab"), 3, 0, 400))).toEqual([[-2, 0, 0], [0, 0, 0], [2, 0, 0]]);
    const bent = enemy("turtle", { path: [[0, 0, 0], [0, 2, 0], [2, 2, 0]] });
    expect(noMinusZero(withNodeCount(bent, 5, 0, 400))).toEqual([[0, 0, 0], [0, 1, 0], [0, 2, 0], [1, 2, 0], [2, 2, 0]]);
  });

  test(`keeps to 2 to ${PATH_NODES_MAX} nodes`, () => {
    expect(withNodeCount(enemy("crab"), 1, 0, 400).length).toBe(2);
    expect(withNodeCount(enemy("crab"), 50, 0, 400).length).toBe(PATH_NODES_MAX);
  });
});

describe("nodes under the enemy at an end of its path", () => {
  test("are the ends, and any node within reach of one, seen from above", () => {
    const positions: Vec3[] = [[0, 0, 0], [0.4, 0, 0], [1, 0, 0], [2, 0, 0], [2.7, 0.2, 0], [3, 0, 0]];
    expect(nodesUnderEnds(positions, 0.5)).toEqual([true, true, false, false, true, true]);
  });

  test("whatever their height", () => {
    expect(nodesUnderEnds([[0, 0, 0], [0.2, 0, 5], [3, 0, 0]], 0.5)).toEqual([true, true, true]);
  });
});

describe("how high a node's handle floats above it", () => {
  test("the enemy's height for a node under an end, how far down it is for a node under the ground, the higher of the two for both, and none for the rest (metres)", () => {
    const underEnds = [true, false, false, true, true];
    const depths = [null, 0.5, null, 2, 0.3];
    expect(handleLifts(underEnds, depths, 1)).toEqual([1, 0.5, 0, 2, 1]);
  });
});

describe("turning a path round", () => {
  test("reverses its nodes, so the enemy starts at the other end", () => {
    const bent = enemy("turtle", { path: [[0, 0, 0], [0, 2, 0], [2, 2, 0]] });
    expect(turnedRound(bent, 0, 400)).toEqual([[2, 2, 0], [0, 2, 0], [0, 0, 0]]);
  });

  test("an enemy without a path of its own gets its default path, turned round", () => {
    expect(noMinusZero(turnedRound(enemy("crab"), 0, 400))).toEqual([[2, 0, 0], [0, 0, 0], [-2, 0, 0]]);
  });

  test("a node is the same node after, counted from the other end", () => {
    expect([0, 1, 4].map((node) => nodeTurnedRound(node, 5))).toEqual([4, 3, 0]);
  });

});

describe("a point along a path", () => {
  test("is a share of the way along it, from its first node", () => {
    const bent: Vec3[] = [[0, 0, 0], [2, 0, 0], [2, 2, 0]];
    expect([0, 0.25, 0.5, 0.75, 1].map((share) => noMinusZero([pointAlongShare(bent, share)])[0]))
      .toEqual([[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 2, 0]]);
  });
});
