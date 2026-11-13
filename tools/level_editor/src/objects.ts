// a level source's objects.json (see doc/custom_levels.md), read and written
// here for the editor, and read for the level build too (builder/levelObjects.ts)

export const KINDS = ["spawn", "end", "box", "enemy", "obstacle"] as const;
export type Kind = (typeof KINDS)[number];
const ONCE: Kind[] = ["spawn", "end"]; // a level has at most one of these

// every box the game has, by name: its subtype, which the level build places
// it by. the base level (jungle rollers, see builder/baseLevel.ts) has all
// their models. enemy_tnt is a tnt set up for an enemy to be spun into, and a
// switch fills an iron_outline in as an iron box. in the order the palette
// lists them: plain, bonus, tnt, the switch and its outlines, then iron
export const BOX_TYPES = {
  basic: 2, slatted: 6, arrow: 3,
  question: 10, life: 8, aku_aku: 9, checkpoint: 4,
  tnt: 0, enemy_tnt: 11,
  switch: 7, outline: 13, iron_outline: 19,
  iron: 5, iron_arrow: 15,
} as const;
export type BoxType = keyof typeof BOX_TYPES;
export const BOX_SUBTYPES: number[] = Object.values(BOX_TYPES);

// the enemies custom levels can have, by name (the palette lists them by their
// names, src/objectNames.ts), by what they do. the level build places them by their entity
// (builder/entities.ts), and takes those jungle rollers hasn't from the level
// they're in (builder/donorObjects.ts). staying at their spot:
// - plant: jungle rollers' biting plant, standing still
// - blue_river_plant, green_river_plant: up the creek's biting plants (red jaws, blue or green leaves), standing still
// - spider: fumbling in the dark's, dropping from its thread when crash comes near
// - snake: temple ruins' cobra, rising to strike when crash comes near
// - gunman: cortex power's gangster, shooting at crash when he comes near
// - fish: up the creek's, leaping out of the river and back
// - lab_assistant: stormy ascent's, throwing vials across the map
// walking back and forth along a path:
// - crab: n. sanity beach's, across the map
// - turtle: n. sanity beach's, along the route
// - native: the great gate's, guarding its path with a shield
// - monkey: the great gate's, across the map once crash comes near
// - warthog: road to nowhere's, charging once crash comes near
// - lizard: the lost city's green lizard, leaping back and forth along its path
// - red_lizard: the lost city's red lizard, hopping along its path after crash
// - walking_lizard: the lost city's spiky lizard on all fours, pacing back and forth along its path
// - robot_dog: heavy machinery's grey robot dog, along the route
// - electric_scientist: the lab's lab assistant walking back and forth along its path, zapping crash
// rolling barrels down their path at crash:
// - barrel_roller: toxic waste's fat man in a suit, at its first node
// hovering back and forth along their path:
// - camera_robot: castle machinery's grey robot with a periscope camera, rising and falling
// - bird: slippery climb's brown bird, flapping up and down
// - flying_camera: castle machinery's and heavy machinery's grey ball with a camera lens, floating up and down
// coming along their path at crash, one at a time, from its first node:
// - blob: the lab's yellow slime blobs, hopping
// running out along their path, count at a time, when crash comes near:
// - badger: jungle rollers'
// - walking_spider: fumbling in the dark's
// - bat: temple ruins', from a roost: they swoop down at crash
// - leader_bats: sunset vista's, from a roost, flying across between two leader bats: kill both and they stop
export const ENEMY_TYPES = ["plant", "blue_river_plant", "green_river_plant", "spider", "snake", "gunman", "fish", "lab_assistant", "crab", "turtle", "native", "monkey", "warthog", "lizard", "red_lizard", "walking_lizard", "robot_dog", "barrel_roller", "camera_robot", "bird", "electric_scientist", "blob", "flying_camera", "badger", "walking_spider", "bat", "leader_bats"] as const;
export type EnemyType = (typeof ENEMY_TYPES)[number];

