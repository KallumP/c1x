// a level source's objects.json (see doc/custom_levels.md): the same rules
// and messages as tools/levelobjects.py, which build_level.py reads it with

export const KINDS = ["spawn", "end", "box"] as const;
export type Kind = (typeof KINDS)[number];
const ONCE: Kind[] = ["spawn", "end"]; // a level has at most one of these

// n. sanity beach's boxes by name, as they look in the game (BOX_TYPES in levelobjects.py)
export const BOX_TYPES = {
  basic: 2, arrow: 3, checkpoint: 4, iron: 5, slatted: 6,
  switch: 7, life: 8, aku_aku: 9, question: 10, outline: 13,
} as const;
export type BoxType = keyof typeof BOX_TYPES;
export const BOX_SUBTYPES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 13];

export type Vec3 = [number, number, number];

export interface LevelObject {
  kind: Kind;
  at: Vec3;             // in blender: x, y, z (up), metres
  raise: number;        // metres off the ground it goes on
  stack: number;        // boxes high (1 for anything else)
  box?: BoxType | number; // a box's type, or its subtype number
}

// a box's type name, from its type or its subtype number
export function boxTypeName(box: NonNullable<LevelObject["box"]>): BoxType {
  if (typeof box === "string") {
    return box;
  }
  return (Object.keys(BOX_TYPES) as BoxType[]).find((type) => BOX_TYPES[type] === box)!;
}

const SETTINGS = ["kind", "at", "raise"];
const BOX_SETTINGS = ["type", "subtype", "stack"];

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isWhole = (value: unknown): value is number => isNumber(value) && Number.isInteger(value);

// the objects in the text of an objects.json; anything else is an Error saying which object (from 1)
export function parseObjects(text: string): LevelObject[] {
  let entries: unknown;
  try {
    entries = JSON.parse(text);
  } catch (error) {
    throw new Error(`isn't valid JSON: ${error instanceof Error ? error.message : error}`);
  }
  if (!Array.isArray(entries)) {
    throw new Error("should be a list of objects, [{...}, ...]");
  }

  const objects: LevelObject[] = [];
  entries.forEach((entry: unknown, index) => {
    const objectNumber = index + 1;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`object ${objectNumber} should be {"kind": ..., "at": [x, y, z]}`);
    }
    const fields = entry as Record<string, unknown>; // the entry's fields, not checked yet

    const kind = fields.kind;
    if (kind === undefined) {
      throw new Error(`object ${objectNumber} has no kind`);
    }
    if (!KINDS.includes(kind as Kind)) {
      throw new Error(`object ${objectNumber}: unknown kind ${kind} (it can be ${KINDS.join(", ")})`);
    }

    const allowedSettings = SETTINGS.concat(kind === "box" ? BOX_SETTINGS : []);
    const unknownSettings = Object.keys(fields).filter((setting) => !allowedSettings.includes(setting));
    if (unknownSettings.length) {
      throw new Error(
        `object ${objectNumber}: unknown setting ${unknownSettings[0]} (a ${kind} takes ${allowedSettings.join(", ")})`,
      );
    }
    if (ONCE.includes(kind as Kind) && objects.some((earlier) => earlier.kind === kind)) {
      throw new Error(`object ${objectNumber}: there's already a ${kind} (a level has one)`);
    }

    const at = fields.at;
    if (!(Array.isArray(at) && at.length === 3 && at.every(isNumber))) {
      throw new Error(`object ${objectNumber}: at should be its position in blender, [x, y, z] in metres`);
    }
    const raise = fields.raise ?? 0;
    if (!isNumber(raise)) {
      throw new Error(`object ${objectNumber}: raise should be how far to raise it off the ground, in metres`);
    }
    const object: LevelObject = { kind: kind as Kind, at: [at[0], at[1], at[2]], raise, stack: 1 };

    if (kind === "box") {
      const boxTypes = Object.keys(BOX_TYPES).join(", ");
      if (("type" in fields) === ("subtype" in fields)) {
        throw new Error(`object ${objectNumber}: a box needs a type (${boxTypes}) or a subtype number, not both`);
      }
      if ("type" in fields) {
        if (!(typeof fields.type === "string" && fields.type in BOX_TYPES)) {
          throw new Error(`object ${objectNumber}: unknown box type ${fields.type} (it can be ${boxTypes})`);
        }
        object.box = fields.type as BoxType;
      } else {
        if (!isWhole(fields.subtype) || !BOX_SUBTYPES.includes(fields.subtype)) {
          throw new Error(`object ${objectNumber}: a box's subtype should be one of ${BOX_SUBTYPES.join(", ")}`);
        }
        object.box = fields.subtype;
      }

      const stack = fields.stack ?? 1;
      if (!isWhole(stack) || stack < 1) {
        throw new Error(`object ${objectNumber}: stack should be how many boxes high it is, 1 or more`);
      }
      object.stack = stack;
    }

    objects.push(object);
  });
  return objects;
}

const roundToMillimetre = (metres: number) => Math.round(metres * 1000) / 1000 + 0; // + 0 turns -0 into 0

function formatObject(object: LevelObject): string {
  const parts = [`"kind": ${JSON.stringify(object.kind)}`];
  if (object.kind === "box" && object.box !== undefined) {
    parts.push(typeof object.box === "number" ? `"subtype": ${object.box}` : `"type": ${JSON.stringify(object.box)}`);
  }
  parts.push(`"at": [${object.at.map(roundToMillimetre).join(", ")}]`);
  const raise = roundToMillimetre(object.raise);
  if (raise !== 0) {
    parts.push(`"raise": ${raise}`);
  }
  if (object.kind === "box" && object.stack !== 1) {
    parts.push(`"stack": ${object.stack}`);
  }
  return `{${parts.join(", ")}}`;
}

const KIND_ORDER: Record<Kind, number> = { spawn: 0, box: 1, end: 2 };

// the text of an objects.json: the spawn, the boxes in their order, then the end;
// one object a line, with a blank line between kinds
export function formatObjects(unordered: LevelObject[]): string {
  if (unordered.length === 0) {
    return "[]\n";
  }

  // sort is stable, so the boxes keep their order
  const objects = [...unordered].sort((first, second) => KIND_ORDER[first.kind] - KIND_ORDER[second.kind]);
  const lines = objects.map((object, index) => {
    const isLast = index === objects.length - 1;
    const blankLine = !isLast && objects[index + 1].kind !== object.kind ? "\n" : "";
    return `  ${formatObject(object)}${isLast ? "" : ","}\n${blankLine}`;
  });
  return `[\n${lines.join("")}]\n`;
}
