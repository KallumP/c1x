import { describe, expect, test } from "vitest";
import { BOX_TYPES, boxTypeName, ENEMY_TYPES, formatObjects, parseObjects } from "../../src/objects";

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
    expect(ENEMY_TYPES).toEqual(["plant", "rolling_stone"]);
  });

  test("reads an enemy, with or without a path to move along", () => {
    const objects = parseObjects(`[
      {"kind": "enemy", "type": "plant", "at": [1, 10, 0]},
      {"kind": "enemy", "type": "rolling_stone", "at": [-4, 20, 0.5], "path": [[0, 20, 0.5], [4, 20.5, 0.5]]}
    ]`);
    expect(objects).toEqual([
      { kind: "enemy", enemy: "plant", at: [1, 10, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "rolling_stone", at: [-4, 20, 0.5], raise: 0, stack: 1, path: [[0, 20, 0.5], [4, 20.5, 0.5]] },
    ]);
  });

  test.each([
    ['[{"kind": "enemy", "at": [0, 0, 0]}]', "object 1: an enemy needs a type (plant, rolling_stone)"],
    ['[{"kind": "enemy", "type": "crab", "at": [0, 0, 0]}]', "object 1: unknown enemy type crab"],
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "stack": 2}]', "object 1: unknown setting stack"],
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "path": [0, 1, 0]}]', "object 1: path should be"],
    ['[{"kind": "enemy", "type": "plant", "at": [0, 0, 0], "path": [[0, 1]]}]', "object 1: path should be"],
    ['[{"kind": "box", "type": "basic", "at": [0, 0, 0], "path": [[0, 1, 0]]}]', "object 1: unknown setting path"],
  ])("refuses %s", (text, message) => {
    expect(() => parseObjects(text)).toThrow(message);
  });

  test("writes an enemy's type and path, after the boxes and before the end", () => {
    const text = formatObjects([
      { kind: "end", at: [0, 9, 0], raise: 0, stack: 1 },
      { kind: "enemy", enemy: "rolling_stone", at: [1, 2, 0], raise: 0, stack: 1, path: [[3.00004, 2, 0]] },
      { kind: "box", box: "basic", at: [1, 0, 0], raise: 0, stack: 1 },
    ]);
    expect(text).toBe([
      "[",
      '  {"kind": "box", "type": "basic", "at": [1, 0, 0]},',
      "",
      '  {"kind": "enemy", "type": "rolling_stone", "at": [1, 2, 0], "path": [[3, 2, 0]]},',
      "",
      '  {"kind": "end", "at": [0, 9, 0]}',
      "]",
      "",
    ].join("\n"));
  });

  test("reads back what it writes", () => {
    const objects = parseObjects(`[{"kind": "enemy", "type": "rolling_stone", "at": [8, 35.5, 0], "raise": 0.5, "path": [[9, 35.5, 0]]}]`);
    expect(parseObjects(formatObjects(objects))).toEqual(objects);
  });
});
