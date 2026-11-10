import { describe, expect, test } from "vitest";
import { defaultPath, enemyPath, handleLifts, nodeCount, nodeHeading, pathLength, pathPositions, nodesUnderEnds, nodeTurnedRound, pointAlongShare, respaced, turnedRound, withNodeAt, withNodeCount } from "../../src/enemyPaths";
import { batSwoopEnd, labAssistantThrow, leaderBatsGap } from "../../src/coords";
import { LAB_ASSISTANT_REACH } from "../../src/labAssistantThrow";
import { PATH_NODES_MAX, type Vec3 } from "../../src/objects";
import { enemyObject, expectCloseTo, noMinusZero } from "../helpers";

// where the enemies whose spot matters stand
const SPOT: Vec3 = [1, 2, 3];

describe("a path enemy's default path", () => {
  test("a crab's runs across the map, its middle where it stands", () => {
    // 1600 game units, as its two ends and its middle
    expect(defaultPath("crab", 0, 400).map(noMinusZero)).toEqual([[-2, 0, 0], [0, 0, 0], [2, 0, 0]]);
  });

  test("a turtle's runs along the route, the way the camera faces", () => {
    // 2000 game units
    expect(defaultPath("turtle", 0, 400).map(noMinusZero)).toEqual([[0, -2.5, 0], [0, 0, 0], [0, 2.5, 0]]);
  });

  test("a native's runs across the map", () => {
    // 1972 game units, as the great gate's natives walk
    expect(defaultPath("native", 0, 400).map(noMinusZero)).toEqual([[-2.465, 0, 0], [0, 0, 0], [2.465, 0, 0]]);
  });

  test("a badger's runs along the route from ahead back towards the spawn", () => {
    // 5200 game units, as jungle rollers' badgers run
    expect(defaultPath("badger", 0, 400).map(noMinusZero)).toEqual([[0, 6.5, 0], [0, 0, 0], [0, -6.5, 0]]);
  });

  test("a warthog's runs along the route, the way the camera faces", () => {
    // 5200 game units, as road to nowhere's warthogs charge
    expect(defaultPath("warthog", 0, 400).map(noMinusZero)).toEqual([[0, -6.5, 0], [0, 0, 0], [0, 6.5, 0]]);
  });

  test("a walking spider's runs along the route from ahead back towards the spawn", () => {
    // 3200 game units, as fumbling in the dark's run
    expect(defaultPath("walking_spider", 0, 400).map(noMinusZero)).toEqual([[0, 4, 0], [0, 0, 0], [0, -4, 0]]);
  });

  test("a monkey's runs across the map", () => {
    // 2400 game units, as the great gate's monkeys walk
    expect(defaultPath("monkey", 0, 400).map(noMinusZero)).toEqual([[-3, 0, 0], [0, 0, 0], [3, 0, 0]]);
  });

  test("a lizard's runs across the map", () => {
    // 3200 game units, as the lost city's green lizards leap
    expect(defaultPath("lizard", 0, 400).map(noMinusZero)).toEqual([[-4, 0, 0], [0, 0, 0], [4, 0, 0]]);
  });

  test("a red lizard's runs across the map", () => {
    // 4800 game units, as the lost city's red lizards hop
    expect(defaultPath("red_lizard", 0, 400).map(noMinusZero)).toEqual([[-6, 0, 0], [0, 0, 0], [6, 0, 0]]);
  });

  test("a robot dog's runs along the route", () => {
    // 1600 game units, heavy machinery's robot dogs' longest path, along the way crash runs there
    expect(defaultPath("robot_dog", 0, 400).map(noMinusZero)).toEqual([[0, -2, 0], [0, 0, 0], [0, 2, 0]]);
  });

  test("turns with the level", () => {
    expect(defaultPath("crab", 90, 400).map(noMinusZero)).toEqual([[0, 2, 0], [0, 0, 0], [0, -2, 0]]);
  });

  test("is longer in metres at a smaller scale", () => {
    expect(defaultPath("turtle", 90, 200).map(noMinusZero)).toEqual([[-5, 0, 0], [0, 0, 0], [5, 0, 0]]);
  });
});