// the obstacles custom levels can have, by name: parts of the level with a mind
// of their own, which crash rides or has to get past (rather than fights, as an
// enemy). the level build takes them from the level they're in
// (builder/donorObjects.ts). these move along their own level's path from their spot:
// - lily_pad: up the creek's, sinking while crash stands on it
// - leaf: up the creek's floating leaf, drifting back and forth
// standing at their spot:
// - wooden_peg: the great gate's totem peg, folded up until crash spins it, then a step for a while
// rolling along a track:
// - rolling_stone: jungle rollers' stone wheel, back and forth along its track (jungle rollers' own: no other level is read)
// sloping across the map and down from their spot:
// - mossy_slide: the great gate's invisible slider, which slides crash down the slope modelled under it (the map's own)
// spiked logs at their spot, the great gate's:
// - rising_spiked_log: pushing up out of the floor
// - falling_spiked_log: pushing down from above
// and the great gate's fire pit, standing at its spot:
// - fire_pit: a bowl of fire, which sets crash alight
// boulder dash's stone pillars, at their spot:
// - dropping_pillar: standing still until crash stands on it, then sinking away a few seconds later
// - sliding_pillar: sliding across the map and back
// and its wooden gates, standing at their spot:
// - tall_thin_gate, low_wide_gate
// sunset vista's, pushing out towards the camera and back from their spot:
// - pushing_block: a big stone block, shoving crash
// - pushing_platform: a stone platform, to stand on
// and its platforms going round their spot:
// - rotating_pots: stone pots
// - rotating_platforms: flat stone platforms
// temple ruins' carved stone walls, their halves sliding in to meet at their spot and back:
// - slamming_walls
// and its stone pillar, rising from its spot and back down:
// - rising_pillar
// and its platform that carries crash along its path once he stands on it:
// - carrying_platform
// castle machinery's spring, bouncing crash up off it:
// - bounce_pad
// and its steam vent, puffing steam up from its spot on a timer, burning crash:
// - steam_vent
// slippery climb's stone slab, sliding along its path and back:
// - moving_platform
// sunset vista's stone platform out of its wall, shaking when crash stands on it, then dropping a while:
// - dropping_platform
// the lost city's carved slab, falling as soon as crash stands on it, then floating back up:
// - falling_platform
export const OBSTACLE_TYPES = ["lily_pad", "leaf", "wooden_peg", "rolling_stone", "mossy_slide", "rising_spiked_log", "falling_spiked_log", "fire_pit", "dropping_pillar", "sliding_pillar", "tall_thin_gate", "low_wide_gate", "pushing_block", "pushing_platform", "rotating_pots", "rotating_platforms", "slamming_walls", "rising_pillar", "carrying_platform", "bounce_pad", "steam_vent", "moving_platform", "dropping_platform", "falling_platform"] as const;
export type ObstacleType = (typeof OBSTACLE_TYPES)[number];

// the obstacles whose path can be set: a leaf drifts along its nodes (by default its own level's drift)
export const PATH_OBSTACLES = ["leaf", "sliding_pillar", "carrying_platform", "moving_platform"] as const satisfies readonly ObstacleType[];
export type PathObstacle = (typeof PATH_OBSTACLES)[number];
export const isPathObstacle = (type: ObstacleType | undefined) => PATH_OBSTACLES.some((obstacle) => obstacle === type);

// what a placed enemy or obstacle is, as the level build takes it from its level
export type ObjectType = EnemyType | ObstacleType;
export const objectType = (object: LevelObject): ObjectType | undefined => object.enemy ?? object.obstacle;

export type Vec3 = [number, number, number];

