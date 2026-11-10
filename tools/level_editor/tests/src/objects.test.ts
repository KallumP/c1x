import { describe, expect, test } from "vitest";
import { numberSetting, boxTypeName, formatObjects, hasNodes, hasPath, parseObjects } from "../../src/objects";
import { enemyObject } from "../helpers";

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
      {"kind": "enemy", "type": "rolling_stone", "at": [-4, 20, 0.5]},
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
      {"kind": "enemy", "type": "gunman", "at": [14, 150, 0]},
      {"kind": "enemy", "type": "lab_assistant", "at": [10, 110, 0]},
      {"kind": "enemy", "type": "snake", "at": [11, 120, 0]}
    ]`);
    expect(objects).toEqual([
      { kind: "enemy", enemy: "plant", at: [1, 10, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "rolling_stone", at: [-4, 20, 0.5], raise: 0, stack: 1 },
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
      { kind: "enemy", enemy: "gunman", at: [14, 150, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "lab_assistant", at: [10, 110, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "snake", at: [11, 120, 0], raise: 0, stack: 1 },
    ]);
  });

  test.each([
    ['[{"kind": "enemy", "at": [0, 0, 0]}]', "object 1: an enemy needs a type (plant, blue_river_plant, green_river_plant, spider, snake, gunman, fish, lab_assistant, crab, turtle, native, monkey, warthog, lizard, red_lizard, robot_dog, barrel_roller, badger, walking_spider, bat, leader_bats, rolling_stone)"],
    ['[{"kind": "enemy", "type": "dragon", "at": [0, 0, 0]}]', "object 1: unknown enemy type dragon"],
    ['[{"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "path": [[0, 1, 0]]}]', "object 1: a rolling_stone has no path (crabs, turtles, natives, badgers, warthogs, walking spiders, monkeys, lizards, red lizards, robot dogs and barrel rollers do)"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });

  test("writes enemies after the boxes and before the end", () => {
    const text = formatObjects([
      { kind: "end", at: [0, 9, 0], raise: 0, stack: 1 },
      enemyObject("rolling_stone"),
      { kind: "box", box: "basic", at: [1, 0, 0], raise: 0, stack: 1 },
    ]);
    const kinds = parseObjects(text).map((object) => object.kind);
    expect(kinds).toEqual(["box", "enemy", "end"]);
  });

  test("reads back what it writes", () => {
    const objects = parseObjects(`[{"kind": "enemy", "type": "rolling_stone", "at": [8, 35.5, 0], "raise": 0.5}]`);
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
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: a plant has no path (crabs, turtles, natives, badgers, warthogs, walking spiders, monkeys, lizards, red lizards, robot dogs and barrel rollers do)"],
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
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "speed": 2}]', "object 1: a plant has no speed (crabs, turtles, natives, badgers, warthogs, walking spiders, monkeys, lizards, red lizards, robot dogs and barrel rollers do)"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "speed": 4}]', "object 1: speed should be 0.25 to 3 (times the game's own pace)"],
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
      {"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "reverse": true},
      {"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "reverse": false},
      {"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0]}
    ]`);
    expect(objects.map(({ reverse }) => reverse)).toEqual([true, undefined, undefined]);
  });

  test("a fish can be reversed", () => {
    // to leap the other way across the map
    const [fish] = parseObjects('[{"kind": "enemy", "type": "fish", "at": [0, 0, 0], "reverse": true}]');
    expect(fish.reverse).toBe(true);
  });

  test("writes it when it's reversed, and reads it back", () => {
    const stone = enemyObject("rolling_stone", { at: [1, 2, 0] });
    const text = formatObjects([{ ...stone, reverse: true }]);
    expect(text).toContain('"at": [1, 2, 0], "reverse": true}');
    expect(parseObjects(text)).toEqual([{ ...stone, reverse: true }]);
    expect(formatObjects([stone])).toContain('"at": [1, 2, 0]}');
  });

  test.each([
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "reverse": true}]', "object 1: a crab has no reverse (rolling stones and fish do; reverse a crab's path instead)"],
    ['[{"kind": "enemy", "type": "lab_assistant", "at": [0, 0, 0], "reverse": true}]', "object 1: a lab_assistant has no reverse"],
    ['[{"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "reverse": "yes"}]', "object 1: reverse should be true or false"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});

describe("a rolling stone's start", () => {
  test("a rolling stone can start partway along its track", () => {
    // 0 its first end, 1 its far end
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "start": 0.5},
      {"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "start": 1, "reverse": true},
      {"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0]}
    ]`);
    expect(objects.map(({ start, reverse }) => [start, reverse])).toEqual([[0.5, undefined], [1, true], [undefined, undefined]]);
  });

  test("writes it when it isn't 0, before reverse, and reads it back", () => {
    const stone = enemyObject("rolling_stone", { at: [1, 2, 0] });
    const text = formatObjects([{ ...stone, start: 0.25, reverse: true }]);
    expect(text).toContain('"at": [1, 2, 0], "start": 0.25, "reverse": true}');
    expect(parseObjects(text)).toEqual([{ ...stone, start: 0.25, reverse: true }]);
    expect(formatObjects([{ ...stone, start: 0 }])).toContain('"at": [1, 2, 0]}');
  });

  test.each([
    ['[{"kind": "enemy", "type": "turtle", "at": [0, 0, 0], "start": 0.5}]', "object 1: a turtle has no start (rolling stones do)"],
    ['[{"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "start": 1.5}]', "object 1: start should be 0 to 1 (how far along its track it starts)"],
    ['[{"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "start": "middle"}]', "object 1: start should be 0 to 1"],
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
