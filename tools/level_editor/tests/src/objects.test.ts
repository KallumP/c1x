import { describe, expect, test } from "vitest";
import { BOX_TYPES, boxTypeName, ENEMY_TYPES, formatObjects, parseObjects, PATH_NODES_MAX, SPEED_MAX, SPEED_MIN, type Vec3 } from "../../src/objects";

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
    expect(ENEMY_TYPES).toEqual(["plant", "rolling_stone", "crab", "turtle", "native", "badger"]);
  });

  test("reads an enemy by its type and spot (a rolling stone's path comes with its track)", () => {
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "plant", "at": [1, 10, 0]},
      {"kind": "enemy", "type": "rolling_stone", "at": [-4, 20, 0.5]},
      {"kind": "enemy", "type": "crab", "at": [2, 30, 0]},
      {"kind": "enemy", "type": "turtle", "at": [3, 40, 0]},
      {"kind": "enemy", "type": "native", "at": [4, 50, 0]},
      {"kind": "enemy", "type": "badger", "at": [5, 60, 0]}
    ]`);
    expect(objects).toEqual([
      { kind: "enemy", enemy: "plant", at: [1, 10, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "rolling_stone", at: [-4, 20, 0.5], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "crab", at: [2, 30, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "turtle", at: [3, 40, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "native", at: [4, 50, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "badger", at: [5, 60, 0], raise: 0, stack: 1 },
    ]);
  });

  test.each([
    ['[{"kind": "enemy", "at": [0, 0, 0]}]', "object 1: an enemy needs a type (plant, rolling_stone, crab, turtle, native, badger)"],
    ['[{"kind": "enemy", "type": "dragon", "at": [0, 0, 0]}]', "object 1: unknown enemy type dragon"],
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "stack": 2}]', "object 1: unknown setting stack"],
    ['[{"kind": "enemy", "type": "rolling_stone", "at": [0, 0, 0], "path": [[0, 1, 0]]}]', "object 1: a rolling_stone has no path (crabs, turtles and natives do)"],
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
  test("a crab, turtle or native can have a path: its nodes, each from where the enemy stands, in metres", () => {
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "crab", "at": [2, 30, 0], "path": [[-2, 0, 0], [0, 1, 0], [2, 0, 0]]},
      {"kind": "enemy", "type": "turtle", "at": [3, 40, 0], "path": [[0, -2.5, 0], [0, 2.5, 0.5]]},
      {"kind": "enemy", "type": "native", "at": [4, 45, 0], "path": [[-1, 0, 0], [1, 0, 0]]},
      {"kind": "enemy", "type": "turtle", "at": [3, 50, 0]}
    ]`);
    expect(objects.map(({ path }) => path)).toEqual([[[-2, 0, 0], [0, 1, 0], [2, 0, 0]], [[0, -2.5, 0], [0, 2.5, 0.5]], [[-1, 0, 0], [1, 0, 0]], undefined]);
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
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: a plant has no path (crabs, turtles and natives do)"],
    ['[{"kind": "box", "type": "basic", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0, 0]]}]', "object 1: unknown setting path"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "path": [[0, 0, 0]]}]', `object 1: a path should be 2 to ${PATH_NODES_MAX} nodes`],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "path": [[0, 0, 0], [1, 0]]}]', "object 1: a path's nodes should each be [x, y, z] in metres"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "path": "across"}]', "object 1: a path should be 2 to"],
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
  test("a crab, turtle or native can have a speed: how many times the game's own pace it walks at", () => {
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "crab", "at": [0, 0, 0], "speed": 2},
      {"kind": "enemy", "type": "turtle", "at": [0, 0, 0], "speed": 0.5},
      {"kind": "enemy", "type": "native", "at": [0, 0, 0], "speed": 1.5},
      {"kind": "enemy", "type": "turtle", "at": [0, 0, 0]}
    ]`);
    expect(objects.map(({ speed }) => speed)).toEqual([2, 0.5, 1.5, undefined]);
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
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "speed": 2}]', "object 1: a plant has no speed (crabs, turtles and natives do)"],
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

  test("writes it when it's reversed, and reads it back", () => {
    const stone = { kind: "enemy" as const, enemy: "rolling_stone" as const, at: [1, 2, 0] as Vec3, raise: 0, stack: 1 };
    const text = formatObjects([{ ...stone, reverse: true }]);
    expect(text).toContain('"at": [1, 2, 0], "reverse": true}');
    expect(parseObjects(text)).toEqual([{ ...stone, reverse: true }]);
    expect(formatObjects([stone])).toContain('"at": [1, 2, 0]}');
  });

  test.each([
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0], "reverse": true}]', "object 1: a crab has no reverse (rolling stones do; reverse a crab's path instead)"],
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
