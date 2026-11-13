// objects custom levels take from a real level other than the base level (their
// donor), such as an enemy jungle rollers doesn't have: its code and what that
// uses there (models, animations, sounds and texture pages), and any object it spawns
import { objectType, type ObjectType, type LevelObject } from "../src/objects";
import { packEntries, rawPagesById, reachableEids } from "./cutLevel";
import { withBothSidesDrawn } from "./bothSides";
import { withEndCaps } from "./endCaps";
import { MOVED_ENEMY_CODE, objectEntity } from "./entities";
import { EID_NONE, eidToString, stringToEid } from "./entryIds";
import { ENTRY_GOOL, entriesById, PAGE_ENTRIES, PAGE_SOUNDS, PAGE_TEXTURE, soundPage, type Entry, type Level, type Page } from "./levelFiles";
import { entryBytes } from "./levelWriting";

// a real level an enemy is taken from: its id, name, and its files in streams/
export interface DonorLevel {
  lid: number;
  name: string;
  file: string;
}

const N_SANITY_BEACH: DonorLevel = { lid: 0x9, name: "N. Sanity Beach", file: "s0000009" };
const THE_GREAT_GATE: DonorLevel = { lid: 0x12, name: "The Great Gate", file: "s0000012" };
const BOULDER_DASH: DonorLevel = { lid: 0x13, name: "Boulder Dash", file: "s0000013" };
const ROAD_TO_NOWHERE: DonorLevel = { lid: 0x14, name: "Road to Nowhere", file: "s0000014" };
const FUMBLING_IN_THE_DARK: DonorLevel = { lid: 0x2a, name: "Fumbling in the Dark", file: "s000002a" };
const UP_THE_CREEK: DonorLevel = { lid: 0x18, name: "Up the Creek", file: "s0000018" };
// its code is temple ruins' too, but its copy reaches only its bats and leader
// bats, so it brings two texture pages where temple ruins' brings three
const SUNSET_VISTA: DonorLevel = { lid: 0x23, name: "Sunset Vista", file: "s0000023" };
const THE_LOST_CITY: DonorLevel = { lid: 0x20, name: "The Lost City", file: "s0000020" };
// its lab assistants' code differs from the lab's, whose walkers spawn an object
// (by exec slot 9) that crashes a custom level
const STORMY_ASCENT: DonorLevel = { lid: 0x22, name: "Stormy Ascent", file: "s0000022" };
const TEMPLE_RUINS: DonorLevel = { lid: 0x1c, name: "Temple Ruins", file: "s000001c" };
// its robot dogs' code is PoRoC, as the lab's walkers' child object is, but not the same
const HEAVY_MACHINERY: DonorLevel = { lid: 0x6, name: "Heavy Machinery", file: "s0000006" };
const TOXIC_WASTE: DonorLevel = { lid: 0x7, name: "Toxic Waste", file: "s0000007" };
const CORTEX_POWER: DonorLevel = { lid: 0x3, name: "Cortex Power", file: "s0000003" };
const CASTLE_MACHINERY: DonorLevel = { lid: 0x37, name: "Castle Machinery", file: "s0000037" };
const SLIPPERY_CLIMB: DonorLevel = { lid: 0x2e, name: "Slippery Climb", file: "s000002e" };
const THE_LAB: DonorLevel = { lid: 0x29, name: "The Lab", file: "s0000029" };

// the level each enemy jungle rollers doesn't have, and each obstacle, is taken from
export const OBJECT_DONORS: Partial<Record<ObjectType, DonorLevel>> = {
  crab: N_SANITY_BEACH,
  turtle: N_SANITY_BEACH,
  native: THE_GREAT_GATE,
  monkey: THE_GREAT_GATE,
  warthog: ROAD_TO_NOWHERE,
  spider: FUMBLING_IN_THE_DARK,
  walking_spider: FUMBLING_IN_THE_DARK,
  blue_river_plant: UP_THE_CREEK,
  green_river_plant: UP_THE_CREEK,
  fish: UP_THE_CREEK,
  bat: SUNSET_VISTA,
  leader_bats: SUNSET_VISTA,
  lizard: THE_LOST_CITY,
  red_lizard: THE_LOST_CITY,
  walking_lizard: THE_LOST_CITY,
  lab_assistant: STORMY_ASCENT,
  snake: TEMPLE_RUINS,
  robot_dog: HEAVY_MACHINERY,
  barrel_roller: TOXIC_WASTE,
  gunman: CORTEX_POWER,
  camera_robot: CASTLE_MACHINERY,
  bird: SLIPPERY_CLIMB,
  electric_scientist: THE_LAB,
  blob: THE_LAB,
  flying_camera: HEAVY_MACHINERY, // its PoRoC (the robot dog's) is the same as castle machinery's
  lily_pad: UP_THE_CREEK,
  leaf: UP_THE_CREEK,
  wooden_peg: THE_GREAT_GATE,
  mossy_slide: THE_GREAT_GATE,
  rising_spiked_log: THE_GREAT_GATE,
  falling_spiked_log: THE_GREAT_GATE,
  fire_pit: THE_GREAT_GATE,
  dropping_pillar: BOULDER_DASH,
  sliding_pillar: BOULDER_DASH,
  tall_thin_gate: BOULDER_DASH,
  low_wide_gate: BOULDER_DASH,
  pushing_block: SUNSET_VISTA,
  pushing_platform: SUNSET_VISTA,
  rotating_pots: SUNSET_VISTA,
  rotating_platforms: SUNSET_VISTA,
  slamming_walls: TEMPLE_RUINS,
  rising_pillar: TEMPLE_RUINS,
  carrying_platform: TEMPLE_RUINS,
  bounce_pad: CASTLE_MACHINERY,
  steam_vent: CASTLE_MACHINERY,
  moving_platform: SLIPPERY_CLIMB,
  lift_platform: SLIPPERY_CLIMB,
  floor_fire: SUNSET_VISTA, // its ruins objects RuiOC, the bats'
  steady_fire: SUNSET_VISTA,
  dropping_platform: SUNSET_VISTA,
  falling_platform: THE_LOST_CITY,
  seesaw: SUNSET_VISTA,
  timed_plank: ROAD_TO_NOWHERE,
  breaking_plank: ROAD_TO_NOWHERE,
  rotating_pegs: TEMPLE_RUINS,
};

