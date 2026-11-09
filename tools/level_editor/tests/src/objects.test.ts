import { describe, expect, test } from "vitest";
import { BADGER_COUNT, BADGER_COUNT_MAX, BADGER_COUNT_MIN, BOX_TYPES, numberSetting, boxTypeName, ENEMY_TYPES, formatObjects, hasNodes, hasPath, parseObjects, PATH_NODES_MAX, SPEED_MAX, SPEED_MIN, type Vec3 } from "../../src/objects";

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

  test("knows every box type, by name", () => {
    expect(BOX_TYPES).toEqual({
      basic: 2, arrow: 3, checkpoint: 4, iron: 5, slatted: 6,
      switch: 7, life: 8, aku_aku: 9, question: 10, outline: 13,
      tnt: 0, enemy_tnt: 11, iron_arrow: 15, iron_outline: 19,
    });
  });

  test("lists them in the palette's order, by what they do: plain, bonus, tnt, the switch and its outlines, then iron", () => {
    expect(Object.keys(BOX_TYPES)).toEqual([
      "basic", "slatted", "arrow",
      "question", "life", "aku_aku", "checkpoint",
      "tnt", "enemy_tnt",
      "switch", "outline", "iron_outline",
      "iron", "iron_arrow",
    ]);
  });

  test("reads the boxes beyond n. sanity beach's, by type or subtype", () => {
    const objects = parseObjects(`[
      {"kind": "box", "type": "tnt", "at": [0, 0, 0]},
      {"kind": "box", "type": "iron_arrow", "at": [1, 0, 0]},
      {"kind": "box", "subtype": 19, "at": [2, 0, 0]},
      {"kind": "box", "subtype": 11, "at": [3, 0, 0]}
    ]`);
    expect(objects.map((object) => object.box)).toEqual(["tnt", "iron_arrow", 19, 11]);
    expect(boxTypeName(19)).toBe("iron_outline");
    expect(boxTypeName(0)).toBe("tnt");
  });

  test.each([
    ["{", "isn't valid JSON"],
    ["{}", "should be a list of objects"],
    ["[1]", "object 1 should be"],
    ['[{"at": [0, 0, 0]}]', "object 1 has no kind"],
    ['[{"kind": "tnt", "at": [0, 0, 0]}]', "object 1: unknown kind tnt"],
    ['[{"kind": "spawn", "at": [0, 0, 0], "stack": 2}]', "object 1: unknown setting stack"],
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

  test("writes the spawn first and the end last, keeping the boxes' order (a switch's outline boxes go in order)", () => {
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
  test("knows the enemies custom levels can have, by name", () => {
    expect(ENEMY_TYPES).toEqual(["plant", "blue_river_plant", "green_river_plant", "spider", "fish", "lab_assistant", "crab", "turtle", "native", "monkey", "warthog", "lizard", "red_lizard", "badger", "walking_spider", "bat", "leader_bats", "rolling_stone"]); // by what they do, as the palette lists them
  });

  test("reads an enemy by its type and spot (a rolling stone's path comes with its track)", () => {
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
      {"kind": "enemy", "type": "lab_assistant", "at": [10, 110, 0]}
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
      { kind: "enemy", enemy: "lab_assistant", at: [10, 110, 0], raise: 0, stack: 1 },
    ]);
  });

  test.each([
    ['[{"kind": "enemy", "at": [0, 0, 0]}]', "object 1: an enemy needs a type (plant, blue_river_plant, green_river_plant, spider, fish, lab_assistant, crab, turtle, native, monkey, warthog, lizard, red_lizard, badger, walking_spider, bat, leader_bats, rolling_stone)"],
    ['[{"kind": "enemy", "type": "dragon", "at": [0, 0, 0]}]', "object 1: unknown enemy type dragon"],
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "stack": 2}]', "object 1: unknown setting stack"],
    ['[{"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "path": [[0, 1, 0]]}]', "object 1: a rolling_stone has no path (crabs, turtles, natives, badgers, warthogs, walking spiders, monkeys, lizards and red lizards do)"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });

  test("writes an enemy's type, after the boxes and before the end", () => {
    const text = formatObjects([
      { kind: "end", at: [0, 9, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "rolling_stone", at: [1, 2.00004, 0], raise: 0, stack: 1 },
      { kind: "box", box: "basic", at: [1, 0, 0], raise: 0, stack: 1 },
    ]);
    expect(text).toBe([
      "[",
      '  {"kind": "box", "type": "basic", "at": [1, 0, 0]},',
      "",
      '  {"kind": "enemy", "type": "rolling_stone", "at": [1, 2, 0]},',
      "",
      '  {"kind": "end", "at": [0, 9, 0]}',
      "]",
      "",
    ].join("\n"));
  });

  test("reads back what it writes", () => {
    const objects = parseObjects(`[{"kind": "enemy", "type": "rolling_stone", "at": [8, 35.5, 0], "raise": 0.5}]`);
    expect(parseObjects(formatObjects(objects))).toEqual(objects);
  });
});