// the enemies that move along a path of nodes, and how many nodes it can have
export const PATH_ENEMIES = ["crab", "turtle", "native", "badger", "warthog", "walking_spider", "monkey", "lizard", "red_lizard", "walking_lizard", "robot_dog", "barrel_roller", "camera_robot", "bird", "electric_scientist", "blob", "flying_camera"] as const satisfies readonly EnemyType[];
export type PathEnemy = (typeof PATH_ENEMIES)[number];
export const isPathEnemy = (type: EnemyType | undefined): type is PathEnemy => PATH_ENEMIES.some((enemy) => enemy === type);
export const PATH_NODES_MAX = 20;

// the enemies with a path, for messages: "crabs, turtles, natives, badgers, warthogs, walking spiders, monkeys, lizards and red lizards"
const pluralName = (enemy: EnemyType) => `${enemy.replace("_", " ")}s`;
const PATH_ENEMIES_NAMED = `${PATH_ENEMIES.slice(0, -1).map(pluralName).join(", ")} and ${pluralName(PATH_ENEMIES.at(-1)!)}`;

// how many times the game's own pace a path enemy can walk at (seen working in the game with crabs and turtles)
export const SPEED_MIN = 0.25;
export const SPEED_MAX = 3;
export const SLIDING_PILLAR_SPEED_MAX = 6; // metres a second
export const CARRYING_PLATFORM_SPEED_MAX = 6; // metres a second
export const CARRYING_PLATFORM_SPEED = 1.5; // metres a second: temple ruins' own pace on its 6 m
export const MOVING_PLATFORM_SPEED_MAX = 6; // metres a second
export const MOVING_PLATFORM_SPEED = 2; // metres a second

// how many badgers or walking spiders come out at once: as jungle rollers' first
// badger spawner, and fumbling in the dark's spider spawners, without a count;
// and how many bats a roost sends, as temple ruins' roosts, and in each flock a
// leader bats roost sends, as most of sunset vista's
export const BADGER_COUNT = 2;
export const WALKING_SPIDER_COUNT = 1;
export const BAT_COUNT = 4;
export const LEADER_BATS_COUNT = 5;
export const BADGER_COUNT_MIN = 1;
export const BADGER_COUNT_MAX = 6;

// how many come out at once for an enemy without a count
function countFallback(enemy: ObjectType | undefined): number {
  if (enemy === "walking_spider") {
    return WALKING_SPIDER_COUNT;
  }
  if (enemy === "bat") {
    return BAT_COUNT;
  }
  if (enemy === "leader_bats") {
    return LEADER_BATS_COUNT;
  }
  return BADGER_COUNT;
}

// how many seconds between a bat roost's flocks: temple ruins' roosts' (their
// code's default, 300 frames), and sunset vista's first leader bats' (135 frames)
export const BAT_DELAY = 10;
export const LEADER_BATS_DELAY = 4.5;
export const DELAY_MIN = 1;
export const DELAY_MAX = 20;

// the seconds between flocks for a bat roost without a delay
function delayFallback(enemy: ObjectType | undefined): number {
  if (enemy === "leader_bats") {
    return LEADER_BATS_DELAY;
  }
  return BAT_DELAY;
}

// how near crash comes, in metres, before a gunman starts shooting: cortex
// power's gunmen's (6400 game units at the default scale)
export const GUNMAN_RANGE = 16;
export const RANGE_MIN = 2;
export const RANGE_MAX = 40;

// how long a mossy slide is (metres, at the default scale: its plank is
// slats enough to reach it) and how steeply it slopes (degrees): the great
// gate's short slide's, without them
export const SLIDE_LENGTH = 4;
export const SLIDE_LENGTH_MIN = 2;
export const SLIDE_LENGTH_MAX = 20;
export const SLIDE_ANGLE = 14;
export const SLIDE_ANGLE_MIN = 5;
export const SLIDE_ANGLE_MAX = 30;
export const SLIDE_ROTATION_MAX = 359; // degrees anticlockwise seen from above, from across the map (0)
export const GATES: ObstacleType[] = ["tall_thin_gate", "low_wide_gate"];

