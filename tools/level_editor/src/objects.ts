// a level source's objects.json (see doc/custom_levels.md), read and written
// here for the editor, and read for the level build too (builder/levelObjects.ts)

export const KINDS = ["spawn", "end", "box", "enemy"] as const;
export type Kind = (typeof KINDS)[number];
const ONCE: Kind[] = ["spawn", "end"]; // a level has at most one of these

// every box the game has, by name: its subtype, which the level build places
// it by. the base level (jungle rollers, see builder/baseLevel.ts) has all
// their models. enemy_tnt is a tnt set up for an enemy to be spun into, and a
// switch fills an iron_outline in as an iron box
export const BOX_TYPES = {
  basic: 2, arrow: 3, checkpoint: 4, iron: 5, slatted: 6,
  switch: 7, life: 8, aku_aku: 9, question: 10, outline: 13,
  tnt: 0, enemy_tnt: 11, iron_arrow: 15, iron_outline: 19,
} as const;
export type BoxType = keyof typeof BOX_TYPES;
export const BOX_SUBTYPES: number[] = Object.values(BOX_TYPES);

// the enemies custom levels can have, by name. the level build places them by
// their entity (builder/entities.ts), and takes those jungle rollers hasn't
// from the level they're in (builder/donorObjects.ts):
// - plant: jungle rollers' biting plant, standing still
// - rolling_stone: jungle rollers' stone wheel, rolling back and forth along its track
// - crab: n. sanity beach's, walking back and forth across the map
// - turtle: n. sanity beach's, walking back and forth along the route
// - native: the great gate's, guarding its path with a shield
// - badger: jungle rollers', running out along its path, count at a time, when crash comes near
// - warthog: road to nowhere's, charging back and forth along its path once crash comes near
// - spider: fumbling in the dark's, dropping from its thread when crash comes near
// - walking_spider: fumbling in the dark's, running out along its path, count at a time, when crash comes near
export const ENEMY_TYPES = ["plant", "rolling_stone", "crab", "turtle", "native", "badger", "warthog", "spider", "walking_spider"] as const;
export type EnemyType = (typeof ENEMY_TYPES)[number];

export type Vec3 = [number, number, number];

// the enemies that move along a path of nodes, and how many nodes it can have
export const PATH_ENEMIES = ["crab", "turtle", "native", "badger", "warthog", "walking_spider"] as const satisfies readonly EnemyType[];
export type PathEnemy = (typeof PATH_ENEMIES)[number];
export const isPathEnemy = (type: EnemyType | undefined): type is PathEnemy => PATH_ENEMIES.some((enemy) => enemy === type);
export const PATH_NODES_MAX = 20;

// the enemies with a path, for messages: "crabs, turtles, natives, badgers, warthogs and walking spiders"
const pluralName = (enemy: EnemyType) => `${enemy.replace("_", " ")}s`;
const PATH_ENEMIES_NAMED = `${PATH_ENEMIES.slice(0, -1).map(pluralName).join(", ")} and ${pluralName(PATH_ENEMIES.at(-1)!)}`;

// how many times the game's own pace a path enemy can walk at (seen working in the game with crabs and turtles)
export const SPEED_MIN = 0.25;
export const SPEED_MAX = 3;

// how many badgers or walking spiders come out at once: as jungle rollers' first
// badger spawner, and fumbling in the dark's spider spawners, without a count
export const BADGER_COUNT = 2;
export const WALKING_SPIDER_COUNT = 1;
export const BADGER_COUNT_MIN = 1;
export const BADGER_COUNT_MAX = 6;

// how many come out at once for an enemy without a count
function countFallback(enemy: EnemyType | undefined): number {
  if (enemy === "walking_spider") {
    return WALKING_SPIDER_COUNT;
  }
  return BADGER_COUNT;
}

// the enemy settings that are a number in a range, and for each: the enemies
// that have it (named for messages), its range, whether it's whole, what it is
// without one (left out of objects.json), and what it means
export const NUMBER_SETTINGS = ["speed", "start", "count"] as const;
export type NumberSetting = (typeof NUMBER_SETTINGS)[number];

interface NumberSettingRule {
  enemies: readonly EnemyType[];
  enemiesNamed: string;
  min: number;
  max: number;
  whole: boolean;
  fallback: (enemy: EnemyType | undefined) => number;
  meaning: string;
}

