import { describe, expect, test } from "vitest";
import { numberSetting, boxTypeName, formatObjects, hasNodes, hasPath, parseObjects } from "../../src/objects";
import { enemyObject, obstacleObject } from "../helpers";

describe("parseObjects", () => {
  test("reads spawn, end and boxes with their settings", () => {
    const objects = parseObjects(`[
      {"kind": "spawn", "at": [0.5, 3.5, 0.3]},
      {"kind": "box", "type": "basic", "at": [1, 10, 0], "stack": 2},
      {"kind": "box", "subtype": 13, "at": [2, 10, 0], "raise": 1.5},
      {"kind": "end", "at": [0, 48, 1.2], "raise": 0.15}
    ]`);
    expect(objects).toEqual([
      { kind: "spawn", at: [0.5, 3.5, 0.3], raise: 0, stack: 1 },
      { kind: "box", box: "basic", at: [1, 10, 0], raise: 0, stack: 2 },
      { kind: "box", box: 13, at: [2, 10, 0], raise: 1.5, stack: 1 },
      { kind: "end", at: [0, 48, 1.2], raise: 0.15, stack: 1 },
    ]);
  });

  test("reads any box type by name or subtype", () => {
    const objects = parseObjects(`[
      {"kind": "box", "type": "tnt", "at": [0, 0, 0]},
      {"kind": "box", "type": "iron_arrow", "at": [1, 0, 0]},
      {"kind": "box", "subtype": 19, "at": [2, 0, 0]},
      {"kind": "box", "subtype": 11, "at": [3, 0, 0]}
    ]`);
    expect(objects.map((object) => object.box)).toEqual(["tnt", "iron_arrow", 19, 11]);
  });

  test.each([
    ["{", "isn't valid JSON"],
    ["{}", "should be a list of objects"],
    ["[1]", "object 1 should be"],
    ['[{"at": [0, 0, 0]}]', "object 1 has no kind"],
    ['[{"kind": "tnt", "at": [0, 0, 0]}]', "object 1: unknown kind tnt"],
    ['[{"kind": "end", "at": [0, 0, 0]}, {"kind": "end", "at": [1, 0, 0]}]', "object 2: there's already a end"],
    ['[{"kind": "spawn", "at": [0, 0]}]', "object 1: at should be"],
    ['[{"kind": "spawn", "at": [0, 0, 0], "raise": "up"}]', "object 1: raise should be"],
    ['[{"kind": "box", "at": [0, 0, 0]}]', "object 1: a box needs a type"],
    ['[{"kind": "box", "type": "nitro", "at": [0, 0, 0]}]', "object 1: unknown box type nitro"],
    ['[{"kind": "box", "subtype": 1, "at": [0, 0, 0]}]', "object 1: a box's subtype should be"],
    ['[{"kind": "box", "subtype": 12, "at": [0, 0, 0]}]', "object 1: a box's subtype should be"],
    ['[{"kind": "box", "type": "basic", "at": [0, 0, 0], "stack": 0}]', "object 1: stack should be"],
    ['[{"kind": "box", "type": "basic", "at": [0, 0, 0], "stack": 1.5}]', "object 1: stack should be"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});

describe("settings an object's kind doesn't have", () => {
  test.each([
    { what: "spawn", object: { kind: "spawn" }, setting: "stack", value: 2 },
    { what: "plant", object: { kind: "enemy", type: "plant" }, setting: "stack", value: 2 },
    { what: "box", object: { kind: "box", type: "basic" }, setting: "path", value: [[0, 0, 0], [1, 0, 0]] },
    { what: "box", object: { kind: "box", type: "basic" }, setting: "speed", value: 2 },
    { what: "box", object: { kind: "box", type: "basic" }, setting: "reverse", value: true },
    { what: "box", object: { kind: "box", type: "basic" }, setting: "count", value: 2 },
  ])("a $what refuses $setting as an unknown setting", ({ object, setting, value }) => {
    const text = JSON.stringify([{ ...object, at: [0, 0, 0], [setting]: value }]);
    expect(() => parseObjects(text)).toThrow(`object 1: unknown setting ${setting}`);
  });
});

describe("formatObjects", () => {
  test("writes one object a line, leaving out default settings", () => {
    expect(formatObjects([
      { kind: "box", box: "basic", at: [1, 10, 0], raise: 0, stack: 2 },
      { kind: "box", box: 13, at: [2, 10, 0], raise: 1.5, stack: 1 },
    ])).toBe(
      "[\n" +
      '  {"kind": "box", "type": "basic", "at": [1, 10, 0], "stack": 2},\n' +
      '  {"kind": "box", "subtype": 13, "at": [2, 10, 0], "raise": 1.5}\n' +
      "]\n");
  });

  test("puts a blank line between runs of different kinds", () => {
    expect(formatObjects([
      { kind: "spawn", at: [0, 0, 0], raise: 0, stack: 1 },
      { kind: "box", box: "life", at: [1, 1, 0], raise: 0, stack: 1 },
      { kind: "end", at: [0, 9, 0], raise: 0, stack: 1 },
    ])).toBe(
      "[\n" +
      '  {"kind": "spawn", "at": [0, 0, 0]},\n\n' +
      '  {"kind": "box", "type": "life", "at": [1, 1, 0]},\n\n' +
      '  {"kind": "end", "at": [0, 9, 0]}\n' +
      "]\n");
  });

  test("writes the spawn first and the end last, keeping the boxes' order", () => {
    // a switch's outline boxes go in order
    const text = formatObjects([
      { kind: "box", box: "basic", at: [1, 0, 0], raise: 0, stack: 1 },
      { kind: "end", at: [0, 9, 0], raise: 0, stack: 1 },
      { kind: "box", box: "outline", at: [2, 0, 0], raise: 0, stack: 1 },
      { kind: "spawn", at: [0, 0, 0], raise: 0, stack: 1 },
    ]);
    const kinds = parseObjects(text).map((object) => (object.box === undefined ? object.kind : `${object.kind} ${object.box}`));
    expect(kinds).toEqual(["spawn", "box basic", "box outline", "end"]);
  });

  test("rounds positions to the millimetre", () => {
    expect(formatObjects([{ kind: "spawn", at: [0.1 + 0.2, -1.23456, 2], raise: 0.30004, stack: 1 }]))
      .toBe('[\n  {"kind": "spawn", "at": [0.3, -1.235, 2], "raise": 0.3}\n]\n');
  });

  test("writes an empty list for no objects", () => {
    expect(formatObjects([])).toBe("[]\n");
  });

  test("reads back what it writes", () => {
    const objects = parseObjects(`[{"kind": "box", "type": "arrow", "at": [8, 35.5, 0], "raise": 2.5, "stack": 3}]`);
    expect(parseObjects(formatObjects(objects))).toEqual(objects);
  });
});

describe("boxTypeName", () => {
  test("is the type a box was given", () => {
    expect(boxTypeName("life")).toBe("life");
  });

  test("is the type a subtype number has", () => {
    expect(boxTypeName(13)).toBe("outline");
    expect(boxTypeName(9)).toBe("aku_aku");
  });
});

describe("enemies", () => {
  test("reads an enemy by its type and spot", () => {
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "plant", "at": [1, 10, 0]},
      {"kind": "enemy", "type": "crab", "at": [2, 30, 0]},
      {"kind": "enemy", "type": "turtle", "at": [3, 40, 0]},
      {"kind": "enemy", "type": "native", "at": [4, 50, 0]},
      {"kind": "enemy", "type": "badger", "at": [5, 60, 0]},
      {"kind": "enemy", "type": "bat", "at": [6, 70, 0], "raise": 3},
      {"kind": "enemy", "type": "leader_bats", "at": [7, 80, 0], "raise": 2},
      {"kind": "enemy", "type": "lizard", "at": [8, 90, 0]},
      {"kind": "enemy", "type": "red_lizard", "at": [9, 100, 0]},
      {"kind": "enemy", "type": "robot_dog", "at": [12, 130, 0]},
      {"kind": "enemy", "type": "barrel_roller", "at": [13, 140, 0]},
      {"kind": "enemy", "type": "walking_lizard", "at": [16, 170, 0]},
      {"kind": "enemy", "type": "camera_robot", "at": [17, 180, 0]},
      {"kind": "enemy", "type": "bird", "at": [18, 190, 0]},
      {"kind": "enemy", "type": "electric_scientist", "at": [19, 200, 0]},
      {"kind": "enemy", "type": "blob", "at": [15, 160, 0]},
      {"kind": "enemy", "type": "flying_camera", "at": [20, 210, 0]},
      {"kind": "enemy", "type": "gunman", "at": [14, 150, 0]},
      {"kind": "enemy", "type": "lab_assistant", "at": [10, 110, 0]},
      {"kind": "enemy", "type": "snake", "at": [11, 120, 0]}
    ]`);
    expect(objects).toEqual([
      { kind: "enemy", enemy: "plant", at: [1, 10, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "crab", at: [2, 30, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "turtle", at: [3, 40, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "native", at: [4, 50, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "badger", at: [5, 60, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "bat", at: [6, 70, 0], raise: 3, stack: 1 },
      { kind: "enemy", enemy: "leader_bats", at: [7, 80, 0], raise: 2, stack: 1 },
      { kind: "enemy", enemy: "lizard", at: [8, 90, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "red_lizard", at: [9, 100, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "robot_dog", at: [12, 130, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "barrel_roller", at: [13, 140, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "walking_lizard", at: [16, 170, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "camera_robot", at: [17, 180, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "bird", at: [18, 190, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "electric_scientist", at: [19, 200, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "blob", at: [15, 160, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "flying_camera", at: [20, 210, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "gunman", at: [14, 150, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "lab_assistant", at: [10, 110, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "snake", at: [11, 120, 0], raise: 0, stack: 1 },
    ]);
  });

  test.each([
    ['[{"kind": "enemy", "at": [0, 0, 0]}]', "object 1: an enemy needs a type (plant, blue_river_plant, green_river_plant, spider, snake, gunman, fish, lab_assistant, crab, turtle, native, monkey, warthog, lizard, red_lizard, walking_lizard, robot_dog, barrel_roller, camera_robot, bird, electric_scientist, blob, flying_camera, badger, walking_spider, bat, leader_bats)"],
    ['[{"kind": "enemy", "type": "dragon", "at": [0, 0, 0]}]', "object 1: unknown enemy type dragon"],
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "path": [[0, 1, 0]]}]', "object 1: a plant has no path (crabs, turtles, natives, badgers, warthogs, walking spiders, monkeys, lizards, red lizards, walking lizards, robot dogs, barrel rollers, camera robots, birds, electric scientists, blobs and flying cameras do)"],
    ['[{"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0]}]', "object 1: unknown enemy type rolling_stone"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });

  test("writes enemies after the boxes and before the end", () => {
    const text = formatObjects([
      { kind: "end", at: [0, 9, 0], raise: 0, stack: 1 },
      enemyObject("plant"),
      { kind: "box", box: "basic", at: [1, 0, 0], raise: 0, stack: 1 },
    ]);
    const kinds = parseObjects(text).map((object) => object.kind);
    expect(kinds).toEqual(["box", "enemy", "end"]);
  });

  test("reads back what it writes", () => {
    const objects = parseObjects(`[{"kind": "enemy", "type": "plant", "at": [8, 35.5, 0], "raise": 0.5}]`);
    expect(parseObjects(formatObjects(objects))).toEqual(objects);
  });
});

describe("enemy paths", () => {
  test("reads a path enemy's path, its nodes from where it stands", () => {
    // in metres
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "crab", "at": [2, 30, 0], "path": [[-2, 0, 0], [0, 1, 0], [2, 0, 0]]},
      {"kind": "enemy", "type": "turtle", "at": [3, 40, 0], "path": [[0, -2.5, 0], [0, 2.5, 0.5]]},
      {"kind": "enemy", "type": "native", "at": [4, 45, 0], "path": [[-1, 0, 0], [1, 0, 0]]},
      {"kind": "enemy", "type": "badger", "at": [5, 48, 0], "path": [[0, 3, 0], [0, -3, 0]]},
      {"kind": "enemy", "type": "turtle", "at": [3, 50, 0]}
    ]`);
    expect(objects.map(({ path }) => path)).toEqual([[[-2, 0, 0], [0, 1, 0], [2, 0, 0]], [[0, -2.5, 0], [0, 2.5, 0.5]], [[-1, 0, 0], [1, 0, 0]], [[0, 3, 0], [0, -3, 0]], undefined]);
  });

  test("reads leader bats' second leader as their path", () => {
    // where it hovers, from the first (at, raised), in metres
    const [leaders] = parseObjects('[{"kind": "enemy", "type": "leader_bats", "at": [0, 0, 0], "path": [[-14, 2, 0]]}]');
    expect(leaders.path).toEqual([[-14, 2, 0]]);
  });

  test("reads a lab assistant's landing spot as its path", () => {
    // where its vials land, from it (at, raised), in metres
    const [assistant] = parseObjects('[{"kind": "enemy", "type": "lab_assistant", "at": [0, 0, 0], "path": [[0, -6, 0]]}]');
    expect(assistant.path).toEqual([[0, -6, 0]]);
  });

  test("reads a bat roost's swoop's end as its path", () => {
    // where its bats' swoop ends, from the roost (at, raised), in metres
    const [roost] = parseObjects('[{"kind": "enemy", "type": "bat", "at": [0, 0, 0], "path": [[10, -20, 0]]}]');
    expect(roost.path).toEqual([[10, -20, 0]]);
  });

  // leader bats' node is their second leader, a bat roost's its swoop's end and a lab
  // assistant's its landing spot: they have nodes, though only path enemies walk them
  test.each([
    ["crab", true, true],
    ["robot_dog", true, true],
    ["barrel_roller", true, true],
    ["walking_lizard", true, true],
    ["camera_robot", true, true],
    ["bird", true, true],
    ["electric_scientist", true, true],
    ["blob", true, true],
    ["flying_camera", true, true],
    ["leader_bats", true, false],
    ["bat", true, false],
    ["lab_assistant", true, false],
    ["fish", false, false],
    ["gunman", false, false],
  ] as const)("a %s has nodes: %s, walks a path: %s", (enemy, nodes, path) => {
    expect(hasNodes(enemyObject(enemy))).toBe(nodes);
    expect(hasPath(enemyObject(enemy))).toBe(path);
  });

  test("writes a path after the rest, to the millimetre, and reads it back", () => {
    const crab = enemyObject("crab", { at: [1, 2, 0], path: [[-2.00004, 0, 0], [2, 0.5, 0]] });
    const text = formatObjects([crab]);
    expect(text).toBe([
      "[",
      '  {"kind": "enemy", "type": "crab", "at": [1, 2, 0], "path": [[-2, 0, 0], [2, 0.5, 0]]}',
      "]",
      "",
    ].join("\n"));
    expect(parseObjects(text)).toEqual([{ ...crab, path: [[-2, 0, 0], [2, 0.5, 0]] }]);
  });

  test.each([
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: a plant has no path (crabs, turtles, natives, badgers, warthogs, walking spiders, monkeys, lizards, red lizards, walking lizards, robot dogs, barrel rollers, camera robots, birds, electric scientists, blobs and flying cameras do)"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "path": [[0, 0, 0]]}]', "object 1: a path should be 2 to 20 nodes"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0]]}]', "object 1: a path's nodes should each be [x, y, z] in metres"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "path": "across"}]', "object 1: a path should be 2 to"],
    ['[{"kind": "enemy", "type": "leader_bats", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: leader bats' path is their second leader, [[x, y, z]] in metres from the first"],
    ['[{"kind": "enemy", "type": "leader_bats", "at": [0, 0, 0], "path": []}]', "object 1: leader bats' path is their second leader"],
    ['[{"kind": "enemy", "type": "bat", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: a bat roost's path is its swoop's end, [[x, y, z]] in metres from the roost"],
    ['[{"kind": "enemy", "type": "lab_assistant", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: a lab assistant's path is where its vials land, [[x, y, z]] in metres from it"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });

  test("refuses a path of more than 20 nodes", () => {
    const nodes = Array.from({ length: 21 }, (_, index) => [index, 0, 0]);
    expect(() => parseObjects(JSON.stringify([{ kind: "enemy", type: "turtle", at: [0, 0, 0], path: nodes }]))).toThrow("2 to 20 nodes");
  });
});

describe("enemy speeds", () => {
  test("reads a path enemy's speed", () => {
    // how many times the game's own pace it walks at
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "crab", "at": [0, 0, 0], "speed": 2},
      {"kind": "enemy", "type": "turtle", "at": [0, 0, 0], "speed": 0.5},
      {"kind": "enemy", "type": "native", "at": [0, 0, 0], "speed": 1.5},
      {"kind": "enemy", "type": "badger", "at": [0, 0, 0], "speed": 2.5},
      {"kind": "enemy", "type": "turtle", "at": [0, 0, 0]}
    ]`);
    expect(objects.map(({ speed }) => speed)).toEqual([2, 0.5, 1.5, 2.5, undefined]);
  });

  test("writes a speed after the rest, leaving out the game's own", () => {
    const turtle = enemyObject("turtle", { at: [1, 2, 0] });
    expect(formatObjects([{ ...turtle, speed: 1.5 }])).toContain('"at": [1, 2, 0], "speed": 1.5}');
    expect(formatObjects([{ ...turtle, speed: 1 }])).toContain('"at": [1, 2, 0]}');
    const withPath = formatObjects([{ ...turtle, path: [[0, 0, 0], [1, 0, 0]], speed: 2 }]);
    expect(withPath).toContain('"path": [[0, 0, 0], [1, 0, 0]], "speed": 2}');
    expect(parseObjects(withPath)).toEqual([{ ...turtle, path: [[0, 0, 0], [1, 0, 0]], speed: 2 }]);
  });

  test.each([
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "speed": 2}]', "object 1: a plant has no speed (crabs, turtles, natives, badgers, warthogs, walking spiders, monkeys, lizards, red lizards, walking lizards, robot dogs, barrel rollers, camera robots, birds, electric scientists, blobs and flying cameras, and sliding pillars do)"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "speed": 4}]', "object 1: speed should be 0.25 to 3 (times the game's own pace, or a sliding pillar's metres a second)"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "speed": 0.1}]', "object 1: speed should be 0.25 to 3"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "speed": "fast"}]', "object 1: speed should be 0.25 to 3"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});

describe("a rolling stone's direction", () => {
  test("a rolling stone can be reversed", () => {
    // to start at the other end of its track
    const objects = parseObjects(`[
      {"kind": "obstacle", "type": "rolling_stone", "at": [0, 0, 0], "reverse": true},
      {"kind": "obstacle", "type": "rolling_stone", "at": [0, 0, 0], "reverse": false},
      {"kind": "obstacle", "type": "rolling_stone", "at": [0, 0, 0]}
    ]`);
    expect(objects.map(({ reverse }) => reverse)).toEqual([true, undefined, undefined]);
  });

  test("a fish can be reversed", () => {
    // to leap the other way across the map
    const [fish] = parseObjects('[{"kind": "enemy", "type": "fish", "at": [0, 0, 0], "reverse": true}]');
    expect(fish.reverse).toBe(true);
  });

  test("writes it when it's reversed, and reads it back", () => {
    const stone = obstacleObject("rolling_stone", { at: [1, 2, 0] });
    const text = formatObjects([{ ...stone, reverse: true }]);
    expect(text).toContain('"at": [1, 2, 0], "reverse": true}');
    expect(parseObjects(text)).toEqual([{ ...stone, reverse: true }]);
    expect(formatObjects([stone])).toContain('"at": [1, 2, 0]}');
  });

  test.each([
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "reverse": true}]', "object 1: a crab has no reverse (rolling stones and fish do; reverse a crab's path instead)"],
    ['[{"kind": "enemy", "type": "lab_assistant", "at": [0, 0, 0], "reverse": true}]', "object 1: a lab_assistant has no reverse"],
    ['[{"kind": "obstacle", "type": "rolling_stone", "at": [0, 0, 0], "reverse": "yes"}]', "object 1: reverse should be true or false"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});

describe("a rolling stone's start", () => {
  test("a rolling stone can start partway along its track", () => {
    // 0 its first end, 1 its far end
    const objects = parseObjects(`[
      {"kind": "obstacle", "type": "rolling_stone", "at": [0, 0, 0], "start": 0.5},
      {"kind": "obstacle", "type": "rolling_stone", "at": [0, 0, 0], "start": 1, "reverse": true},
      {"kind": "obstacle", "type": "rolling_stone", "at": [0, 0, 0]}
    ]`);
    expect(objects.map(({ start, reverse }) => [start, reverse])).toEqual([[0.5, undefined], [1, true], [undefined, undefined]]);
  });

  test("writes it when it isn't 0, before reverse, and reads it back", () => {
    const stone = obstacleObject("rolling_stone", { at: [1, 2, 0] });
    const text = formatObjects([{ ...stone, start: 0.25, reverse: true }]);
    expect(text).toContain('"at": [1, 2, 0], "start": 0.25, "reverse": true}');
    expect(parseObjects(text)).toEqual([{ ...stone, start: 0.25, reverse: true }]);
    expect(formatObjects([{ ...stone, start: 0 }])).toContain('"at": [1, 2, 0]}');
  });

  test.each([
    ['[{"kind": "enemy", "type": "turtle", "at": [0, 0, 0], "start": 0.5}]', "object 1: a turtle has no start (rolling stones do)"],
    ['[{"kind": "obstacle", "type": "leaf", "at": [0, 0, 0], "start": 0.5}]', "object 1: a leaf has no start (rolling stones do)"],
    ['[{"kind": "obstacle", "type": "leaf", "at": [0, 0, 0], "reverse": true}]', "object 1: a leaf has no reverse"],
    ['[{"kind": "obstacle", "type": "rolling_stone", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: a rolling_stone has no path (leaves and sliding pillars do)"],
    ['[{"kind": "obstacle", "type": "rolling_stone", "at": [0, 0, 0], "start": 1.5}]', "object 1: start should be 0 to 1 (how far along its track it starts)"],
    ['[{"kind": "obstacle", "type": "rolling_stone", "at": [0, 0, 0], "start": "middle"}]', "object 1: start should be 0 to 1"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});

describe("badger counts", () => {
  const badger = enemyObject("badger", { at: [1, 2, 0] });

  test("a badger can have a count", () => {
    // how many come out in each wave
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "badger", "at": [0, 0, 0], "count": 4},
      {"kind": "enemy", "type": "badger", "at": [0, 0, 0]}
    ]`);
    expect(objects.map(({ count }) => count)).toEqual([4, undefined]);
  });

  test("a walking spider can have a count, its default left out when written", () => {
    // 1 without one, as fumbling in the dark's
    const walker = { ...badger, enemy: "walking_spider" as const };
    expect(parseObjects('[{"kind": "enemy", "type": "walking_spider", "at": [0, 0, 0], "count": 3}]')[0].count).toBe(3);
    expect(numberSetting(walker, "count")).toBe(1);
    expect(formatObjects([{ ...walker, count: 1 }])).toContain('"at": [1, 2, 0]}');
    expect(formatObjects([{ ...walker, count: 2 }])).toContain('"count": 2}');
  });

  test("a bat roost can have a count, its default left out when written", () => {
    // how many bats its roost sends, 4 without one, as temple ruins'
    const bat = { ...badger, enemy: "bat" as const };
    expect(parseObjects('[{"kind": "enemy", "type": "bat", "at": [0, 0, 0], "count": 6}]')[0].count).toBe(6);
    expect(numberSetting(bat, "count")).toBe(4);
    expect(formatObjects([{ ...bat, count: 4 }])).toContain('"at": [1, 2, 0]}');
    expect(formatObjects([{ ...bat, count: 1 }])).toContain('"count": 1}');
  });

  test("leader bats can have a count, its default left out when written", () => {
    // how many bats each flock has, 5 without one, as sunset vista's
    const leaders = { ...badger, enemy: "leader_bats" as const };
    expect(parseObjects('[{"kind": "enemy", "type": "leader_bats", "at": [0, 0, 0], "count": 2}]')[0].count).toBe(2);
    expect(numberSetting(leaders, "count")).toBe(5);
    expect(formatObjects([{ ...leaders, count: 5 }])).toContain('"at": [1, 2, 0]}');
    expect(formatObjects([{ ...leaders, count: 3 }])).toContain('"count": 3}');
  });

  test("writes a badger's count after the rest, leaving out the default", () => {
    // the default is 2
    expect(formatObjects([{ ...badger, count: 3 }])).toContain('"at": [1, 2, 0], "count": 3}');
    expect(formatObjects([{ ...badger, count: 2 }])).toContain('"at": [1, 2, 0]}');
    const withSpeed = formatObjects([{ ...badger, speed: 2, count: 5 }]);
    expect(withSpeed).toContain('"speed": 2, "count": 5}');
    expect(parseObjects(withSpeed)).toEqual([{ ...badger, speed: 2, count: 5 }]);
  });

  test.each([
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "count": 2}]', "object 1: a crab has no count (badgers, walking spiders, bats and leader bats do)"],
    ['[{"kind": "enemy", "type": "badger", "at": [0, 0, 0], "count": 0}]', "object 1: count should be 1 to 6 (how many badgers come out at once)"],
    ['[{"kind": "enemy", "type": "badger", "at": [0, 0, 0], "count": 7}]', "object 1: count should be 1 to 6"],
    ['[{"kind": "enemy", "type": "badger", "at": [0, 0, 0], "count": 2.5}]', "object 1: count should be 1 to 6"],
    ['[{"kind": "enemy", "type": "bat", "at": [0, 0, 0], "count": 7}]', "object 1: count should be 1 to 6"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});

describe("gunmen's ranges", () => {
  const gunman = () => enemyObject("gunman", { at: [1, 2, 0] });

  test("a gunman can have a range", () => {
    // how near crash comes, in metres, before he starts shooting
    expect(parseObjects('[{"kind": "enemy", "type": "gunman", "at": [0, 0, 0], "range": 24.5}]')[0].range).toBe(24.5);
  });

  test("a default range is left out when written", () => {
    // cortex power's gunmen's: 16 metres
    expect(numberSetting(gunman(), "range")).toBe(16);
    expect(formatObjects([{ ...gunman(), range: 16 }])).toContain('"at": [1, 2, 0]}');
    expect(formatObjects([{ ...gunman(), range: 30 }])).toContain('"range": 30}');
  });

  test.each([
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "range": 20}]', "object 1: a plant has no range (gunmen do)"],
    ['[{"kind": "enemy", "type": "gunman", "at": [0, 0, 0], "range": 1}]', "object 1: range should be 2 to 40 (how near crash comes, in metres, before he shoots)"],
    ['[{"kind": "enemy", "type": "gunman", "at": [0, 0, 0], "range": 41}]', "object 1: range should be 2 to 40"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});

describe("bat roosts' delays", () => {
  const roost = (enemy: "bat" | "leader_bats") => enemyObject(enemy, { at: [1, 2, 0] });

  test("a bat roost or leader bats can have a delay", () => {
    // the seconds between their flocks, in halves of a second or finer
    expect(parseObjects('[{"kind": "enemy", "type": "bat", "at": [0, 0, 0], "delay": 3.5}]')[0].delay).toBe(3.5);
    expect(parseObjects('[{"kind": "enemy", "type": "leader_bats", "at": [0, 0, 0], "delay": 12}]')[0].delay).toBe(12);
  });

  test("a default delay is left out when written", () => {
    // a bat roost's is 10 seconds (temple ruins') and leader bats' 4.5 (sunset vista's)
    expect([numberSetting(roost("bat"), "delay"), numberSetting(roost("leader_bats"), "delay")]).toEqual([10, 4.5]);
    expect(formatObjects([{ ...roost("bat"), delay: 10 }])).toContain('"at": [1, 2, 0]}');
    expect(formatObjects([{ ...roost("leader_bats"), delay: 4.5 }])).toContain('"at": [1, 2, 0]}');
    expect(formatObjects([{ ...roost("bat"), count: 2, delay: 3 }])).toContain('"count": 2, "delay": 3}');
  });

  test.each([
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "delay": 2}]', "object 1: a crab has no delay (bats and leader bats do)"],
    ['[{"kind": "enemy", "type": "bat", "at": [0, 0, 0], "delay": 0.5}]', "object 1: delay should be 1 to 20 (the seconds between its flocks)"],
    ['[{"kind": "enemy", "type": "leader_bats", "at": [0, 0, 0], "delay": 21}]', "object 1: delay should be 1 to 20"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});

describe("obstacles", () => {
  test("reads an obstacle with its type", () => {
    const objects = parseObjects(`[
      {"kind": "obstacle", "type": "lily_pad", "at": [1, 2, 0], "raise": 0.5},
      {"kind": "obstacle", "type": "leaf", "at": [3, 4, 0]}
    ]`);
    expect(objects).toEqual([
      { kind: "obstacle", obstacle: "lily_pad", at: [1, 2, 0], raise: 0.5, stack: 1 },
      { kind: "obstacle", obstacle: "leaf", at: [3, 4, 0], raise: 0, stack: 1 },
    ]);
  });

  test("writes obstacles after the enemies and before the end, and reads them back", () => {
    const text = formatObjects([
      { kind: "end", at: [0, 9, 0], raise: 0, stack: 1 },
      { kind: "obstacle", obstacle: "leaf", at: [1, 2, 0], raise: 0, stack: 1 },
      enemyObject("plant"),
    ]);
    expect(text).toContain('{"kind": "obstacle", "type": "leaf", "at": [1, 2, 0]}');
    expect(parseObjects(text).map((object) => object.kind)).toEqual(["enemy", "obstacle", "end"]);
  });

  test.each([
    ['[{"kind": "obstacle", "at": [0, 0, 0]}]', "object 1: an obstacle needs a type (lily_pad, leaf, wooden_peg, rolling_stone, mossy_slide, rising_spiked_log, falling_spiked_log, fire_pit, dropping_pillar, sliding_pillar)"],
    ['[{"kind": "obstacle", "type": "raft", "at": [0, 0, 0]}]', "object 1: unknown obstacle type raft (it can be lily_pad, leaf, wooden_peg, rolling_stone, mossy_slide, rising_spiked_log, falling_spiked_log, fire_pit, dropping_pillar, sliding_pillar)"],
    ['[{"kind": "obstacle", "type": "leaf", "at": [0, 0, 0], "speed": 2}]', "object 1: a leaf has no speed"],
    ['[{"kind": "obstacle", "type": "leaf", "at": [0, 0, 0], "count": 2}]', "object 1: unknown setting count (an obstacle takes kind, at, raise, type, path, speed, start, reverse, length, angle, rotation, every, offset)"],
    ['[{"kind": "platform", "type": "leaf", "at": [0, 0, 0]}]', "object 1: unknown kind platform"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });

  test("an enemy's unknown setting says an enemy", () => {
    expect(() => parseObjects('[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "stack": 2}]')).toThrow("(an enemy takes");
  });
});

describe("wooden pegs", () => {
  test("a wooden peg is an obstacle, with no path", () => {
    expect(parseObjects('[{"kind": "obstacle", "type": "wooden_peg", "at": [1, 2, 0], "raise": 1}]'))
      .toEqual([{ kind: "obstacle", obstacle: "wooden_peg", at: [1, 2, 0], raise: 1, stack: 1 }]);
    expect(() => parseObjects('[{"kind": "obstacle", "type": "wooden_peg", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]'))
      .toThrow("a wooden_peg has no path");
  });
});

describe("pillars", () => {
  test.each(["dropping_pillar", "sliding_pillar"])("a %s is an obstacle", (type) => {
    expect(parseObjects(`[{"kind": "obstacle", "type": "${type}", "at": [1, 2, 0], "raise": 1}]`))
      .toEqual([{ kind: "obstacle", obstacle: type, at: [1, 2, 0], raise: 1, stack: 1 }]);
  });

  test("a sliding pillar can have a speed, in metres a second, read back as written; 1 without", () => {
    const [pillar] = parseObjects('[{"kind": "obstacle", "type": "sliding_pillar", "at": [1, 2, 0], "speed": 2}]');
    expect(pillar.speed).toBe(2);
    expect(parseObjects(formatObjects([pillar]))).toEqual([pillar]);
    expect(numberSetting(obstacleObject("sliding_pillar"), "speed")).toBe(1);
  });

  test("a sliding pillar can have a path, read back as written; a dropping one can't", () => {
    const [pillar] = parseObjects('[{"kind": "obstacle", "type": "sliding_pillar", "at": [1, 2, 0], "path": [[0, 0, 0], [0, 3, 0], [2, 3, 0]]}]');
    expect(pillar.path).toEqual([[0, 0, 0], [0, 3, 0], [2, 3, 0]]);
    expect(parseObjects(formatObjects([pillar]))).toEqual([pillar]);
    expect(() => parseObjects('[{"kind": "obstacle", "type": "dropping_pillar", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]'))
      .toThrow("a dropping_pillar has no path (leaves and sliding pillars do)");
  });
});

describe("fire pits", () => {
  test("a fire pit is an obstacle, with no path", () => {
    expect(parseObjects('[{"kind": "obstacle", "type": "fire_pit", "at": [1, 2, 0]}]'))
      .toEqual([{ kind: "obstacle", obstacle: "fire_pit", at: [1, 2, 0], raise: 0, stack: 1 }]);
    expect(() => parseObjects('[{"kind": "obstacle", "type": "fire_pit", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]'))
      .toThrow("a fire_pit has no path");
  });

  test("a fire pit's flames come every so many seconds, put off by an offset, as a spiked log's pushes", () => {
    const [pit] = parseObjects('[{"kind": "obstacle", "type": "fire_pit", "at": [1, 2, 0], "every": 5, "offset": 2.5}]');
    expect(pit).toEqual({ kind: "obstacle", obstacle: "fire_pit", at: [1, 2, 0], raise: 0, stack: 1, every: 5, offset: 2.5 });
    expect(parseObjects(formatObjects([pit]))).toEqual([pit]);
  });

  test("without them, its flames come every 4 seconds (the great gate's 120 frames) with no offset", () => {
    const pit = obstacleObject("fire_pit");
    expect([numberSetting(pit, "every"), numberSetting(pit, "offset")]).toEqual([4, 0]);
  });
});

describe("spiked logs", () => {
  test.each(["rising_spiked_log", "falling_spiked_log"])("a %s is an obstacle, with no path", (type) => {
    expect(parseObjects(`[{"kind": "obstacle", "type": "${type}", "at": [1, 2, 0], "raise": 1}]`))
      .toEqual([{ kind: "obstacle", obstacle: type, at: [1, 2, 0], raise: 1, stack: 1 }]);
    expect(() => parseObjects(`[{"kind": "obstacle", "type": "${type}", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]`))
      .toThrow(`a ${type} has no path`);
  });

  test("a spiked log can push every so many seconds, its pushes put off by an offset in seconds, written and read back", () => {
    const [log] = parseObjects('[{"kind": "obstacle", "type": "rising_spiked_log", "at": [1, 2, 0], "every": 4.5, "offset": 1.5}]');
    expect(log).toEqual({ kind: "obstacle", obstacle: "rising_spiked_log", at: [1, 2, 0], raise: 0, stack: 1, every: 4.5, offset: 1.5 });
    expect(parseObjects(formatObjects([log]))).toEqual([log]);
  });

  test("without them, it pushes every 6 seconds (the great gate's 180 frames) with no offset, left out when written", () => {
    const log = obstacleObject("falling_spiked_log");
    expect([numberSetting(log, "every"), numberSetting(log, "offset")]).toEqual([6, 0]);
    expect(formatObjects([{ ...log, every: 6, offset: 0 }])).toContain('"at": [0, 0, 0]}');
  });

  test.each([
    ['[{"kind": "obstacle", "type": "rising_spiked_log", "at": [0, 0, 0], "every": 2}]', "object 1: every should be 3 to 20 (the seconds between its pushes or flames)"],
    ['[{"kind": "obstacle", "type": "falling_spiked_log", "at": [0, 0, 0], "every": 21}]', "object 1: every should be 3 to 20"],
    ['[{"kind": "obstacle", "type": "leaf", "at": [0, 0, 0], "every": 5}]', "object 1: a leaf has no every (spiked logs and fire pits do)"],
    ['[{"kind": "obstacle", "type": "rising_spiked_log", "at": [0, 0, 0], "offset": 21}]', "object 1: offset should be 0 to 20 (the seconds its pushes or flames are put off by)"],
    ['[{"kind": "obstacle", "type": "rising_spiked_log", "at": [0, 0, 0], "start": 0.5}]', "object 1: a rising_spiked_log has no start (rolling stones do)"],
    ['[{"kind": "obstacle", "type": "rising_spiked_log", "at": [0, 0, 0], "reverse": true}]', "object 1: a rising_spiked_log has no reverse"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});

describe("obstacle paths", () => {
  test("a leaf can have a path, written after its type and read back", () => {
    const path = [[0, 0, 0], [2, -3, 0.5]];
    const [leaf] = parseObjects(JSON.stringify([{ kind: "obstacle", type: "leaf", at: [1, 2, 0], path }]));
    expect(leaf.path).toEqual(path);
    expect(hasPath(leaf)).toBe(true);
    const text = formatObjects([leaf]);
    expect(text).toContain('"type": "leaf", "at": [1, 2, 0], "path": [[0, 0, 0], [2, -3, 0.5]]}');
    expect(parseObjects(text)).toEqual([leaf]);
  });

  test("a leaf without a path has one all the same (its drift), and a lily pad none", () => {
    const [leaf, pad] = parseObjects('[{"kind": "obstacle", "type": "leaf", "at": [0, 0, 0]}, {"kind": "obstacle", "type": "lily_pad", "at": [0, 0, 0]}]');
    expect(hasPath(leaf)).toBe(true);
    expect(hasPath(pad)).toBe(false);
    expect(hasNodes(pad)).toBe(false);
  });

  test.each([
    ['[{"kind": "obstacle", "type": "lily_pad", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: a lily_pad has no path (leaves and sliding pillars do)"],
    ['[{"kind": "obstacle", "type": "leaf", "at": [0, 0, 0], "path": [[0, 0, 0]]}]', "object 1: a path should be 2 to 20 nodes"],
    ['[{"kind": "obstacle", "type": "leaf", "at": [0, 0, 0], "path": [[0, 0], [1, 0, 0]]}]', "object 1: a path's nodes should each be [x, y, z]"],
    ['[{"kind": "obstacle", "type": "leaf", "at": [0, 0, 0], "speed": 2}]', "object 1: a leaf has no speed"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});

describe("mossy slides", () => {
  test("a mossy slide can have a length, angle and rotation, written after the rest and read back", () => {
    const [slide] = parseObjects('[{"kind": "obstacle", "type": "mossy_slide", "at": [1, 2, 0], "raise": 1, "length": 9.5, "angle": 20, "rotation": 135}]');
    expect(slide).toEqual({ kind: "obstacle", obstacle: "mossy_slide", at: [1, 2, 0], raise: 1, stack: 1, length: 9.5, angle: 20, rotation: 135 });
    const text = formatObjects([slide]);
    expect(text).toContain('"raise": 1, "length": 9.5, "angle": 20, "rotation": 135}');
    expect(parseObjects(text)).toEqual([slide]);
  });

  test("its length and angle are the great gate's short slide's without them, left out when written", () => {
    // 4 m (1600 units at scale 400) down a slope of 14 degrees
    const slide = obstacleObject("mossy_slide");
    expect([numberSetting(slide, "length"), numberSetting(slide, "angle"), numberSetting(slide, "rotation")]).toEqual([4, 14, 0]);
    expect(formatObjects([{ ...slide, length: 4, angle: 14, rotation: 0 }])).toContain('"at": [0, 0, 0]}');
  });

  test.each([
    ['[{"kind": "obstacle", "type": "leaf", "at": [0, 0, 0], "length": 5}]', "object 1: a leaf has no length (mossy slides do)"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "angle": 5}]', "object 1: unknown setting angle"],
    ['[{"kind": "obstacle", "type": "mossy_slide", "at": [0, 0, 0], "length": 1}]', "object 1: length should be 2 to 20 (how long it is, in metres)"],
    ['[{"kind": "obstacle", "type": "mossy_slide", "at": [0, 0, 0], "angle": 40}]', "object 1: angle should be 5 to 30 (how steeply it slopes, in degrees)"],
    ['[{"kind": "obstacle", "type": "mossy_slide", "at": [0, 0, 0], "long": true}]', "object 1: unknown setting long"],
    ['[{"kind": "obstacle", "type": "mossy_slide", "at": [0, 0, 0], "rotation": 360}]', "object 1: rotation should be 0 to 359 (which way it slides down, in degrees anticlockwise from across the map)"],
    ['[{"kind": "obstacle", "type": "mossy_slide", "at": [0, 0, 0], "reverse": true}]', "object 1: a mossy_slide has no reverse"],
    ['[{"kind": "obstacle", "type": "leaf", "at": [0, 0, 0], "rotation": 90}]', "object 1: a leaf has no rotation (mossy slides do)"],
    ['[{"kind": "obstacle", "type": "mossy_slide", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: a mossy_slide has no path"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});