// the seconds between a timed obstacle's pushes or flames without an every, as
// its own level's: the great gate's spiked logs' 180 frames and fire pits' 120,
// sunset vista's pushing blocks' 60 and platforms' 70 (at 30 a second); a
// rising pillar's 4 s, near temple ruins' 127 frames, and castle machinery's
// steam vents' 90
const TIMED_EVERY: Partial<Record<ObjectType, number>> = { fire_pit: 4, pushing_block: 2, pushing_platform: 70 / 30, slamming_walls: 3, rising_pillar: 4, steam_vent: 3 };
export const SPIKED_LOG_EVERY = 6;
export const TIMED_EVERY_MIN = 2;
export const TIMED_EVERY_MAX = 20;
export const SPIKED_LOGS: ObstacleType[] = ["rising_spiked_log", "falling_spiked_log"];
export const ROTATING_OBSTACLES: ObstacleType[] = ["rotating_pots", "rotating_platforms"];
export const TIMED_OBSTACLES: ObstacleType[] = [...SPIKED_LOGS, "fire_pit", "pushing_block", "pushing_platform", ...ROTATING_OBSTACLES, "steam_vent"];

// how many rotating pots or platforms go round, and how far out (metres): sunset
// vista's (3 pots or 2 platforms, mostly 350 out in 4s of game units) without them
export const ROTATING_PLATFORMS_MAX = 7;
export const ROTATING_RADIUS = 3.5;
export const ROTATING_RADIUS_MIN = 1;
export const ROTATING_RADIUS_MAX = 10;

// the seconds a dropping platform shakes before it drops, and stays dropped:
// without, sunset vista's code's own 20 and 60 frames
export const SHAKE = 20 / 30;
export const SHAKE_MIN = 0.25;
export const SHAKE_MAX = 5;
export const DOWN = 2;
export const DOWN_MIN = 0.5;
export const DOWN_MAX = 10;

// how many go round a rotating obstacle without a platforms
function platformsFallback(type: ObjectType | undefined): number {
  if (type === "rotating_pots") {
    return 3;
  }
  return 2;
}

// a path enemy's speed without one (the game's own pace), a sliding pillar's
// (metres a second), or a carrying platform's (temple ruins' own pace)
function speedFallback(type: ObjectType | undefined): number {
  if (type === "carrying_platform") {
    return CARRYING_PLATFORM_SPEED;
  }
  if (type === "moving_platform") {
    return MOVING_PLATFORM_SPEED;
  }
  return 1;
}

// the seconds between a timed obstacle's pushes or flames without an every
const everyFallback = (type: ObjectType | undefined): number => TIMED_EVERY[type!] ?? SPIKED_LOG_EVERY;

// the enemy settings that are a number in a range, and for each: the enemies
// that have it (named for messages), its range, whether it's whole, what it is
// without one (left out of objects.json), and what it means
export const NUMBER_SETTINGS = ["speed", "start", "count", "delay", "range", "length", "angle", "rotation", "every", "offset", "platforms", "radius", "shake", "down"] as const;
export type NumberSetting = (typeof NUMBER_SETTINGS)[number];

interface NumberSettingRule {
  types: readonly ObjectType[]; // the enemies or obstacles that have it
  typesNamed: string;
  min: number;
  max: number;
  whole: boolean;
  fallback: (type: ObjectType | undefined) => number;
  meaning: string;
  maxFor?: Partial<Record<ObjectType, number>>; // a higher (or lower) max for some types than max
}