export interface DonorObject {
  code: [slot: number, eid: number][]; // each piece of code it brings, in its exec slot in the donor
  entries: Entry[];                    // its code, models, animations and the like, from entry pages
  sounds: Entry[];                     // the sounds it plays, from the donor's sound pages
  texturePages: Page[];                // the texture pages its models use
  crashEntries?: CrashEntry[];         // the entries it needs crash's code to name that the base level's crash lacks
}

// an entry crash's code names: which of its items, where in it (bytes), and the entry (its eid) to put there
export interface CrashEntry {
  item: number;
  at: number;
  eid: number;
}

// the entries of the given kind of page that are among eids
function entriesInPages(donor: Level, pageType: number, eids: Set<number>): Entry[] {
  return donor.pages.filter((page) => page.type === pageType).flatMap((page) => page.entries.filter(({ eid }) => eids.has(eid)));
}

// the exec slot of each piece of code among entries, as the donor's exec map has it
function codeSlots(donor: Level, entries: Entry[]): [number, number][] {
  const execMap = donor.nsd.ldat.execMap;
  return entries.filter((entry) => entry.type === ENTRY_GOOL)
    .map((entry): [number, number] => [execMap.indexOf(entry.eid), entry.eid])
    .filter(([slot]) => slot >= 0);
}

// the code in exec slot slot in the donor level; an error if there's none
function codeInSlot(donor: Level, slot: number): number {
  const code = donor.nsd.ldat.execMap[slot];
  if (code === undefined || code === EID_NONE || !entriesById(donor).has(code)) {
    throw new Error(`the donor level (${donor.nsd.ldat.lid.toString(16)}) has no code in exec slot ${slot}`);
  }
  return code;
}

// the object whose code is in exec slot slot in the donor level, and what it
// uses there, with the code in childSlots: objects it spawns by their exec slot
// (which its entries don't name), and what they use; but not the entries in
// leftOut, which its entries name but it never uses, nor what only they use
export function donorObject(donor: Level, slot: number, childSlots: number[] = [], leftOut: number[] = []): DonorObject {
  const used = reachableEids(donor, [slot, ...childSlots].map((codeSlot) => codeInSlot(donor, codeSlot)), new Set(leftOut));
  const entries = entriesInPages(donor, PAGE_ENTRIES, used);
  const texturePages = [...rawPagesById(donor)].filter(([eid, page]) => used.has(eid) && page.type === PAGE_TEXTURE).map(([, page]) => page);
  return { code: codeSlots(donor, entries), entries, sounds: entriesInPages(donor, PAGE_SOUNDS, used), texturePages };
}

const CODE_HEADER = 0; // a code entry's item holding its header, its exec slot (its type) first
const CODE_DATA = 2;   // and its data: eids and constants, the code's own eid first

// a code header naming exec slot slot
function headerInSlot(header: Buffer, slot: number): Buffer {
  const moved = Buffer.from(header);
  moved.writeUInt32LE(slot, 0);
  return moved;
}

// an item of words with each word that's from made to
function withWordRenamed(item: Buffer, from: number, to: number): Buffer {
  const renamed = Buffer.from(item);
  for (let at = 0; at + 4 <= renamed.length; at += 4) {
    if (renamed.readUInt32LE(at) === from) {
      renamed.writeUInt32LE(to, at);
    }
  }
  return renamed;
}

// object with its code in exec slot from moved to exec slot to, named eid there
// (for code whose own slot and name a custom level's other code has, such as
// temple ruins' cobra and jungle rollers' plant, both PlanC in slot 25). an
// error if it has no code in from
export function withCodeMoved(object: DonorObject, from: number, to: number, eid: number): DonorObject {
  const code = object.code.find(([slot]) => slot === from)?.[1];
  if (code === undefined) {
    throw new Error(`the object has no code in exec slot ${from} to move`);
  }
  const movedItem = (item: Buffer, index: number) => {
    if (index === CODE_HEADER) {
      return headerInSlot(item, to);
    }
    if (index === CODE_DATA) {
      return withWordRenamed(item, code, eid);
    }
    return item;
  };
  const moveEntry = (entry: Entry): Entry => {
    if (entry.eid !== code) {
      return entry;
    }
    return { ...entry, eid, items: entry.items.map(movedItem) };
  };
  return {
    ...object,
    code: object.code.map(([slot, codeEid]): [number, number] => (slot === from ? [to, eid] : [slot, codeEid])),
    entries: object.entries.map(moveEntry),
  };
}

// what each eid in the level holds, to tell an entry already there from a clashing one
function levelContents(level: Level): Map<number, Buffer> {
  const contents = new Map<number, Buffer>();
  for (const page of level.pages) {
    if (page.type === PAGE_TEXTURE) {
      contents.set(page.eid, page.data);
    }
    page.entries.forEach((entry) => contents.set(entry.eid, entryBytes(entry)));
  }
  return contents;
}

// whether an eid holding contents is new to the level (and so now there); false
// if the level has it already, the same. an error if the level's is different
function isNewTo(present: Map<number, Buffer>, eid: number, contents: Buffer): boolean {
  const there = present.get(eid);
  if (there && !there.equals(contents)) {
    throw new Error(`${eidToString(eid)}, from another level, is different from the ${eidToString(eid)} the level already has`);
  }
  present.set(eid, contents);
  return !there;
}

// the exec map with each object's code in its slot. a slot already holding other code is an error
function execMapWith(execMap: number[], donors: DonorObject[]): number[] {
  const withCode = [...execMap];
  for (const [slot, eid] of donors.flatMap((donor) => donor.code)) {
    if (withCode[slot] !== EID_NONE && withCode[slot] !== eid) {
      throw new Error(`exec slot ${slot} holds ${eidToString(withCode[slot])}, so ${eidToString(eid)} from another level can't go there`);
    }
    withCode[slot] = eid;
  }
  return withCode;
}

// a copy of level with the objects from other levels added: their entries packed
// into entry pages, their sounds into sound pages of their own, their texture
// pages, and their code in its exec slots. what the level already has the same isn't added again
export function withDonorObjects(level: Level, donors: DonorObject[]): Level {
  const present = levelContents(level);
  const newEntries = (pick: (donor: DonorObject) => Entry[]) =>
    donors.flatMap(pick).filter((entry) => isNewTo(present, entry.eid, entryBytes(entry)));
  const entries = newEntries((donor) => donor.entries);
  const sounds = newEntries((donor) => donor.sounds);
  const texturePages = donors.flatMap((donor) => donor.texturePages).filter((page) => isNewTo(present, page.eid, page.data));
  const ldat = { ...level.nsd.ldat, execMap: execMapWith(level.nsd.ldat.execMap, donors) };
  const crashEntries = donors.flatMap((donor) => donor.crashEntries ?? []);
  return {
    nsd: { ...level.nsd, ldat },
    pages: [...pagesWithCrashEntries(level.pages, crashEntries), ...packEntries(entries), ...packEntries(sounds, soundPage), ...texturePages],
  };
}