export const NUMBER_SETTING_RULES: Record<NumberSetting, NumberSettingRule> = {
  speed: { enemies: PATH_ENEMIES, enemiesNamed: PATH_ENEMIES_NAMED, min: SPEED_MIN, max: SPEED_MAX, whole: false, fallback: () => 1, meaning: "times the game's own pace" },
  start: { enemies: ["rolling_stone"], enemiesNamed: "rolling stones", min: 0, max: 1, whole: false, fallback: () => 0, meaning: "how far along its track it starts" },
  count: { enemies: ["badger", "walking_spider"], enemiesNamed: "badgers and walking spiders", min: BADGER_COUNT_MIN, max: BADGER_COUNT_MAX, whole: true, fallback: countFallback, meaning: "how many badgers come out at once" },
};

// whether an object is an enemy with a number setting
export const hasNumberSetting = (object: LevelObject, setting: NumberSetting) =>
  object.kind === "enemy" && NUMBER_SETTING_RULES[setting].enemies.some((enemy) => enemy === object.enemy);

// an object's number setting, or what it is without one
export const numberSetting = (object: LevelObject, setting: NumberSetting) => object[setting] ?? NUMBER_SETTING_RULES[setting].fallback(object.enemy);

export interface LevelObject {
  kind: Kind;
  at: Vec3;             // in blender: x, y, z (up), metres
  raise: number;        // metres above at
  stack: number;        // boxes high (1 for anything else)
  box?: BoxType | number; // a box's type, or its subtype number
  enemy?: EnemyType;    // an enemy's type
  path?: Vec3[];        // a path enemy's path: its nodes, in metres from where it stands (at, raised)
  speed?: number;       // how many times the game's own pace a path enemy walks at (1 without one)
  start?: number;       // how far along its track a rolling stone starts, 0 (its first end) to 1 (its far end); 0 without one
  reverse?: boolean;    // a rolling stone that rolls back towards its first end first (true, or none)
  count?: number;       // how many badgers come out at once (BADGER_COUNT without one)
}

// whether an object is an enemy that moves along a path
export const hasPath = (object: LevelObject) => object.kind === "enemy" && isPathEnemy(object.enemy);

// a box's type name, from its type or its subtype number
export function boxTypeName(box: NonNullable<LevelObject["box"]>): BoxType {
  if (typeof box === "string") {
    return box;
  }
  return (Object.keys(BOX_TYPES) as BoxType[]).find((type) => BOX_TYPES[type] === box)!;
}

const SETTINGS = ["kind", "at", "raise"];
const BOX_SETTINGS = ["type", "subtype", "stack"];
const ENEMY_SETTINGS = ["type", "path", "speed", "start", "reverse", "count"];
const KIND_SETTINGS: Partial<Record<Kind, string[]>> = { box: BOX_SETTINGS, enemy: ENEMY_SETTINGS };

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isWhole = (value: unknown): value is number => isNumber(value) && Number.isInteger(value);
const isPosition = (value: unknown): value is Vec3 => Array.isArray(value) && value.length === 3 && value.every(isNumber);

// an enemy's type, from its fields in objects.json
function readEnemy(fields: Record<string, unknown>, objectNumber: number): Pick<LevelObject, "enemy"> {
  const enemyTypes = ENEMY_TYPES.join(", ");
  if (!("type" in fields)) {
    throw new Error(`object ${objectNumber}: an enemy needs a type (${enemyTypes})`);
  }
  if (!ENEMY_TYPES.includes(fields.type as EnemyType)) {
    throw new Error(`object ${objectNumber}: unknown enemy type ${fields.type} (it can be ${enemyTypes})`);
  }
  return { enemy: fields.type as EnemyType };
}

// a path enemy's path, from its fields in objects.json (none if it hasn't one)
function readPath(fields: Record<string, unknown>, enemy: EnemyType, objectNumber: number): Pick<LevelObject, "path"> {
  if (!("path" in fields)) {
    return {};
  }
  if (!isPathEnemy(enemy)) {
    throw new Error(`object ${objectNumber}: a ${enemy} has no path (${PATH_ENEMIES_NAMED} do)`);
  }
  const nodes = fields.path;
  if (!Array.isArray(nodes) || nodes.length < 2 || nodes.length > PATH_NODES_MAX) {
    throw new Error(`object ${objectNumber}: a path should be 2 to ${PATH_NODES_MAX} nodes, [[x, y, z], ...]`);
  }
  if (!nodes.every(isPosition)) {
    throw new Error(`object ${objectNumber}: a path's nodes should each be [x, y, z] in metres from where the enemy stands`);
  }
  return { path: nodes.map(([x, y, z]): Vec3 => [x, y, z]) };
}