export const NUMBER_SETTING_RULES: Record<NumberSetting, NumberSettingRule> = {
  speed: { types: [...PATH_ENEMIES, "sliding_pillar", "carrying_platform", "moving_platform"], typesNamed: `${PATH_ENEMIES_NAMED}, sliding pillars, carrying platforms and moving platforms`, min: SPEED_MIN, max: SPEED_MAX, whole: false, fallback: speedFallback, meaning: "times the game's own pace, or a sliding pillar's, carrying platform's or moving platform's metres a second", maxFor: { sliding_pillar: SLIDING_PILLAR_SPEED_MAX, carrying_platform: CARRYING_PLATFORM_SPEED_MAX, moving_platform: MOVING_PLATFORM_SPEED_MAX } },
  start: { types: ["rolling_stone"], typesNamed: "rolling stones", min: 0, max: 1, whole: false, fallback: () => 0, meaning: "how far along its track it starts" },
  count: { types: ["badger", "walking_spider", "bat", "leader_bats"], typesNamed: "badgers, walking spiders, bats and leader bats", min: BADGER_COUNT_MIN, max: BADGER_COUNT_MAX, whole: true, fallback: countFallback, meaning: "how many badgers come out at once" },
  delay: { types: ["bat", "leader_bats"], typesNamed: "bats and leader bats", min: DELAY_MIN, max: DELAY_MAX, whole: false, fallback: delayFallback, meaning: "the seconds between its flocks" },
  length: { types: ["mossy_slide"], typesNamed: "mossy slides", min: SLIDE_LENGTH_MIN, max: SLIDE_LENGTH_MAX, whole: false, fallback: () => SLIDE_LENGTH, meaning: "how long it is, in metres" },
  angle: { types: ["mossy_slide"], typesNamed: "mossy slides", min: SLIDE_ANGLE_MIN, max: SLIDE_ANGLE_MAX, whole: false, fallback: () => SLIDE_ANGLE, meaning: "how steeply it slopes, in degrees" },
  rotation: { types: ["mossy_slide", ...GATES], typesNamed: "mossy slides and gates", min: 0, max: SLIDE_ROTATION_MAX, whole: false, fallback: () => 0, meaning: "which way it slides down, from across the map, or falls, from towards the camera: degrees anticlockwise seen from above" },
  every: { types: [...TIMED_OBSTACLES, "slamming_walls", "rising_pillar"], typesNamed: "spiked logs, fire pits, pushing blocks and platforms, rotating pots and platforms, slamming walls, rising pillars and steam vents", min: TIMED_EVERY_MIN, max: TIMED_EVERY_MAX, whole: false, fallback: everyFallback, meaning: "the seconds between its pushes or flames" },
  offset: { types: [...TIMED_OBSTACLES, "slamming_walls", "rising_pillar"], typesNamed: "spiked logs, fire pits, pushing blocks and platforms, rotating pots and platforms, slamming walls, rising pillars and steam vents", min: 0, max: TIMED_EVERY_MAX, whole: false, fallback: () => 0, meaning: "the seconds its pushes or flames are put off by" },
  platforms: { types: ROTATING_OBSTACLES, typesNamed: "rotating pots and platforms", min: 1, max: ROTATING_PLATFORMS_MAX, whole: true, fallback: platformsFallback, meaning: "how many go round" },
  radius: { types: ROTATING_OBSTACLES, typesNamed: "rotating pots and platforms", min: ROTATING_RADIUS_MIN, max: ROTATING_RADIUS_MAX, whole: false, fallback: () => ROTATING_RADIUS, meaning: "how far out they go round, in metres" },
  shake: { types: ["dropping_platform"], typesNamed: "dropping platforms", min: SHAKE_MIN, max: SHAKE_MAX, whole: false, fallback: () => SHAKE, meaning: "the seconds it shakes before it drops" },
  down: { types: ["dropping_platform"], typesNamed: "dropping platforms", min: DOWN_MIN, max: DOWN_MAX, whole: false, fallback: () => DOWN, meaning: "the seconds it stays dropped" },
  range: { types: ["gunman"], typesNamed: "gunmen", min: RANGE_MIN, max: RANGE_MAX, whole: false, fallback: () => GUNMAN_RANGE, meaning: "how near crash comes, in metres, before he shoots" },
};

// whether an object is an enemy or obstacle with a number setting
export const hasNumberSetting = (object: LevelObject, setting: NumberSetting) =>
  NUMBER_SETTING_RULES[setting].types.some((type) => type === objectType(object));