const CRASH_CODE = stringToEid("WillC");
const CRASH_CONSTANTS = 2;  // crash's code's items: its constants (its code's ireg[])
const CRASH_ANIMATIONS = 5; // and its animations, each its type and length, then its eid
const ANIMATION_EID = 4;

// crash's code with each of entries put in its place
function crashWithEntries(crash: Entry, entries: CrashEntry[]): Entry {
  const items = crash.items.map((item) => Buffer.from(item));
  entries.forEach(({ item, at, eid }) => items[item].writeUInt32LE(eid, at));
  return { ...crash, items };
}

// pages with crash's code, wherever it is in their entries, given entries
function pagesWithCrashEntries(pages: Page[], entries: CrashEntry[]): Page[] {
  if (entries.length === 0) {
    return pages;
  }
  const withEntries = (entry: Entry) => (entry.eid === CRASH_CODE ? crashWithEntries(entry, entries) : entry);
  return pages.map((page) => (page.type === PAGE_ENTRIES ? { ...page, entries: page.entries.map(withEntries) } : page));
}

const objectName = (type: ObjectType) => type.replace("_", " ");

function readDonorLevel(type: ObjectType, donor: DonorLevel, readOtherLevel?: (lid: number) => Level): Level {
  const what = `${donor.name} (${donor.file}.nsd)`;
  if (!readOtherLevel) {
    throw new Error(`the level's ${objectName(type)}s come from ${what}, but there are no other levels to read`);
  }
  try {
    return readOtherLevel(donor.lid);
  } catch (error) {
    throw new Error(`${what} couldn't be read, and the level's ${objectName(type)}s come from it: ${error instanceof Error ? error.message : error}`);
  }
}

// the level each kind of enemy among objects is taken from, read with
// readOtherLevel, for the kinds that come from another level. a level two kinds
// come from (such as fumbling in the dark's two spiders) is read once
export function objectDonorLevels(objects: LevelObject[], readOtherLevel?: (lid: number) => Level): Map<ObjectType, Level> {
  const levels = new Map<ObjectType, Level>();
  const read = new Map<number, Level>();
  for (const type of new Set(objects.flatMap((object) => objectType(object) ?? []))) {
    const donor = OBJECT_DONORS[type];
    if (!donor) {
      continue;
    }
    if (!read.has(donor.lid)) {
      read.set(donor.lid, readDonorLevel(type, donor, readOtherLevel));
    }
    levels.set(type, read.get(donor.lid)!);
  }
  return levels;
}

// one instruction of an object's code changed: its index in the code, what it
// is in the donor level, and what it becomes
interface CodePatch {
  at: number;
  was: number;
  now: number;
}

const CODE_ITEM = 1; // a code entry's item holding its instructions

// the great gate's natives start at the end of their path nearest crash, and
// walk back to the end nearest him when he leaves. these make both their
// path's first node, so its order decides where they stand: each branch on
// which end is nearer (BEQZ) becomes one always taken (BRA) that drops the comparison
const NATIVE_CODE_PATCHES: CodePatch[] = [
  { at: 0x19, was: 0x8227c002, now: 0x82094400 }, // where it starts: on to its first node
  { at: 0x2d, was: 0x8227c003, now: 0x82094403 }, // where it walks back to: past setting its last node
];

// up the creek's green river plant (RivOC subtype 7), landed on, bites once
// crash isn't going up and has come back down within 400 of its height. off
// it onto anything higher (such as a box), it wouldn't bite until he came back
// down, so that check always passes: it bites 20 frames after he landed on it,
// once he isn't going up, wherever he is. RivOC is all three river enemies'
// code, so each has the same patch (their copies of it have to be the same)
const RIVER_CODE_PATCHES: CodePatch[] = [
  { at: 0x47, was: 0x09e1fd49, now: 0x06e1f801 }, // SLT pop(), player[0x84] becomes ORL pop(), 0x100: always true
];

// stormy ascent's lab assistant (LabAC subtype 0, state 6) throws where its
// entity says. its setup picked a throw from its code's presets by flag c (in
// a custom level, all back along the game's x) and faced along x by its speed's
// sign; now flag a is its facing (an angle, 4096 a turn), flag b its vials'
// speed along x and c along z (each vial reads its thrower's flag c, where it
// had 0), their speed up and fuse custom levels' first preset's, and it throws
// at its code's own rate (flag a was how often)
const LAB_ASSISTANT_CODE_PATCHES: CodePatch[] = [
  { at: 0x202, was: 0x8225c003, now: 0x15016e17 }, // SHA ireg[0x58], obj[0xbc]: flag a, as written
  { at: 0x203, was: 0x15016e17, now: 0x11e1fe0c }, // MOVE pop(), obj[0x90]: its facing
  { at: 0x204, was: 0x11e1fe44, now: 0x11017e44 }, // MOVE ireg[0x5c], obj[0x170]: how often it throws, its code's default
  { at: 0x205, was: 0x82094001, now: 0x11800e45 }, // MOVE 0, obj[0x174]: its timer from 0
  { at: 0x206, was: 0x11017e44, now: 0x11e18e17 }, // MOVE obj[0xc0], obj[0xbc]: flag b, its vials' speed along x
  { at: 0x207, was: 0x15016e18, now: 0x1102be18 }, // MOVE ireg[0xac], obj[0xc0]: their speed up
  { at: 0x208, was: 0x11e1fe45, now: 0x11020e46 }, // MOVE ireg[0x80], obj[0x178]: their fuse
  { at: 0x209, was: 0x1fbe0800, now: 0x8209403f }, // BRA to 0x249, past its presets
  { at: 0x24d, was: 0x09800e17, now: 0x82094004 }, // BRA past facing along x by flag a's sign
  { at: 0x28a, was: 0x11800e13, now: 0x11d19e13 }, // MOVE creator[0xc4], obj[0xac]: a vial's speed along z
];

// cortex power's gunman (MafiC subtype 0) starts shooting once crash is nearer
// than his code's 16 m (ireg[0xc4]) and not more than 5 m past him; now he
// reads how near from his init flag c (in game units, as the game shifts it)
const GUNMAN_CODE_PATCHES: CodePatch[] = [
  { at: 0x1d, was: 0x09031e1f, now: 0x09e19e1f }, // SLT ireg[0xc4], pop() becomes SLT obj[0xc4], pop(): his flag c
];

