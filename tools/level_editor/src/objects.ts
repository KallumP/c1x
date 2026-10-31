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

const SETTINGS = ["kind", "at", "raise"];
const BOX_SETTINGS = ["type", "subtype", "stack"];

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isWhole = (v: unknown): v is number => isNumber(v) && Number.isInteger(v);

// the objects in the text of an objects.json; anything else is an Error saying which object (from 1)
export function parseObjects(text: string): LevelObject[] {
  let items: unknown;
  try {
    items = JSON.parse(text);
  } catch (e) {
    throw new Error(`isn't valid JSON: ${e instanceof Error ? e.message : e}`);
  }
  if (!Array.isArray(items)) throw new Error("should be a list of objects, [{...}, ...]");
  const objects: LevelObject[] = [];
  items.forEach((item: unknown, i) => {
    const n = i + 1;
    if (typeof item !== "object" || item === null || Array.isArray(item))
      throw new Error(`object ${n} should be {"kind": ..., "at": [x, y, z]}`);
    const o = item as Record<string, unknown>;
    const kind = o.kind;
    if (kind === undefined) throw new Error(`object ${n} has no kind`);
    if (!KINDS.includes(kind as Kind))
      throw new Error(`object ${n}: unknown kind ${kind} (it can be ${KINDS.join(", ")})`);
    const settings = SETTINGS.concat(kind === "box" ? BOX_SETTINGS : []);
    const unknown = Object.keys(o).filter((k) => !settings.includes(k));
    if (unknown.length)
      throw new Error(`object ${n}: unknown setting ${unknown[0]} (a ${kind} takes ${settings.join(", ")})`);
    if (ONCE.includes(kind as Kind) && objects.some((p) => p.kind === kind))
      throw new Error(`object ${n}: there's already a ${kind} (a level has one)`);
    const at = o.at;
    if (!(Array.isArray(at) && at.length === 3 && at.every(isNumber)))
      throw new Error(`object ${n}: at should be its position in blender, [x, y, z] in metres`);
    const raise = o.raise ?? 0;
    if (!isNumber(raise)) throw new Error(`object ${n}: raise should be how far to raise it off the ground, in metres`);
    const object: LevelObject = { kind: kind as Kind, at: [at[0], at[1], at[2]], raise, stack: 1 };
    if (kind === "box") {
      if (("type" in o) === ("subtype" in o))
        throw new Error(`object ${n}: a box needs a type (${Object.keys(BOX_TYPES).join(", ")}) or a subtype number, not both`);
      if ("type" in o) {
        if (!(typeof o.type === "string" && o.type in BOX_TYPES))
          throw new Error(`object ${n}: unknown box type ${o.type} (it can be ${Object.keys(BOX_TYPES).join(", ")})`);
        object.box = o.type as BoxType;
      } else {
        if (!isWhole(o.subtype) || !BOX_SUBTYPES.includes(o.subtype))
          throw new Error(`object ${n}: a box's subtype should be one of ${BOX_SUBTYPES.join(", ")}`);
        object.box = o.subtype;
      }
      const stack = o.stack ?? 1;
      if (!isWhole(stack) || stack < 1) throw new Error(`object ${n}: stack should be how many boxes high it is, 1 or more`);
      object.stack = stack;
    }
    objects.push(object);
  });
  return objects;
}

const mm = (v: number) => Math.round(v * 1000) / 1000 + 0; // + 0 turns -0 into 0

function formatObject(o: LevelObject): string {
  const parts = [`"kind": ${JSON.stringify(o.kind)}`];
  if (o.kind === "box" && o.box !== undefined)
    parts.push(typeof o.box === "number" ? `"subtype": ${o.box}` : `"type": ${JSON.stringify(o.box)}`);
  parts.push(`"at": [${o.at.map(mm).join(", ")}]`);
  if (mm(o.raise) !== 0) parts.push(`"raise": ${mm(o.raise)}`);
  if (o.kind === "box" && o.stack !== 1) parts.push(`"stack": ${o.stack}`);
  return `{${parts.join(", ")}}`;
}

// the text of an objects.json: one object a line, a blank line where the kind changes
export function formatObjects(objects: LevelObject[]): string {
  if (objects.length === 0) return "[]\n";
  const lines = objects.map((o, i) => {
    const last = i === objects.length - 1;
    const gap = !last && objects[i + 1].kind !== o.kind ? "\n" : "";
    return `  ${formatObject(o)}${last ? "" : ","}\n${gap}`;
  });
  return `[\n${lines.join("")}]\n`;
}