// an object's number setting, or what it is without one
// the most a setting can be for a type of object
export const settingMax = (setting: NumberSetting, type: ObjectType | undefined): number =>
  NUMBER_SETTING_RULES[setting].maxFor?.[type!] ?? NUMBER_SETTING_RULES[setting].max;

export const numberSetting = (object: LevelObject, setting: NumberSetting) => object[setting] ?? NUMBER_SETTING_RULES[setting].fallback(objectType(object));

export interface LevelObject {
  kind: Kind;
  at: Vec3;             // in blender: x, y, z (up), metres
  raise: number;        // metres above at
  stack: number;        // boxes high (1 for anything else)
  box?: BoxType | number; // a box's type, or its subtype number
  enemy?: EnemyType;    // an enemy's type
  obstacle?: ObstacleType; // an obstacle's type
  path?: Vec3[];        // a path enemy's path: its nodes, in metres from where it stands (at, raised); leader bats' second leader, from their first
  speed?: number;       // how many times the game's own pace a path enemy walks at (1 without one), or a sliding pillar's or carrying platform's metres a second
  start?: number;       // how far along its track a rolling stone starts, 0 (its first end) to 1 (its far end); 0 without one
  reverse?: boolean;    // a rolling stone that rolls back towards its first end first, or a fish leaping the other way (true, or none)
  length?: number;      // how long a mossy slide is, in metres (SLIDE_LENGTH without one)
  angle?: number;       // how steeply a mossy slide slopes, in degrees (SLIDE_ANGLE without one)
  rotation?: number;    // which way a mossy slide slides down: degrees anticlockwise seen from above, from across the map (0 without one)
  platforms?: number;   // how many rotating pots or platforms go round (platformsFallback without one)
  radius?: number;      // how far out rotating pots or platforms go round, in metres (ROTATING_RADIUS without one)
  shake?: number;       // the seconds a dropping platform shakes before it drops (SHAKE without one)
  down?: number;        // the seconds a dropping platform stays dropped (DOWN without one)
  count?: number;       // how many badgers or walking spiders come out at once, or bats a roost sends (BADGER_COUNT, WALKING_SPIDER_COUNT, BAT_COUNT, LEADER_BATS_COUNT without one)
  every?: number;       // the seconds between a timed obstacle's pushes or flames (its own level's without one: see TIMED_EVERY)
  offset?: number;      // the seconds a spiked log's pushes are put off by, so a row can push in turn (0 without one)
  delay?: number;       // the seconds between a bat roost's flocks (BAT_DELAY, LEADER_BATS_DELAY without one)
  range?: number;       // how near crash comes, in metres, before a gunman shoots (GUNMAN_RANGE without one)
}

// whether an object moves along a path: an enemy that does, or a leaf
export const hasPath = (object: LevelObject) =>
  (object.kind === "enemy" && isPathEnemy(object.enemy)) || (object.kind === "obstacle" && isPathObstacle(object.obstacle));

// the enemies whose path is one node, which they don't walk: leader bats'
// second leader (the object is their first), a bat roost's swoop's end (the
// object is the roost), and where a lab assistant's vials land, with what it
// is, for messages
const ONE_NODE_PATHS: Partial<Record<EnemyType, string>> = {
  leader_bats: "leader bats' path is their second leader, [[x, y, z]] in metres from the first",
  bat: "a bat roost's path is its swoop's end, [[x, y, z]] in metres from the roost",
  lab_assistant: "a lab assistant's path is where its vials land, [[x, y, z]] in metres from it",
};
export const hasOneNode = (enemy: EnemyType | undefined) => enemy !== undefined && enemy in ONE_NODE_PATHS;

// whether an object has nodes that can be moved: a path enemy's path, or a
// one node enemy's node (leader bats' second leader, a bat roost's swoop's end)
export const hasNodes = (object: LevelObject) => hasPath(object) || (object.kind === "enemy" && hasOneNode(object.enemy));