// the code each enemy spawns by its exec slot, which its entries don't name:
// toxic waste's barrel roller throws his barrels (BaraC, slot 16)
const ENEMY_CHILD_SLOTS: Partial<Record<ObjectType, number[]>> = {
  barrel_roller: [16],
  electric_scientist: [9],
};

// the code an enemy spawns by exec slot that moves to another slot under another
// name, as an enemy's own code can (see MOVED_ENEMY_CODE): the lab's walking lab
// assistant's spark, the lab's PoRoC, as heavy machinery's (the robot dog's) has slot 9 and the name
const MOVED_CHILD_CODE: Partial<Record<ObjectType, { from: number; to: number; name: string }[]>> = {
  electric_scientist: [{ from: 9, to: 44, name: "SprkC" }],
};

// entries an enemy's entries name but its code never uses, left out: toxic
// waste's barrel roller's data names its WateC, which differs from up the
// creek's (the river enemies') in the same exec slot, so the two would clash.
// the lost city's ruins objects' code (RWaOC) names all their models, but a
// walking lizard (subtype 5) only uses its own (Ig1wG, walking Ig1wV): the rest
// would bring three more texture pages
const RUINS_OBJECT_MODELS = ["Li1w", "Rw1w", "Rw2w", "Rw3w", "Rw4w", "Rp1w", "Rp2w", "Rp3w", "Rp4w", "Rp5w", "Rp7w"];
// the great gate's objects' models (WalOC's: its wood platforms' and the rest),
// and the texture page its code names itself (Vi3iT), which its mossy slide's
// slider, being invisible, never shows. left out, their texture pages don't
// come with it; a wood platform brings them itself
const GATE_OBJECT_MODELS = ["WT1i", "SL1i", "WS1i", "WP1i"];
const GATE_OBJECTS_PAGE = "Vi3iT";

// boulder dash's objects' models (its JunOC's, moved: see MOVED_ENEMY_CODE)
// that its gates never show: its boulder (JuSe) and the rest. left out, their
// texture pages don't come with them
const BOULDER_DASH_NON_GATE_MODELS = ["Jube", "JuBe", "JuFe", "JuLe", "JuSe"];

// the ruins objects' models a ruins object leaves out: all but its own
// (sunset vista's pushing block Rp1w on Rp7w, its pushing platform Rw1w or Rw3w,
// its rotating pots Rp3w and rotating platforms Rw1w)
const ruinsModelsBut = (own: string[]) => RUINS_OBJECT_MODELS.filter((model) => !own.includes(model)).flatMap((model) => [`${model}G`, `${model}V`]);

// road to nowhere's planks' models (its BridC's) a plank leaves out: all but its own
const PLANK_MODELS = ["BD1k", "BE1k", "BT1k", "Bs1k", "Be1k"];
const planksBut = (...own: string[]) => PLANK_MODELS.filter((model) => !own.includes(model)).flatMap((model) => [`${model}G`, `${model}V`]);

const ENEMY_UNUSED_ENTRIES: Partial<Record<ObjectType, string[]>> = {
  pushing_block: ruinsModelsBut(["Rp1w", "Rp7w"]),
  pushing_platform: ruinsModelsBut(["Rw1w", "Rw3w"]),
  rotating_pots: ruinsModelsBut(["Rp3w"]),
  rotating_platforms: ruinsModelsBut(["Rw1w"]),
  dropping_platform: ruinsModelsBut(["Rw2w"]),
  seesaw: ruinsModelsBut(["Rp4w"]),
  timed_plank: planksBut("BD1k"),
  breaking_plank: planksBut("BE1k", "Be1k"), // and the falling plank it breaks into
  rising_pillar: ["PlDsG", "PlDsV", "PlPsG", "PlPsV"], // temple ruins' other pillars' models: its PoPlC's, which a rising pillar never shows
  carrying_platform: ["PlDsG", "PlDsV", "PlUsG", "PlUsV"], // and those a carrying platform never shows
  lift_platform: ["PlD0G", "PlD0V", "PlPyG", "PlPyV"], // and those a lift platform never shows
  moving_platform: ["PlD0G", "PlD0V", "PlUyG", "PlUyV"], // slippery climb's other platforms' models, which a moving platform never shows
  tall_thin_gate: BOULDER_DASH_NON_GATE_MODELS.flatMap((model) => [`${model}G`, `${model}V`]),
  low_wide_gate: BOULDER_DASH_NON_GATE_MODELS.flatMap((model) => [`${model}G`, `${model}V`]),
  barrel_roller: ["WateC"],
  mossy_slide: [...GATE_OBJECT_MODELS.flatMap((model) => [`${model}G`, `${model}V`]), GATE_OBJECTS_PAGE],
  walking_lizard: RUINS_OBJECT_MODELS.flatMap((model) => [`${model}G`, `${model}V`]),
};

// models that come with end caps (see endCaps.ts), and the animation whose first
// frame has their vertices: toxic waste's barrels are open tubes, as the game
// only shows them rolling straight at the camera, but custom levels' don't
const ENEMY_CAPPED_MODELS: Partial<Record<ObjectType, [model: string, animation: string][]>> = {
  barrel_roller: [["BaV7G", "BaV7V"], ["BaD7G", "BaD7V"]],
};

// the entries an object needs crash's code (WillC) to name, where the base
// level's crash has only a placeholder: which item of it, where in it, and
// the donor's entry to put there. the lab's walking lab assistant's spark
// shocks crash (WS10V), and reads its model's vertices: without it, spinning
// him as he sparks would look up a model the level hasn't, and crash the
// game. the great gate's fire pit sets him alight: his code opens his burning
// animations, model and sounds from its constants (from 0x80), and plays the
// animations from his animations item (from 0x90, each 8 bytes). jungle
// rollers' name entries no level has, and the game crashes looking them up
const CRASH_BURNING = ["WF10V", "WF10G", "BDC0A", "BLI0A", "WF20V", "BDA0A", "WF30V", "WF40V", "WF50V"];
const CRASH_BURNING_AT = 0x80;
const CRASH_BURNING_ANIMATIONS = ["WF10V", "WF20V", "WF30V", "WF40V", "WF50V"];
const CRASH_BURNING_ANIMATIONS_AT = 0x90;
const ANIMATION_BYTES = 8;
const crashBurning = [
  ...CRASH_BURNING.map((name, index) => ({ item: CRASH_CONSTANTS, at: CRASH_BURNING_AT + 4 * index, name })),
  ...CRASH_BURNING_ANIMATIONS.map((name, index) => ({ item: CRASH_ANIMATIONS, at: CRASH_BURNING_ANIMATIONS_AT + ANIMATION_BYTES * index + ANIMATION_EID, name })),
];
const OBJECT_CRASH_ENTRIES: Partial<Record<ObjectType, { item: number; at: number; name: string }[]>> = {
  electric_scientist: [{ item: CRASH_ANIMATIONS, at: 72 + ANIMATION_EID, name: "WS10V" }],
  fire_pit: crashBurning,
  steam_vent: crashBurning, // castle machinery's steam burns him as the great gate's flames do
  floor_fire: crashBurning, // and sunset vista's fire
  steady_fire: crashBurning,
};