describe("an enemy's path", () => {
  test("is its own when it has one", () => {
    expect(enemyPath(enemyObject("crab", { path: [[0, 0, 0], [3, 0, 0]] }), 0, 400)).toEqual([[0, 0, 0], [3, 0, 0]]);
  });

  test("is its default without one", () => {
    expect(enemyPath(enemyObject("crab"), 0, 400)).toEqual(defaultPath("crab", 0, 400));
  });

  test("its nodes are placed from where the enemy stands, raised", () => {
    expect(pathPositions(enemyObject("turtle", { at: SPOT, raise: 0.5, path: [[0, -1, 0], [2, 1, 0.25]] }), 0, 400)).toEqual([[1, 1, 3.5], [3, 3, 3.75]]);
  });

  test("leader bats' is their second leader", () => {
    // its own, or 6000 game units back across the map from the first without one
    const leaders = enemyObject("leader_bats", { at: SPOT, raise: 1.5 });
    const gap = leaderBatsGap(90, 400);
    expectCloseTo(pathPositions(leaders, 90, 400)[0], [1 + gap[0], 2 + gap[1], 4.5 + gap[2]]);
    expect(nodeCount(leaders)).toBe(1);
    expect(enemyPath({ ...leaders, path: [[3, 0, 0]] }, 0, 400)).toEqual([[3, 0, 0]]);
  });

  test("dragging leader bats' second leader puts it there, from the first", () => {
    const leaders = enemyObject("leader_bats", { raise: 1 });
    expect(withNodeAt(leaders, 0, [2, 3, 1], 0, 400)).toEqual([[2, 3, 0]]);
  });

  test("a bat roost's is its swoop's end", () => {
    // its own, or 10000 game units back along the route from the roost without one
    const roost = enemyObject("bat", { at: SPOT, raise: 5 });
    const end = batSwoopEnd(90, 400);
    expectCloseTo(pathPositions(roost, 90, 400)[0], [1 + end[0], 2 + end[1], 8 + end[2]]);
    expect(nodeCount(roost)).toBe(1);
  });

  test("a lab assistant's is where its vials land", () => {
    // its own, or where stormy ascent's first's land without one, back across the map
    const assistant = enemyObject("lab_assistant", { at: SPOT, raise: 0.5 });
    const way = labAssistantThrow(90);
    const reach = LAB_ASSISTANT_REACH / 400;
    expectCloseTo(pathPositions(assistant, 90, 400)[0], [1 + way[0] * reach, 2 + way[1] * reach, 3.5 + way[2] * reach]);
    expect(nodeCount(assistant)).toBe(1);
    expect(nodeHeading(assistant, 0)).toBe("landing spot");
  });

  test("a node's heading in the editor says what the node is", () => {
    // leader bats' is their second leader, a bat roost's its swoop's end, a path enemy's which node of how many
    expect(nodeHeading(enemyObject("leader_bats"), 0)).toBe("leader 2");
    expect(nodeHeading(enemyObject("bat"), 0)).toBe("swoop's end");
    expect(nodeHeading(enemyObject("crab"), 1)).toBe("node 2 of 3");
  });

  test("its length runs along all its nodes", () => {
    expect(pathLength([[0, 0, 0], [3, 0, 0], [3, 4, 0]])).toBe(7);
  });
});

describe("respacing a path's nodes", () => {
  test("puts the given number evenly along it, from its first node to its last, keeping its shape", () => {
    expect(respaced([[0, 0, 0], [3, 0, 0], [3, 3, 0]], 3).map(noMinusZero)).toEqual([[0, 0, 0], [3, 0, 0], [3, 3, 0]]);
    expect(respaced([[0, 0, 0], [3, 0, 0], [3, 3, 0]], 4).map(noMinusZero)).toEqual([[0, 0, 0], [2, 0, 0], [3, 1, 0], [3, 3, 0]]);
    expect(respaced([[0, 0, 0], [4, 0, 0]], 5).map(noMinusZero)).toEqual([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0]]);
  });

  test("fewer nodes span it from end to end", () => {
    expect(respaced([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0], [4, 0, 0]], 2).map(noMinusZero)).toEqual([[0, 0, 0], [4, 0, 0]]);
  });

  test("a path with no length (all its nodes in one place) keeps them there", () => {
    expect(respaced([[1, 1, 0], [1, 1, 0]], 3)).toEqual([[1, 1, 0], [1, 1, 0], [1, 1, 0]]);
  });
});