// how many leaders leader bats have: the object, and its path's one node
export const LEADER_BATS_LEADERS = 2;

// a box's type name, from its type or its subtype number
export function boxTypeName(box: NonNullable<LevelObject["box"]>): BoxType {
  if (typeof box === "string") {
    return box;
  }
  return (Object.keys(BOX_TYPES) as BoxType[]).find((type) => BOX_TYPES[type] === box)!;
}

const SETTINGS = ["kind", "at", "raise"];
const BOX_SETTINGS = ["type", "subtype", "stack"];
const ENEMY_SETTINGS = ["type", "path", "speed", "start", "reverse", "count", "delay", "range"];
const OBSTACLE_SETTINGS = ["type", "path", "speed", "start", "reverse", "length", "angle", "rotation", "every", "offset", "platforms", "radius", "shake", "down"];
const KIND_SETTINGS: Partial<Record<Kind, string[]>> = { box: BOX_SETTINGS, enemy: ENEMY_SETTINGS, obstacle: OBSTACLE_SETTINGS };

// a word with "a" or "an" before it, as it sounds: "a box", "an enemy"
const withArticle = (word: string) => {
  if ("aeiou".includes(word.charAt(0))) {
    return `an ${word}`;
  }
  return `a ${word}`;
};

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

// an obstacle's type, from its fields in objects.json
function readObstacle(fields: Record<string, unknown>, objectNumber: number): Pick<LevelObject, "obstacle"> {
  const obstacleTypes = OBSTACLE_TYPES.join(", ");
  if (!("type" in fields)) {
    throw new Error(`object ${objectNumber}: an obstacle needs a type (${obstacleTypes})`);
  }
  if (!OBSTACLE_TYPES.includes(fields.type as ObstacleType)) {
    throw new Error(`object ${objectNumber}: unknown obstacle type ${fields.type} (it can be ${obstacleTypes})`);
  }
  return { obstacle: fields.type as ObstacleType };
}

// whether a path has as many nodes as an enemy's can: a one node enemy's one
// (leader bats' second leader, a bat roost's swoop's end), a path enemy's 2 to PATH_NODES_MAX
function checkNodeCount(nodes: unknown, enemy: EnemyType, objectNumber: number): asserts nodes is unknown[] {
  if (hasOneNode(enemy)) {
    if (!Array.isArray(nodes) || nodes.length !== 1) {
      throw new Error(`object ${objectNumber}: ${ONE_NODE_PATHS[enemy]}`);
    }
    return;
  }
  if (!isPathEnemy(enemy)) {
    throw new Error(`object ${objectNumber}: a ${enemy} has no path (${PATH_ENEMIES_NAMED} do)`);
  }
  checkPathLength(nodes, objectNumber);
}

// whether a path has 2 to PATH_NODES_MAX nodes
function checkPathLength(nodes: unknown, objectNumber: number): asserts nodes is unknown[] {
  if (!Array.isArray(nodes) || nodes.length < 2 || nodes.length > PATH_NODES_MAX) {
    throw new Error(`object ${objectNumber}: a path should be 2 to ${PATH_NODES_MAX} nodes, [[x, y, z], ...]`);
  }
}

// a path's nodes, each [x, y, z]; an error if one isn't
function pathNodes(nodes: unknown[], objectNumber: number): Vec3[] {
  if (!nodes.every(isPosition)) {
    throw new Error(`object ${objectNumber}: a path's nodes should each be [x, y, z] in metres from where the object stands`);
  }
  return nodes.map(([x, y, z]): Vec3 => [x, y, z]);
}

// a path enemy's path, or a one node enemy's node, from its fields in objects.json (none if it hasn't one)
function readPath(fields: Record<string, unknown>, enemy: EnemyType, objectNumber: number): Pick<LevelObject, "path"> {
  if (!("path" in fields)) {
    return {};
  }
  const nodes = fields.path;
  checkNodeCount(nodes, enemy, objectNumber);
  return { path: pathNodes(nodes, objectNumber) };
}