// object with the entries it needs crash's code to name (OBJECT_CRASH_ENTRIES),
// what they use, and their sounds, but not their texture pages: crash's own, which the level has
function withCrashEntries(type: ObjectType, object: DonorObject, level: Level): DonorObject {
  const named = OBJECT_CRASH_ENTRIES[type] ?? [];
  if (named.length === 0) {
    return object;
  }
  const crashEntries = named.map(({ item, at, name }) => ({ item, at, eid: stringToEid(name) }));
  const used = reachableEids(level, crashEntries.map(({ eid }) => eid));
  const entries = [...object.entries, ...entriesInPages(level, PAGE_ENTRIES, used)];
  const sounds = [...object.sounds, ...entriesInPages(level, PAGE_SOUNDS, used)];
  return { ...object, entries, sounds, crashEntries };
}

// models drawn from both sides (see bothSides.ts): the great gate's fire pit's
// bowl (WT1iG), open at its top, which close up was see-through. every great
// gate object that brings it changes it the same, or the two would clash
const GATE_BOTH_SIDED_MODELS = ["WT1iG"];
// temple ruins' slamming walls' halves (RcLsG, RcRsG), which have faces on
// three sides only (its walls are set in its corridor's), see-through from the
// rest: the ruins objects' code (RuiOC) brings them for its bats too
const RUINS_BOTH_SIDED_MODELS = ["RcLsG", "RcRsG"];
const OBJECT_BOTH_SIDED_MODELS: Partial<Record<ObjectType, string[]>> = {
  slamming_walls: RUINS_BOTH_SIDED_MODELS,
  rotating_pegs: RUINS_BOTH_SIDED_MODELS, // its code is the slamming walls', the same
  bat: RUINS_BOTH_SIDED_MODELS,
  floor_fire: RUINS_BOTH_SIDED_MODELS, // the bats' code, changed the same
  steady_fire: RUINS_BOTH_SIDED_MODELS,
  leader_bats: RUINS_BOTH_SIDED_MODELS,
  wooden_peg: GATE_BOTH_SIDED_MODELS,
  rising_spiked_log: GATE_BOTH_SIDED_MODELS,
  falling_spiked_log: GATE_BOTH_SIDED_MODELS,
  fire_pit: GATE_BOTH_SIDED_MODELS,
};

// object with its models in OBJECT_BOTH_SIDED_MODELS drawn from both sides
function withBothSidedModels(type: ObjectType, object: DonorObject): DonorObject {
  const names = (OBJECT_BOTH_SIDED_MODELS[type] ?? []).map(stringToEid);
  return { ...object, entries: object.entries.map((entry) => bothSidedIfNamed(entry, names)) };
}

// entry drawn from both sides if it's one of names
function bothSidedIfNamed(entry: Entry, names: number[]): Entry {
  if (!names.includes(entry.eid)) {
    return entry;
  }
  return withBothSidesDrawn(entry);
}

// object with its model named model capped at its ends, as animation's first
// frame has it (if the object has that model)
function withCappedModel(object: DonorObject, [model, animation]: [string, string]): DonorObject {
  const entryNamed = (name: string) => object.entries.find(({ eid }) => eid === stringToEid(name));
  const [modelEntry, animationEntry] = [entryNamed(model), entryNamed(animation)];
  if (!modelEntry) {
    return object;
  }
  if (!animationEntry) {
    throw new Error(`${animation} should come with ${model}, to cap its ends`);
  }
  const capped = withEndCaps(modelEntry, animationEntry.items[0]);
  return { ...object, entries: object.entries.map((entry) => (entry === modelEntry ? capped : entry)) };
}

// a branch (BRA) from instruction from to instruction to, which goes up to 512 either way
function branch(from: number, to: number): number {
  const BRA = 0x82094000;
  return (BRA | ((to - (from + 1)) & 0x3ff)) >>> 0;
}

// instructions added after the end of an enemy's code, for its patches to
// branch out to: the code's length (which they need it to be) and the instructions
interface CodeAddition {
  after: number;
  instructions: number[];
}

// the lost city's lizards (LizaC) leap and hop along their path's points, but
// only ever set their x (the lost city's paths all run along x); their z keeps
// within 1 m of a line where they started (obj[0x188]), drifting in the air
// towards crash's. so they follow a custom level's path however it runs, each
// frame of a green one's leap sets its z as it does its x and moves its line
// there, and a red one's hop moves its line (it still drifts towards crash)
const LIZARD_CODE_LENGTH = 0x20c;
const GREEN_LEAP_SETS_X = 0x55;
const RED_HOP_SETS_X = 0xa6;
const GREEN_LEAP_Z = LIZARD_CODE_LENGTH;     // the instructions added for each, after the code's end
const RED_HOP_Z = LIZARD_CODE_LENGTH + 9;
const MOVE_TO_X = 0x11e1fe08;                // MOVE pop(), obj[0x80]: its x, as the code sets it

// boulder dash's gates (JunOC subtypes 13 to 18, state 10) only looked at what
// hit them (crash walking into one knocks it over) while its boulder was about
// (global 3, which the boulder sets): custom levels have none, so they never
// fell. that wait is always met; with no boulder they skip to what hit them
const GATE_CODE_PATCHES: CodePatch[] = [
  { at: 0x26b, was: 0x1fbe0803, now: 0x11801e1f }, // GLBR 3 (the boulder) becomes MOVE 0x100, push(): there
];

const CHILD_TYPE_BITS = 0x3f << 12; // a CHLD's type: bits 12 to 17