describe("enemy paths", () => {
  test("a crab, turtle, native or badger can have a path: its nodes, each from where the enemy stands, in metres", () => {
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "crab", "at": [2, 30, 0], "path": [[-2, 0, 0], [0, 1, 0], [2, 0, 0]]},
      {"kind": "enemy", "type": "turtle", "at": [3, 40, 0], "path": [[0, -2.5, 0], [0, 2.5, 0.5]]},
      {"kind": "enemy", "type": "native", "at": [4, 45, 0], "path": [[-1, 0, 0], [1, 0, 0]]},
      {"kind": "enemy", "type": "badger", "at": [5, 48, 0], "path": [[0, 3, 0], [0, -3, 0]]},
      {"kind": "enemy", "type": "turtle", "at": [3, 50, 0]}
    ]`);
    expect(objects.map(({ path }) => path)).toEqual([[[-2, 0, 0], [0, 1, 0], [2, 0, 0]], [[0, -2.5, 0], [0, 2.5, 0.5]], [[-1, 0, 0], [1, 0, 0]], [[0, 3, 0], [0, -3, 0]], undefined]);
  });

  test("leader bats can have a path of their second leader: where it hovers, from the first (at, raised), in metres", () => {
    const [leaders] = parseObjects('[{"kind": "enemy", "type": "leader_bats", "at": [0, 0, 0], "path": [[-14, 2, 0]]}]');
    expect(leaders.path).toEqual([[-14, 2, 0]]);
  });

  test("a bat roost can have a path of its swoop's end: where its bats' swoop ends, from the roost (at, raised), in metres", () => {
    const [roost] = parseObjects('[{"kind": "enemy", "type": "bat", "at": [0, 0, 0], "path": [[10, -20, 0]]}]');
    expect(roost.path).toEqual([[10, -20, 0]]);
  });

  test("leader bats' node is their second leader, and a bat roost's its swoop's end, which they have, though they don't walk a path", () => {
    const enemy = (type: "leader_bats" | "crab" | "bat") => ({ kind: "enemy" as const, enemy: type, at: [0, 0, 0] as Vec3, raise: 0, stack: 1 });
    expect([hasNodes(enemy("leader_bats")), hasNodes(enemy("crab")), hasNodes(enemy("bat")), hasNodes({ ...enemy("crab"), enemy: "fish" })]).toEqual([true, true, true, false]);
    expect([hasPath(enemy("leader_bats")), hasPath(enemy("crab"))]).toEqual([false, true]);
  });

  test("writes a path after the rest, to the millimetre, and reads it back", () => {
    const crab = { kind: "enemy" as const, enemy: "crab" as const, at: [1, 2, 0] as Vec3, raise: 0, stack: 1, path: [[-2.00004, 0, 0], [2, 0.5, 0]] as Vec3[] };
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
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: a plant has no path (crabs, turtles, natives, badgers, warthogs, walking spiders, monkeys, lizards and red lizards do)"],
    ['[{"kind": "box", "type": "basic", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: unknown setting path"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "path": [[0, 0, 0]]}]', `object 1: a path should be 2 to ${PATH_NODES_MAX} nodes`],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0]]}]', "object 1: a path's nodes should each be [x, y, z] in metres"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "path": "across"}]', "object 1: a path should be 2 to"],
    ['[{"kind": "enemy", "type": "leader_bats", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: leader bats' path is their second leader, [[x, y, z]] in metres from the first"],
    ['[{"kind": "enemy", "type": "leader_bats", "at": [0, 0, 0], "path": []}]', "object 1: leader bats' path is their second leader"],
    ['[{"kind": "enemy", "type": "bat", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: a bat roost's path is its swoop's end, [[x, y, z]] in metres from the roost"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });

  test(`a path can have up to ${20} nodes`, () => {
    expect(PATH_NODES_MAX).toBe(20);
    const nodes = Array.from({ length: PATH_NODES_MAX + 1 }, (_, index) => [index, 0, 0]);
    expect(() => parseObjects(JSON.stringify([{ kind: "enemy", type: "turtle", at: [0, 0, 0], path: nodes }]))).toThrow("2 to 20 nodes");
  });
});

describe("enemy speeds", () => {
  test("a crab, turtle, native or badger can have a speed: how many times the game's own pace it walks at", () => {
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "crab", "at": [0, 0, 0], "speed": 2},
      {"kind": "enemy", "type": "turtle", "at": [0, 0, 0], "speed": 0.5},
      {"kind": "enemy", "type": "native", "at": [0, 0, 0], "speed": 1.5},
      {"kind": "enemy", "type": "badger", "at": [0, 0, 0], "speed": 2.5},
      {"kind": "enemy", "type": "turtle", "at": [0, 0, 0]}
    ]`);
    expect(objects.map(({ speed }) => speed)).toEqual([2, 0.5, 1.5, 2.5, undefined]);
  });

  test("writes a speed after the rest, and leaves out the game's own (1)", () => {
    const turtle = { kind: "enemy" as const, enemy: "turtle" as const, at: [1, 2, 0] as Vec3, raise: 0, stack: 1 };
    expect(formatObjects([{ ...turtle, speed: 1.5 }])).toContain('"at": [1, 2, 0], "speed": 1.5}');
    expect(formatObjects([{ ...turtle, speed: 1 }])).toContain('"at": [1, 2, 0]}');
    const withPath = formatObjects([{ ...turtle, path: [[0, 0, 0], [1, 0, 0]], speed: 2 }]);
    expect(withPath).toContain('"path": [[0, 0, 0], [1, 0, 0]], "speed": 2}');
    expect(parseObjects(withPath)).toEqual([{ ...turtle, path: [[0, 0, 0], [1, 0, 0]], speed: 2 }]);
  });

  test(`a speed is ${0.25} to ${3}`, () => {
    expect([SPEED_MIN, SPEED_MAX]).toEqual([0.25, 3]);
  });

  test.each([
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "speed": 2}]', "object 1: a plant has no speed (crabs, turtles, natives, badgers, warthogs, walking spiders, monkeys, lizards and red lizards do)"],
    ['[{"kind": "box", "type": "basic", "at": [0, 0, 0], "speed": 2}]', "object 1: unknown setting speed"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "speed": 4}]', "object 1: speed should be 0.25 to 3 (times the game's own pace)"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "speed": 0.1}]', "object 1: speed should be 0.25 to 3"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "speed": "fast"}]', "object 1: speed should be 0.25 to 3"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});