// a leaf's or sliding pillar's path, from its fields in objects.json (none if it hasn't one); a lily pad has none
function readObstaclePath(fields: Record<string, unknown>, obstacle: ObstacleType, objectNumber: number): Pick<LevelObject, "path"> {
  if (!("path" in fields)) {
    return {};
  }
  if (!isPathObstacle(obstacle)) {
    throw new Error(`object ${objectNumber}: a ${obstacle} has no path (leaves, sliding pillars, carrying platforms and moving platforms do)`);
  }
  checkPathLength(fields.path, objectNumber);
  return { path: pathNodes(fields.path, objectNumber) };
}

// whether a value is a number a setting can be: in its range, and whole if it has to be
function isInRange(value: unknown, rule: NumberSettingRule, max: number): value is number {
  if (!isNumber(value) || value < rule.min || value > max) {
    return false;
  }
  return !rule.whole || Number.isInteger(value);
}

// an enemy's number setting, from its fields in objects.json (none if it hasn't one)
function readNumberSetting(fields: Record<string, unknown>, setting: NumberSetting, type: ObjectType, objectNumber: number): Partial<LevelObject> {
  if (!(setting in fields)) {
    return {};
  }
  const rule = NUMBER_SETTING_RULES[setting];
  if (!rule.types.includes(type)) {
    throw new Error(`object ${objectNumber}: a ${type} has no ${setting} (${rule.typesNamed} do)`);
  }
  const value = fields[setting];
  const max = settingMax(setting, type);
  if (!isInRange(value, rule, max)) {
    throw new Error(`object ${objectNumber}: ${setting} should be ${rule.min} to ${max} (${rule.meaning})`);
  }
  return { [setting]: value };
}

// the enemies and obstacles that can be reversed: a rolling stone rolls back towards its first
// end first, and a fish leaps the other way across the map
const REVERSIBLE: ObjectType[] = ["rolling_stone", "fish", "rotating_pots", "rotating_platforms"];

// whether a rolling stone or fish is reversed, from its fields in objects.json
function readReverse(fields: Record<string, unknown>, type: ObjectType, objectNumber: number): Pick<LevelObject, "reverse"> {
  if (!("reverse" in fields)) {
    return {};
  }
  if (!REVERSIBLE.includes(type)) {
    throw new Error(`object ${objectNumber}: a ${type} has no reverse (rolling stones and fish do; reverse a ${type}'s path instead)`);
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
        `object ${objectNumber}: unknown setting ${unknownSettings[0]} (${withArticle(kind as Kind)} takes ${allowedSettings.join(", ")})`,
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
    if (kind === "obstacle") {
      Object.assign(object, readObstacle(fields, objectNumber));
      Object.assign(object, readObstaclePath(fields, object.obstacle!, objectNumber));
      NUMBER_SETTINGS.forEach((setting) => Object.assign(object, readNumberSetting(fields, setting, object.obstacle!, objectNumber)));
      Object.assign(object, readReverse(fields, object.obstacle!, objectNumber));
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
  if (object.kind === "obstacle" && object.obstacle !== undefined) {
    parts.push(`"type": ${JSON.stringify(object.obstacle)}`);
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
    if (value !== undefined && value !== NUMBER_SETTING_RULES[setting].fallback(objectType(object))) {
      parts.push(`"${setting}": ${value}`);
    }
  }
  if (object.reverse) {
    parts.push(`"reverse": true`);
  }
  return `{${parts.join(", ")}}`;
}

const KIND_ORDER: Record<Kind, number> = { spawn: 0, box: 1, enemy: 2, obstacle: 3, end: 4 };

// the text of an objects.json: the spawn, the boxes in their order, the enemies, the obstacles, then the end;
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