// a CHLD spawning its child of another type
function childSpawnedAs(at: number, was: number, type: number): CodePatch {
  return { at, was, now: ((was & ~CHILD_TYPE_BITS) | (type << 12)) >>> 0 };
}

// temple ruins' RuiOC spawns its pieces of its own type (42 there): moved to the
// walls' slot (see MOVED_ENEMY_CODE), they're spawned of that one instead
const RUINS_OWN_CHILDREN: [number, number][] = [
  [0x08a, 0x8a72a081], [0x18b, 0x8a82a401], [0x190, 0x8a82a401], [0x195, 0x8a82a401],
  [0x19b, 0x8a82a281], [0x1a0, 0x8a82a281], [0x1a5, 0x8a82a281], [0x2c9, 0x8a02a481], [0x3c4, 0x8a22a2c1],
];
const SLAMMING_WALL_CODE_PATCHES: CodePatch[] = RUINS_OWN_CHILDREN.map(([at, was]) => childSpawnedAs(at, was, objectEntity("slamming_walls")[0]));

// road to nowhere's planks' code's spawn of its own kind (its s7's), by its
// slot there (23), which moves (see MOVED_ENEMY_CODE)
const PLANK_OWN_CHILD: [number, number] = [0x106, 0x8a1171c1];
// and its timed plank (s1, state 3) breaking as soon as crash is over its middle
// (its status_a's 0x1000, which GoolCollide in src/gool.c sets while he's
// inside its bound less its hotspot, and he's its collider): its break (CSNZ
// state 1) branches to PLANK_CODE_ADDITION instead, which waits its delay first
const PLANK_CODE_LENGTH = 0x163;
const PLANK_BREAK_AT = 0x8e;
const PLANK_CODE_PATCHES: CodePatch[] = [
  childSpawnedAs(...PLANK_OWN_CHILD, objectEntity("timed_plank")[0]),
  { at: PLANK_BREAK_AT, was: 0x8257c001, now: branch(PLANK_BREAK_AT, PLANK_CODE_LENGTH) }, // CSNZ self[0xdc], 1 → BRA to the addition
];

// the timed plank's break, its condition (crash over its middle) on the stack:
// the first time, its frame count (obj[0xfc]) is kept in obj[0x16c] (s1 never
// uses it), and it breaks once 0x100 times the frames since reach its init
// flag A (obj[0xbc], in 256ths): its delay. GOOL's "OP a, b" works out b OP a
const PLANK_CODE_ADDITION: CodeAddition = {
  after: PLANK_CODE_LENGTH,
  instructions: [
    0x8227c003, // BEQZ self[0xdc], 3: crash isn't over its middle
    0x11e43e1f, // MOVE obj[0x16c], push(): its timer's start
    0x8217c001, // BNEZ self[0xdc], 1: started already
    0x11e27e43, // MOVE obj[0xfc], obj[0x16c]: start it now
    0x11e43e1f, // MOVE obj[0x16c], push()
    0x8227c004, // BEQZ self[0xdc], 4: not started: return
    0x01e43e27, // SUB obj[0x16c], obj[0xfc]: the frames since
    0x02801e1f, // MULT 0x100, pop(): in 256ths, as its flags are
    0x0ce17e1f, // SGE obj[0xbc], pop(): its delay's up
    0x8257c001, // CSNZ self[0xdc], 1: break
    0x82894000, // RET
  ],
};

// sunset vista's ruins objects' code (RuiOC: its bats', and its floor fire's,
// s4, whose flames are its s10s), its flames timed by their fire's flags:
// - a burst (state 7) holds at full height while a count, adding 0x100 a frame,
//   stays under 0x4000 (about 2 s): it takes its fire's (its parent's) init
//   flag C from the count instead, -1 as the game's, 0 for good (FIRE_HOLDS
//   in makeMap.ts). the game's fires have flag C 0, but only custom levels have this code
// - a flame bursts once its wait is up and crash is within its obj[0x1e0] (its
//   fire's flag A x 4; about 11 m without): it bursts on its timer wherever he is
// - its timer starts as if its wait (obj[0x1e4]) were up: it starts obj[0x1e0]
//   frames into it instead, so a fire's flag A puts its first burst off (fireStart)
const FIRE_START_AT = 0x1b8;
const FIRE_NEAR_CRASH_AT = 0x1df;
const FIRE_HOLD_COUNT_AT = 0x25b;
const SUNSET_RUINS_CODE_PATCHES: CodePatch[] = [
  { at: FIRE_START_AT, was: 0x01e61e27, now: 0x01e60e27 }, // SUB obj[0x1e4], obj[0xfc] → SUB obj[0x1e0], obj[0xfc]
  { at: FIRE_NEAR_CRASH_AT, was: 0x09e60e1f, now: 0x0c800e1f }, // SLT obj[0x1e0], pop() → SGE 0, pop(): always
  { at: FIRE_HOLD_COUNT_AT, was: 0x00801b04, now: 0x01c59b04 }, // ADD 0x100, 0x10($fp) → SUB parent[0xc4], 0x10($fp)
];

const LIZARD_CODE_PATCHES: CodePatch[] = [
  { at: GREEN_LEAP_SETS_X, was: MOVE_TO_X, now: branch(GREEN_LEAP_SETS_X, GREEN_LEAP_Z) },
  { at: RED_HOP_SETS_X, was: MOVE_TO_X, now: branch(RED_HOP_SETS_X, RED_HOP_Z) },
];

// a leap's frame: start x, z at 0xc($fp), 0x10; its target point at 0x14 (x), 0x18, 0x1c (z); its frame at
// 0x20 (in 256ths). a hop's has one more word first, so each is 4 on. x is start x + (target x - start x) ×
// frame / ireg[0x34] (its frames); the same for z
const LIZARD_CODE_ADDITION: CodeAddition = {
  after: LIZARD_CODE_LENGTH,
  instructions: [
    MOVE_TO_X,  // a green lizard's leap: its x, as the code set it
    0x01b04b07, // SUB 0x10($fp), 0x1c($fp): target z less start z
    0x1500cb08, // SHA ireg[0x30], 0x20($fp): the leap's frame
    0x02e1fe1f, // MULT pop(), pop()
    0x0300de1f, // DIV ireg[0x34], pop(): over its frames
    0x00e1fb04, // ADD pop(), 0x10($fp): from start z
    0x11e1fe0a, // MOVE pop(), obj[0x88]: its z
    0x11e0ae4a, // MOVE obj[0x88], obj[0x188]: the line its z keeps near
    branch(GREEN_LEAP_Z + 8, GREEN_LEAP_SETS_X + 1),
    MOVE_TO_X,  // a red lizard's hop: its x, as the code set it
    0x01b05b08, // SUB 0x14($fp), 0x20($fp): target z less start z
    0x1500cb09, // SHA ireg[0x30], 0x24($fp): the hop's frame
    0x02e1fe1f, // MULT pop(), pop()
    0x0300de1f, // DIV ireg[0x34], pop(): over its frames
    0x00e1fb05, // ADD pop(), 0x14($fp): from start z
    0x11e1fe4a, // MOVE pop(), obj[0x188]: the line its z keeps near
    branch(RED_HOP_Z + 7, RED_HOP_SETS_X + 1),
  ],
};