describe("a rolling stone's direction", () => {
  test("a rolling stone can be reversed, to start at the other end of its track", () => {
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "reverse": true},
      {"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "reverse": false},
      {"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0]}
    ]`);
    expect(objects.map(({ reverse }) => reverse)).toEqual([true, undefined, undefined]);
  });

  test("a lab assistant can throw the other way across the map, reversed", () => {
    const [assistant] = parseObjects('[{"kind": "enemy", "type": "lab_assistant", "at": [0, 0, 0], "reverse": true}]');
    expect(assistant.reverse).toBe(true);
  });

  test("a fish can leap the other way across the map, reversed", () => {
    const [fish] = parseObjects('[{"kind": "enemy", "type": "fish", "at": [0, 0, 0], "reverse": true}]');
    expect(fish.reverse).toBe(true);
  });

  test("writes it when it's reversed, and reads it back", () => {
    const stone = { kind: "enemy" as const, enemy: "rolling_stone" as const, at: [1, 2, 0] as Vec3, raise: 0, stack: 1 };
    const text = formatObjects([{ ...stone, reverse: true }]);
    expect(text).toContain('"at": [1, 2, 0], "reverse": true}');
    expect(parseObjects(text)).toEqual([{ ...stone, reverse: true }]);
    expect(formatObjects([stone])).toContain('"at": [1, 2, 0]}');
  });

  test.each([
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "reverse": true}]', "object 1: a crab has no reverse (rolling stones, fish and lab assistants do; reverse a crab's path instead)"],
    ['[{"kind": "box", "type": "basic", "at": [0, 0, 0], "reverse": true}]', "object 1: unknown setting reverse"],
    ['[{"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "reverse": "yes"}]', "object 1: reverse should be true or false"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});

describe("a rolling stone's start", () => {
  test("a rolling stone can start partway along its track: 0 its first end, 1 its far end", () => {
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "start": 0.5},
      {"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "start": 1, "reverse": true},
      {"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0]}
    ]`);
    expect(objects.map(({ start, reverse }) => [start, reverse])).toEqual([[0.5, undefined], [1, true], [undefined, undefined]]);
  });

  test("writes it when it isn't 0, before reverse, and reads it back", () => {
    const stone = { kind: "enemy" as const, enemy: "rolling_stone" as const, at: [1, 2, 0] as Vec3, raise: 0, stack: 1 };
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
  const badger = { kind: "enemy" as const, enemy: "badger" as const, at: [1, 2, 0] as Vec3, raise: 0, stack: 1 };

  test("a badger can have a count: how many come out in each wave", () => {
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "badger", "at": [0, 0, 0], "count": 4},
      {"kind": "enemy", "type": "badger", "at": [0, 0, 0]}
    ]`);
    expect(objects.map(({ count }) => count)).toEqual([4, undefined]);
  });

  test(`a count is ${1} to ${6}, ${2} without one (as jungle rollers' badgers)`, () => {
    expect([BADGER_COUNT_MIN, BADGER_COUNT_MAX, BADGER_COUNT]).toEqual([1, 6, 2]);
  });

  test("a walking spider can have a count too, 1 without one (as fumbling in the dark's), which is left out when written", () => {
    const walker = { ...badger, enemy: "walking_spider" as const };
    expect(parseObjects('[{"kind": "enemy", "type": "walking_spider", "at": [0, 0, 0], "count": 3}]')[0].count).toBe(3);
    expect(numberSetting(walker, "count")).toBe(1);
    expect(formatObjects([{ ...walker, count: 1 }])).toContain('"at": [1, 2, 0]}');
    expect(formatObjects([{ ...walker, count: 2 }])).toContain('"count": 2}');
  });

  test("a bat can have a count too: how many bats its roost sends, 4 without one (as temple ruins'), which is left out when written", () => {
    const bat = { ...badger, enemy: "bat" as const };
    expect(parseObjects('[{"kind": "enemy", "type": "bat", "at": [0, 0, 0], "count": 6}]')[0].count).toBe(6);
    expect(numberSetting(bat, "count")).toBe(4);
    expect(formatObjects([{ ...bat, count: 4 }])).toContain('"at": [1, 2, 0]}');
    expect(formatObjects([{ ...bat, count: 1 }])).toContain('"count": 1}');
  });

  test("leader bats can have a count too: how many bats each flock has, 5 without one (as sunset vista's), which is left out when written", () => {
    const leaders = { ...badger, enemy: "leader_bats" as const };
    expect(parseObjects('[{"kind": "enemy", "type": "leader_bats", "at": [0, 0, 0], "count": 2}]')[0].count).toBe(2);
    expect(numberSetting(leaders, "count")).toBe(5);
    expect(formatObjects([{ ...leaders, count: 5 }])).toContain('"at": [1, 2, 0]}');
    expect(formatObjects([{ ...leaders, count: 3 }])).toContain('"count": 3}');
  });

  test("writes a count after the rest, and leaves out the default (2)", () => {
    expect(formatObjects([{ ...badger, count: 3 }])).toContain('"at": [1, 2, 0], "count": 3}');
    expect(formatObjects([{ ...badger, count: 2 }])).toContain('"at": [1, 2, 0]}');
    const withSpeed = formatObjects([{ ...badger, speed: 2, count: 5 }]);
    expect(withSpeed).toContain('"speed": 2, "count": 5}');
    expect(parseObjects(withSpeed)).toEqual([{ ...badger, speed: 2, count: 5 }]);
  });

  test.each([
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "count": 2}]', "object 1: a crab has no count (badgers, walking spiders, bats and leader bats do)"],
    ['[{"kind": "box", "type": "basic", "at": [0, 0, 0], "count": 2}]', "object 1: unknown setting count"],
    ['[{"kind": "enemy", "type": "badger", "at": [0, 0, 0], "count": 0}]', "object 1: count should be 1 to 6 (how many badgers come out at once)"],
    ['[{"kind": "enemy", "type": "badger", "at": [0, 0, 0], "count": 7}]', "object 1: count should be 1 to 6"],
    ['[{"kind": "enemy", "type": "badger", "at": [0, 0, 0], "count": 2.5}]', "object 1: count should be 1 to 6"],
    ['[{"kind": "enemy", "type": "bat", "at": [0, 0, 0], "count": 7}]', "object 1: count should be 1 to 6"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });
});

describe("bat roosts' delays", () => {
  const roost = (enemy: "bat" | "leader_bats") => ({ kind: "enemy" as const, enemy, at: [1, 2, 0] as Vec3, raise: 0, stack: 1 });

  test("a bat roost or leader bats can have a delay: the seconds between their flocks, in halves of a second or finer", () => {
    expect(parseObjects('[{"kind": "enemy", "type": "bat", "at": [0, 0, 0], "delay": 3.5}]')[0].delay).toBe(3.5);
    expect(parseObjects('[{"kind": "enemy", "type": "leader_bats", "at": [0, 0, 0], "delay": 12}]')[0].delay).toBe(12);
  });

  test("without one, a bat roost's is 10 seconds (temple ruins') and leader bats' 4.5 (sunset vista's), which are left out when written", () => {
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