// whether a value is a number a setting can be: in its range, and whole if it has to be
function isInRange(value: unknown, rule: NumberSettingRule): value is number {
  if (!isNumber(value) || value < rule.min || value > rule.max) {
    return false;
  }
  return !rule.whole || Number.isInteger(value);
}

// an enemy's number setting, from its fields in objects.json (none if it hasn't one)
function readNumberSetting(fields: Record<string, unknown>, setting: NumberSetting, enemy: EnemyType, objectNumber: number): Partial<LevelObject> {
  if (!(setting in fields)) {
    return {};
  }
  const rule = NUMBER_SETTING_RULES[setting];
  if (!rule.enemies.includes(enemy)) {
    throw new Error(`object ${objectNumber}: a ${enemy} has no ${setting} (${rule.enemiesNamed} do)`);
  }
  const value = fields[setting];
  if (!isInRange(value, rule)) {
    throw new Error(`object ${objectNumber}: ${setting} should be ${rule.min} to ${rule.max} (${rule.meaning})`);
  }
  return { [setting]: value };
}

// whether a rolling stone rolls back towards its first end first, from its fields in objects.json
function readReverse(fields: Record<string, unknown>, enemy: EnemyType, objectNumber: number): Pick<LevelObject, "reverse"> {
  if (!("reverse" in fields)) {
    return {};
  }
  if (enemy !== "rolling_stone") {
    throw new Error(`object ${objectNumber}: a ${enemy} has no reverse (rolling stones do; reverse a ${enemy}'s path instead)`);
  }
  if (typeof fields.reverse !== "boolean") {
    throw new Error(`object ${objectNumber}: reverse should be true or false`);
  }
  return fields.reverse ? { reverse: true } : {};
}

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

    const allowedSettings = SETTINGS.concat(KIND_SETTINGS[kind as Kind] ?? []);
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
    if (!isPosition(at)) {
      throw new Error(`object ${objectNumber}: at should be its position in blender, [x, y, z] in metres`);
    }
    const raise = fields.raise ?? 0;
    if (!isNumber(raise)) {
      throw new Error(`object ${objectNumber}: raise should be how far to raise it, in metres`);
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
    if (kind === "enemy") {
      Object.assign(object, readEnemy(fields, objectNumber));
      Object.assign(object, readPath(fields, object.enemy!, objectNumber));
      NUMBER_SETTINGS.forEach((setting) => Object.assign(object, readNumberSetting(fields, setting, object.enemy!, objectNumber)));
      Object.assign(object, readReverse(fields, object.enemy!, objectNumber));
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
  if (object.kind === "enemy" && object.enemy !== undefined) {
    parts.push(`"type": ${JSON.stringify(object.enemy)}`);
  }
  parts.push(`"at": [${object.at.map(roundToMillimetre).join(", ")}]`);
  const raise = roundToMillimetre(object.raise);
  if (raise !== 0) {
    parts.push(`"raise": ${raise}`);
  }
  if (object.kind === "box" && object.stack !== 1) {
    parts.push(`"stack": ${object.stack}`);
  }
  if (object.path) {
    const nodes = object.path.map((node) => `[${node.map(roundToMillimetre).join(", ")}]`);
    parts.push(`"path": [${nodes.join(", ")}]`);
  }
  for (const setting of NUMBER_SETTINGS) {
    const value = object[setting];
    if (value !== undefined && value !== NUMBER_SETTING_RULES[setting].fallback(object.enemy)) {
      parts.push(`"${setting}": ${value}`);
    }
  }
  if (object.reverse) {
    parts.push(`"reverse": true`);
  }
  return `{${parts.join(", ")}}`;
}

const KIND_ORDER: Record<Kind, number> = { spawn: 0, box: 1, enemy: 2, end: 3 };

// the text of an objects.json: the spawn, the boxes in their order, the enemies, then the end;
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