const ENEMY_CODE_ADDITIONS: Partial<Record<ObjectType, CodeAddition>> = {
  lizard: LIZARD_CODE_ADDITION,
  red_lizard: LIZARD_CODE_ADDITION,
  timed_plank: PLANK_CODE_ADDITION, // the same for every plank, as they share the code
  breaking_plank: PLANK_CODE_ADDITION,
};

// toxic waste's barrels (BaraC) stop flattening crash 5 points short of their
// path's end, where they fall off the walkway's end there. a custom level's
// trail ends on the floor, its points spaced out by its speed, so that left
// its last stretch harmless (about 10 m of acid_cave's): now they flatten him
// all the way to the end
const BARREL_CODE_PATCHES: CodePatch[] = [
  { at: 0x2f, was: 0x01805e2e, now: 0x01800e2e }, // SUB 0x500, obj[0x118] becomes SUB 0, obj[0x118]: its path's whole length
];

// the code each enemy spawns by its exec slot, changed to suit custom levels
// the great gate's fire pit (WalOC subtype 5) spawns its flame (subtype 6),
// which timed itself by its own init flags (A how often, B how far in) if it
// had them, else every 120 frames: a spawned object hasn't, so every fire pit
// flamed at once. it reads its parent's (the pit's) instead, always: the
// builder gives every fire pit them. shared by all the great gate's objects'
// code, as its data patches are
const GATE_OBJECTS_CODE_PATCHES: CodePatch[] = [
  { at: 0x203, was: 0x8225c003, now: 0x82094000 }, // BEQZ self[0xbc] (no flag a: the default) becomes BRA 0
  { at: 0x204, was: 0x15017e17, now: 0x15017c57 }, // SHA ireg[0x5c], obj[0xbc] becomes parent[0xbc]
  { at: 0x208, was: 0x82260003, now: 0x82094000 }, // BEQZ self[0xc0] (no flag b: 0) becomes BRA 0
  { at: 0x209, was: 0x15017e18, now: 0x15017c58 }, // SHA ireg[0x5c], obj[0xc0] becomes parent[0xc0]
];

const ENEMY_CHILD_CODE_PATCHES: Partial<Record<ObjectType, [slot: number, patches: CodePatch[]][]>> = {
  barrel_roller: [[16, BARREL_CODE_PATCHES]],
};

const ENEMY_CODE_PATCHES: Partial<Record<ObjectType, CodePatch[]>> = {
  native: NATIVE_CODE_PATCHES,
  blue_river_plant: RIVER_CODE_PATCHES,
  green_river_plant: RIVER_CODE_PATCHES,
  fish: RIVER_CODE_PATCHES,
  lily_pad: RIVER_CODE_PATCHES, // river objects too, sharing the code: it mustn't differ from theirs
  leaf: RIVER_CODE_PATCHES,
  lab_assistant: LAB_ASSISTANT_CODE_PATCHES,
  gunman: GUNMAN_CODE_PATCHES,
  lizard: LIZARD_CODE_PATCHES,
  red_lizard: LIZARD_CODE_PATCHES,
  tall_thin_gate: GATE_CODE_PATCHES, // boulder dash's objects, sharing the code
  low_wide_gate: GATE_CODE_PATCHES,
  wooden_peg: GATE_OBJECTS_CODE_PATCHES, // the great gate's objects, sharing the code
  mossy_slide: GATE_OBJECTS_CODE_PATCHES,
  rising_spiked_log: GATE_OBJECTS_CODE_PATCHES,
  falling_spiked_log: GATE_OBJECTS_CODE_PATCHES,
  fire_pit: GATE_OBJECTS_CODE_PATCHES,
  slamming_walls: SLAMMING_WALL_CODE_PATCHES,
  bat: SUNSET_RUINS_CODE_PATCHES, // every object that brings sunset vista's RuiOC changes it the same
  leader_bats: SUNSET_RUINS_CODE_PATCHES,
  floor_fire: SUNSET_RUINS_CODE_PATCHES,
  steady_fire: SUNSET_RUINS_CODE_PATCHES,
  rotating_pegs: SLAMMING_WALL_CODE_PATCHES, // their code, moved the same
  timed_plank: PLANK_CODE_PATCHES, // the same for every plank, as they share the code
  breaking_plank: PLANK_CODE_PATCHES,
};

// instructions with an addition after their end; an error if they aren't as long as it needs
function withAddedInstructions(type: ObjectType, instructions: Buffer, addition: CodeAddition): Buffer {
  if (instructions.length !== addition.after * 4) {
    throw new Error(`the ${objectName(type)}'s code isn't as long as expected, so it can't be changed to suit custom levels`);
  }
  const added = Buffer.alloc(addition.instructions.length * 4);
  addition.instructions.forEach((instruction, index) => added.writeUInt32LE(instruction, index * 4));
  return Buffer.concat([instructions, added]);
}

// one word of an object's code's data (its constants) changed, as CodePatch
// is an instruction: the great gate's mossy slide carries crash along while
// the floor he's on is within 1600 units under its line or 1200 over it,
// wherever he is across the map (its code checks only the height), which in
// a custom level took in other floors near it. narrowed to 320 each way (0.8 m
// at scale 400): the slope's floor, not those under or over it. the wood
// platform has the same code (WalOC), so it's changed the same, or the two would clash
const GATE_OBJECTS_DATA_PATCHES: CodePatch[] = [
  { at: 0xcc / 4, was: 0x64000, now: 0x14000 }, // under its line (8 bits of fraction)
  { at: 0xd0 / 4, was: 0x4b000, now: 0x14000 }, // over it
];