describe("moving a node", () => {
  test("puts it at a place in blender, leaving the rest of the path", () => {
    // from where the enemy stands, raised
    const turtle = enemyObject("turtle", { at: SPOT, raise: 0.5, path: [[0, -1, 0], [0, 1, 0]] });
    expect(withNodeAt(turtle, 1, [4, 5, 3.5], 0, 400)).toEqual([[0, -1, 0], [3, 3, 0]]);
  });

  test("an enemy without a path of its own gets its default path, with that node moved", () => {
    const moved = withNodeAt(enemyObject("crab", { at: SPOT }), 0, [1, 4, 3], 0, 400);
    expect(moved.map(noMinusZero)).toEqual([[0, 2, 0], [0, 0, 0], [2, 0, 0]]);
  });
});

describe("changing how many nodes a path has", () => {
  test("uses the default path when there is none", () => {
    expect(withNodeCount(enemyObject("crab"), 3, 0, 400).map(noMinusZero)).toEqual([[-2, 0, 0], [0, 0, 0], [2, 0, 0]]);
  });

  test("keeps to 2 to 20 nodes", () => {
    expect(withNodeCount(enemyObject("crab"), 1, 0, 400).length).toBe(2);
    expect(withNodeCount(enemyObject("crab"), 50, 0, 400).length).toBe(PATH_NODES_MAX);
  });
});

describe("nodes under the enemy at an end of its path", () => {
  test("are the ends, and any node within reach of one, seen from above", () => {
    const positions: Vec3[] = [[0, 0, 0], [0.4, 0, 0], [1, 0, 0], [2, 0, 0], [2.7, 0.2, 0], [3, 0, 0]];
    expect(nodesUnderEnds(positions, 0.5)).toEqual([true, true, false, false, true, true]);
  });

  test("are found whatever their height", () => {
    expect(nodesUnderEnds([[0, 0, 0], [0.2, 0, 5], [3, 0, 0]], 0.5)).toEqual([true, true, true]);
  });
});

describe("how high a node's handle floats above it", () => {
  test("is the higher of the enemy's height at an end and the ground's depth over the node", () => {
    // in metres: the enemy's height for a node under an end, how far down it is for a node under the ground, and none for the rest
    const underEnds = [true, false, false, true, true];
    const depths = [null, 0.5, null, 2, 0.3];
    expect(handleLifts(underEnds, depths, 1)).toEqual([1, 0.5, 0, 2, 1]);
  });
});

describe("turning a path round", () => {
  test("reverses its nodes, so the enemy starts at the other end", () => {
    const bent = enemyObject("turtle", { path: [[0, 0, 0], [0, 2, 0], [2, 2, 0]] });
    expect(turnedRound(bent, 0, 400)).toEqual([[2, 2, 0], [0, 2, 0], [0, 0, 0]]);
  });

  test("an enemy without a path of its own gets its default path, turned round", () => {
    expect(turnedRound(enemyObject("crab"), 0, 400).map(noMinusZero)).toEqual([[2, 0, 0], [0, 0, 0], [-2, 0, 0]]);
  });

  test("a node keeps its place, counted from the other end", () => {
    expect([0, 1, 4].map((node) => nodeTurnedRound(node, 5))).toEqual([4, 3, 0]);
  });

});

describe("a point along a path", () => {
  test("is a share of the way along it, from its first node", () => {
    const bent: Vec3[] = [[0, 0, 0], [2, 0, 0], [2, 2, 0]];
    expect([0, 0.25, 0.5, 0.75, 1].map((share) => noMinusZero(pointAlongShare(bent, share))))
      .toEqual([[0, 0, 0], [1, 0, 0], [2, 0, 0], [2, 1, 0], [2, 2, 0]]);
  });
});