const OBJECT_DATA_PATCHES: Partial<Record<ObjectType, CodePatch[]>> = {
  mossy_slide: GATE_OBJECTS_DATA_PATCHES,
  wooden_peg: GATE_OBJECTS_DATA_PATCHES,
  rising_spiked_log: GATE_OBJECTS_DATA_PATCHES,
  falling_spiked_log: GATE_OBJECTS_DATA_PATCHES,
  fire_pit: GATE_OBJECTS_DATA_PATCHES,
};

// instructions patched, with the enemy's addition (if it has one) after their end
function changedInstructions(type: ObjectType, instructions: Buffer, patches: CodePatch[]): Buffer {
  const patched = patchedInstructions(type, instructions, patches);
  const addition = ENEMY_CODE_ADDITIONS[type];
  if (!addition) {
    return patched;
  }
  return withAddedInstructions(type, patched, addition);
}

// instructions (or data words, what) with patches made; an error if one isn't what the patch expects
function patchedInstructions(type: ObjectType, instructions: Buffer, patches: CodePatch[], what = "instruction"): Buffer {
  const patched = Buffer.from(instructions);
  for (const { at, was, now } of patches) {
    if (at * 4 + 4 > patched.length || patched.readUInt32LE(at * 4) !== was) {
      throw new Error(`the ${objectName(type)}'s code isn't as expected at ${what} ${at.toString(16)}, so it can't be changed to suit custom levels`);
    }
    patched.writeUInt32LE(now, at * 4);
  }
  return patched;
}

// object with its code (code, an eid) patched (its instructions, or another item), the rest as it was
function withPatchedCode(object: DonorObject, code: number, change: (instructions: Buffer) => Buffer, patchedItem = CODE_ITEM): DonorObject {
  const patchEntry = (entry: Entry): Entry => {
    const items = entry.items.map((item, index) => (index === patchedItem ? change(item) : item));
    return { ...entry, items };
  };
  return { ...object, entries: object.entries.map((entry) => (entry.eid === code ? patchEntry(entry) : entry)) };
}

// object with the code it spawns by exec slot patched, as level has it in those slots
function withPatchedChildCode(type: ObjectType, object: DonorObject, level: Level): DonorObject {
  const childPatches = ENEMY_CHILD_CODE_PATCHES[type] ?? [];
  return childPatches.reduce(
    (patched, [slot, patches]) => withPatchedCode(patched, level.nsd.ldat.execMap[slot], (instructions) => patchedInstructions(type, instructions, patches)),
    object,
  );
}

// object with its own code (in slot, as level has it) patched and added to, if the enemy has patches
function withPatchedOwnCode(type: ObjectType, object: DonorObject, level: Level, slot: number): DonorObject {
  const patches = ENEMY_CODE_PATCHES[type];
  if (!patches) {
    return object;
  }
  return withPatchedCode(object, level.nsd.ldat.execMap[slot], (instructions) => changedInstructions(type, instructions, patches));
}

// object with its own code's data (in slot, as level has it) patched, if the object has patches
function withPatchedOwnData(type: ObjectType, object: DonorObject, level: Level, slot: number): DonorObject {
  const patches = OBJECT_DATA_PATCHES[type];
  if (!patches) {
    return object;
  }
  return withPatchedCode(object, level.nsd.ldat.execMap[slot], (data) => patchedInstructions(type, data, patches, "data word"), CODE_DATA);
}

// a kind of enemy's object from the level it's taken from, its code changed to
// suit custom levels, and moved to its own exec slot if it has one there
function objectDonorObject(type: ObjectType, level: Level): DonorObject {
  const moved = MOVED_ENEMY_CODE[type];
  const slot = moved?.donorSlot ?? objectEntity(type)[0];
  const leftOut = (ENEMY_UNUSED_ENTRIES[type] ?? []).map(stringToEid);
  const object = donorObject(level, slot, ENEMY_CHILD_SLOTS[type] ?? [], leftOut);
  const capped = withBothSidedModels(type, (ENEMY_CAPPED_MODELS[type] ?? []).reduce(withCappedModel, withCrashEntries(type, object, level)));
  const patched = withPatchedOwnData(type, withPatchedOwnCode(type, withPatchedChildCode(type, capped, level), level, slot), level, slot);
  if (!moved) {
    return patched;
  }
  return withChildCodeMoved(type, withCodeMoved(patched, slot, objectEntity(type)[0], stringToEid(moved.name)), slot);
}

const SPAWN_OPCODES = [0x8a, 0x91]; // CHLD: its exec slot in bits 12-19

// an instruction spawning from a moved exec slot made to spawn from where it moved to
function withSpawnSlotMoved(instruction: number, moves: Map<number, number>): number {
  if (!SPAWN_OPCODES.includes(instruction >>> 24)) {
    return instruction;
  }
  const to = moves.get((instruction >>> 12) & 0xff);
  if (to === undefined) {
    return instruction;
  }
  return ((instruction & ~(0xff << 12)) | (to << 12)) >>> 0;
}

// object with each of its pieces of code spawning from moved exec slots where they moved to
function withSpawnSlotsMoved(object: DonorObject, moves: Map<number, number>): DonorObject {
  const codeEids = new Set(object.code.map(([, eid]) => eid));
  const moveSpawns = (entry: Entry): Entry => {
    const instructions = Buffer.from(entry.items[CODE_ITEM]);
    for (let at = 0; at < instructions.length; at += 4) {
      instructions.writeUInt32LE(withSpawnSlotMoved(instructions.readUInt32LE(at), moves), at);
    }
    return { ...entry, items: entry.items.map((item, index) => (index === CODE_ITEM ? instructions : item)) };
  };
  return { ...object, entries: object.entries.map((entry) => (codeEids.has(entry.eid) ? moveSpawns(entry) : entry)) };
}

// object (its own code moved from donorSlot) with the code it spawns moved too
// (MOVED_CHILD_CODE), and its code spawning from where each moved to
function withChildCodeMoved(type: ObjectType, object: DonorObject, donorSlot: number): DonorObject {
  const childMoves = MOVED_CHILD_CODE[type] ?? [];
  if (childMoves.length === 0) {
    return object;
  }
  const moved = childMoves.reduce((withMoved, { from, to, name }) => withCodeMoved(withMoved, from, to, stringToEid(name)), object);
  const moves = new Map([[donorSlot, objectEntity(type)[0]], ...childMoves.map(({ from, to }): [number, number] => [from, to])]);
  return withSpawnSlotsMoved(moved, moves);
}

// each kind of enemy's object, from the level it's taken from
export const objectDonorObjects = (levels: Map<ObjectType, Level>): DonorObject[] =>
  [...levels].map(([type, level]) => objectDonorObject(type, level));
