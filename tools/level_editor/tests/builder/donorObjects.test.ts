import { describe, expect, test } from "vitest";
import { donorObject, enemyDonorObjects, withCodeMoved, withDonorObjects, type DonorObject } from "../../builder/donorObjects";
import { EID_NONE, stringToEid } from "../../builder/entryIds";
import { ENEMY_ENTITIES } from "../../builder/entities";
import { entriesById, entryPage, PAGE_ENTRIES, PAGE_SOUNDS, PAGE_TEXTURE, readNsd, soundPage, texturePage, type Entry, type Level } from "../../builder/levelFiles";
import { nsdData, texturePageData, words } from "./levelFiles";

const CRAB = stringToEid("CrabC");
const SPLASH = stringToEid("SplaC");
const BEACH = stringToEid("BeaOC");
const MODEL = stringToEid("Cr19G");
const ANIMATION = stringToEid("Cr19V");
const TEX = stringToEid("Ju49T");
const SOUND = stringToEid("CC19A");
const OTHER_SOUND = stringToEid("yip0A");
const ZONE = stringToEid("a5_9Z");
const text = (value: string) => Buffer.from(value, "latin1");
const entry = (eid: number, type: number, items: Buffer[]): Entry => ({ eid, type, items });

const CRAB_SLOT = 31;
const SPLASH_SLOT = 40;

// the crab's code uses its model, animation and sound, and spawns a splash
// (another object, by its code's eid); the model uses a texture page. the
// beach object and another sound are in the level but the crab doesn't use them
function donorLevel(): Level {
  const execMap: number[] = [];
  execMap[CRAB_SLOT] = CRAB;
  execMap[SPLASH_SLOT] = SPLASH;
  execMap[27] = BEACH;
  const pages = [
    entryPage([
      entry(CRAB, 11, [text("head"), words(MODEL, ANIMATION, SOUND, SPLASH)]),
      entry(MODEL, 2, [words(TEX)]),
      entry(ANIMATION, 1, [text("frames")]),
      entry(SPLASH, 11, [text("splash")]),
      entry(BEACH, 11, [text("beach")]),
    ]),
    soundPage([entry(OTHER_SOUND, 12, [text("yip")]), entry(SOUND, 12, [text("snip")])]),
    texturePage(TEX, texturePageData(TEX)),
  ];
  return { nsd: readNsd(nsdData([], 9, ZONE, execMap)), pages };
}

const eids = (entries: Entry[]) => new Set(entries.map(({ eid }) => eid));

describe("an object from another level (its donor)", () => {
  test("its entries are its code and what that uses, and nothing else", () => {
    expect(eids(donorObject(donorLevel(), CRAB_SLOT).entries)).toEqual(new Set([CRAB, MODEL, ANIMATION, SPLASH]));
  });

  test("its sounds are the sounds it uses, not the rest of their page", () => {
    expect(eids(donorObject(donorLevel(), CRAB_SLOT).sounds)).toEqual(new Set([SOUND]));
  });

  test("its texture pages are the ones its models use", () => {
    expect(donorObject(donorLevel(), CRAB_SLOT).texturePages.map(({ eid }) => eid)).toEqual([TEX]);
  });

  test("its code is in the donor's exec slots: its own and any object it spawns", () => {
    expect(new Map(donorObject(donorLevel(), CRAB_SLOT).code)).toEqual(new Map([[CRAB_SLOT, CRAB], [SPLASH_SLOT, SPLASH]]));
  });

  test("it brings the code of objects it spawns by exec slot, into those slots", () => {
    // child slots, and what that code uses
    const object = donorObject(donorLevel(), CRAB_SLOT, [27]);
    expect(new Map(object.code)).toEqual(new Map([[CRAB_SLOT, CRAB], [SPLASH_SLOT, SPLASH], [27, BEACH]]));
    expect(eids(object.entries)).toEqual(new Set([CRAB, MODEL, ANIMATION, SPLASH, BEACH]));
  });

  test("a child slot the donor has no code in is an error", () => {
    expect(() => donorObject(donorLevel(), CRAB_SLOT, [5])).toThrow(/slot 5/);
  });

  test("a slot the donor has no code in is an error", () => {
    expect(() => donorObject(donorLevel(), 50)).toThrow(/slot 50/);
  });
});

describe("moving an object's code to another exec slot", () => {
  const MOVED_SLOT = 50;
  const MOVED = stringToEid("CrbMC");
  const CRAB_HEADER = words(CRAB_SLOT, 0x300);

  // the crab's code with a header as the game's: its exec slot first
  function crabWithHeader(): DonorObject {
    const execMap: number[] = [];
    execMap[CRAB_SLOT] = CRAB;
    const pages = [entryPage([entry(CRAB, 11, [CRAB_HEADER, words(MODEL)]), entry(MODEL, 2, [text("model")])])];
    return donorObject({ nsd: readNsd(nsdData([], 9, ZONE, execMap)), pages }, CRAB_SLOT);
  }
  const moved = () => withCodeMoved(crabWithHeader(), CRAB_SLOT, MOVED_SLOT, MOVED);
  const movedCode = () => moved().entries.find(({ eid }) => eid === MOVED)!;

  test("its code is in the new slot under its new name", () => {
    expect(moved().code).toEqual([[MOVED_SLOT, MOVED]]);
    expect(eids(moved().entries)).toEqual(new Set([MOVED, MODEL]));
  });

  test("its code's header names the new slot", () => {
    expect(movedCode().items[0]).toEqual(words(MOVED_SLOT, 0x300));
  });

  test("the rest of its code is as it was", () => {
    expect(movedCode().items[1]).toEqual(words(MODEL));
  });

  test("moving code from a slot the object has none in is an error", () => {
    expect(() => withCodeMoved(crabWithHeader(), 7, MOVED_SLOT, MOVED)).toThrow(/slot 7/);
  });
});

const WILLC = stringToEid("WillC");
const BASE_SOUND = stringToEid("fli0A");

// the level custom levels are cut from: crash's code, which plays a sound
function baseLevel(): Level {
  const pages = [
    entryPage([entry(WILLC, 11, [text("crash"), words(BASE_SOUND)])]),
    soundPage([entry(BASE_SOUND, 12, [text("flip")])]),
  ];
  return { nsd: readNsd(nsdData([], 0xc, ZONE, [WILLC])), pages };
}

const pagesOfType = (level: Level, type: number) => level.pages.filter((page) => page.type === type);

describe("adding objects from other levels to a level", () => {
  const crab = () => donorObject(donorLevel(), CRAB_SLOT);

  test("their entries go in entry pages", () => {
    const added = withDonorObjects(baseLevel(), [crab()]);
    const inEntryPages = new Set(pagesOfType(added, PAGE_ENTRIES).flatMap((page) => page.entries.map(({ eid }) => eid)));
    expect(inEntryPages).toEqual(new Set([WILLC, CRAB, MODEL, ANIMATION, SPLASH]));
  });

  test("their sounds go in a sound page of their own", () => {
    const soundPages = pagesOfType(withDonorObjects(baseLevel(), [crab()]), PAGE_SOUNDS);
    expect(soundPages.map((page) => page.entries.map(({ eid }) => eid))).toEqual([[BASE_SOUND], [SOUND]]);
  });

  test("their texture pages are added", () => {
    expect(pagesOfType(withDonorObjects(baseLevel(), [crab()]), PAGE_TEXTURE).map(({ eid }) => eid)).toEqual([TEX]);
  });

  test("their code goes in its exec slots", () => {
    const { execMap } = withDonorObjects(baseLevel(), [crab()]).nsd.ldat;
    expect([execMap[0], execMap[CRAB_SLOT], execMap[SPLASH_SLOT], execMap[27]]).toEqual([WILLC, CRAB, SPLASH, EID_NONE]);
  });

  test("it leaves the level it was given as it was", () => {
    const level = baseLevel();
    withDonorObjects(level, [crab()]);
    expect([level.pages.length, level.nsd.ldat.execMap[CRAB_SLOT]]).toEqual([2, EID_NONE]);
  });

  test("an entry the level already has, the same, isn't added again", () => {
    const sharing = donorObject(donorLevel(), CRAB_SLOT);
    sharing.sounds.push(entry(BASE_SOUND, 12, [text("flip")]));
    const added = withDonorObjects(baseLevel(), [sharing, crab()]);
    const everyEid = added.pages.flatMap((page) => (page.type === PAGE_TEXTURE ? [page.eid] : page.entries.map(({ eid }) => eid)));
    expect(everyEid.length).toBe(new Set(everyEid).size);
    expect(entriesById(added).get(BASE_SOUND)!.items).toEqual([text("flip")]);
  });

  test("an entry the level already has, different, is an error naming it", () => {
    const clashing = donorObject(donorLevel(), CRAB_SLOT);
    clashing.sounds.push(entry(BASE_SOUND, 12, [text("another flip")]));
    expect(() => withDonorObjects(baseLevel(), [clashing])).toThrow(/fli0A/);
  });

  test("an exec slot the level already uses for other code is an error naming it", () => {
    const taken = donorObject(donorLevel(), CRAB_SLOT);
    taken.code.push([0, CRAB]);
    expect(() => withDonorObjects(baseLevel(), [taken])).toThrow(/slot 0/);
  });
});

const NATIVE = stringToEid("SheNC");
const NATIVE_SLOT = 38;
const PICK_START = 0x19; // where the great gate's native code picks the end it starts from
const PICK_WALK_BACK = 0x2d; // and the end it walks back to
const BEQZ_2 = 0x8227c002;
const BEQZ_3 = 0x8227c003;
const BRA_0_DROP_1 = 0x82094400;
const BRA_3_DROP_1 = 0x82094403;

// native code as the great gate's: other instructions (1s), with its picks at their places
function nativeCode(startPick = BEQZ_2, walkBackPick = BEQZ_3): number[] {
  const code = Array<number>(0x30).fill(1);
  code[PICK_START] = startPick;
  code[PICK_WALK_BACK] = walkBackPick;
  return code;
}

function nativeDonorLevel(code: number[]): Level {
  const execMap: number[] = [];
  execMap[NATIVE_SLOT] = NATIVE;
  execMap[CRAB_SLOT] = CRAB;
  const pages = [entryPage([entry(NATIVE, 11, [text("head"), words(...code), text("data")]), entry(CRAB, 11, [text("head"), words(...nativeCode())])])];
  return { nsd: readNsd(nsdData([], 0x12, ZONE, execMap)), pages };
}

const codeOf = (objects: DonorObject[], eid: number) => {
  const items = objects.flatMap((object) => object.entries).find((found) => found.eid === eid)!.items;
  return Array.from({ length: items[1].length / 4 }, (_, index) => items[1].readUInt32LE(index * 4));
};

describe("enemies' code from other levels", () => {
  test("a native from the great gate starts at its path's first node and walks back there", () => {
    // not to the end nearest crash: each pick branches past the other end, dropping its comparison
    const code = codeOf(enemyDonorObjects(new Map([["native", nativeDonorLevel(nativeCode())]])), NATIVE);
    expect(code).toEqual(nativeCode(BRA_0_DROP_1, BRA_3_DROP_1));
  });

  test("a native's code keeps its other items", () => {
    const items = enemyDonorObjects(new Map([["native", nativeDonorLevel(nativeCode())]]))[0].entries[0].items;
    expect([items[0], items[2]]).toEqual([text("head"), text("data")]);
  });

  test("patching a native's code leaves its donor level's code alone", () => {
    const level = nativeDonorLevel(nativeCode());
    enemyDonorObjects(new Map([["native", level]]));
    expect(codeOf([donorObject(level, NATIVE_SLOT)], NATIVE)).toEqual(nativeCode());
  });

  test("other enemies' code isn't patched", () => {
    const code = codeOf(enemyDonorObjects(new Map([["crab", nativeDonorLevel(nativeCode())]])), CRAB);
    expect(code).toEqual(nativeCode());
  });

  test("a native's code that can't be patched is an error", () => {
    // code that isn't as the great gate's
    const level = nativeDonorLevel(nativeCode(1));
    expect(() => enemyDonorObjects(new Map([["native", level]]))).toThrow(/native/);
  });
});

// a level whose only object is one piece of code, in its exec slot
function oneCodeLevel(lid: number, slot: number, eid: number, code: number[]): Level {
  const execMap: number[] = [];
  execMap[slot] = eid;
  const pages = [entryPage([entry(eid, 11, [text("head"), words(...code), text("data")])])];
  return { nsd: readNsd(nsdData([], lid, ZONE, execMap)), pages };
}

const RIVER = stringToEid("RivOC");
const RIVER_SLOT = 28;
const RIVER_CHECK = 0x47; // where up the creek's river code checks crash came back down within 400 of a green river plant
const SLT_PLAYER_HEIGHT = 0x09e1fd49; // SLT pop(), player[0x84]: whether he's lower than that
const ORL_TRUE = 0x06e1f801; // ORL pop(), 0x100: always true

// river code as up the creek's: other instructions (1s), with its check at its place
function riverCode(check = SLT_PLAYER_HEIGHT): number[] {
  const code = Array<number>(0x50).fill(1);
  code[RIVER_CHECK] = check;
  return code;
}

describe("river enemies' code from up the creek", () => {
  test.each(["blue_river_plant", "green_river_plant", "fish"] as const)("a %s's code lets a green river plant bite at any height", (type) => {
    // its check that crash came back down near it always passes
    const code = codeOf(enemyDonorObjects(new Map([[type, oneCodeLevel(0x18, RIVER_SLOT, RIVER, riverCode())]])), RIVER);
    expect(code).toEqual(riverCode(ORL_TRUE));
  });

  test("a river enemy's code that can't be patched is an error", () => {
    // code that isn't as up the creek's
    const level = oneCodeLevel(0x18, RIVER_SLOT, RIVER, riverCode(1));
    expect(() => enemyDonorObjects(new Map([["green_river_plant", level]]))).toThrow(/green river/);
  });
});

const LAB_ASSISTANT = stringToEid("LabAC");
const LAB_ASSISTANT_SLOT = 54;
const THROW_SETUP = 0x202; // where stormy ascent's lab assistant code sets up its throw
// its setup there: it picks a throw from its code's presets by init flag c
const SETUP_BY_PRESET = [0x8225c003, 0x15016e17, 0x11e1fe44, 0x82094001, 0x11017e44, 0x15016e18, 0x11e1fe45, 0x1fbe0800];
// and as custom levels have it, its throw from its init flags
const SETUP_BY_FLAGS = [
  0x15016e17, // SHA ireg[0x58], obj[0xbc]: flag a, as written
  0x11e1fe0c, // MOVE pop(), obj[0x90]: its facing
  0x11017e44, // MOVE ireg[0x5c], obj[0x170]: how often it throws, its code's default
  0x11800e45, // MOVE 0, obj[0x174]: its timer from 0
  0x11e18e17, // MOVE obj[0xc0], obj[0xbc]: flag b, its vials' speed along x
  0x1102be18, // MOVE ireg[0xac], obj[0xc0]: their speed up, custom levels' first preset's
  0x11020e46, // MOVE ireg[0x80], obj[0x178]: their fuse, the same preset's
  0x8209403f, // BRA to 0x249, past its presets
];
const FACING_BY_SIGN = 0x24d; // where it faces along x by its speed's sign
const FACE_BY_SIGN = 0x09800e17;
const BRA_PAST_FACING = 0x82094004; // BRA past it, keeping flag a's facing
const VIAL_SPEED_Z = 0x28a; // where a vial sets its speed along z
const MOVE_ZERO_SPEED_Z = 0x11800e13; // MOVE 0, obj[0xac]
const MOVE_THROWER_FLAG_C = 0x11d19e13; // MOVE creator[0xc4], obj[0xac]: its thrower's flag c

// lab assistant code as stormy ascent's: other instructions (1s), with its setup, facing and vials' speed at their places
function labAssistantCode(setup = SETUP_BY_PRESET, facing = FACE_BY_SIGN, vialSpeedZ = MOVE_ZERO_SPEED_Z): number[] {
  const code = Array<number>(0x290).fill(1);
  code.splice(THROW_SETUP, setup.length, ...setup);
  code[FACING_BY_SIGN] = facing;
  code[VIAL_SPEED_Z] = vialSpeedZ;
  return code;
}

describe("lab assistants' code from stormy ascent", () => {
  test("a lab assistant's code faces and throws by its init flags", () => {
    // it faces by flag a, and throws its vials at b along the game's x and c along z
    const level = oneCodeLevel(0x22, LAB_ASSISTANT_SLOT, LAB_ASSISTANT, labAssistantCode());
    const code = codeOf(enemyDonorObjects(new Map([["lab_assistant", level]])), LAB_ASSISTANT);
    expect(code).toEqual(labAssistantCode(SETUP_BY_FLAGS, BRA_PAST_FACING, MOVE_THROWER_FLAG_C));
  });

  test("a lab assistant's code that can't be patched is an error", () => {
    // code that isn't as stormy ascent's
    const level = oneCodeLevel(0x22, LAB_ASSISTANT_SLOT, LAB_ASSISTANT, labAssistantCode(SETUP_BY_PRESET, 1));
    expect(() => enemyDonorObjects(new Map([["lab_assistant", level]]))).toThrow(/lab assistant/);
  });
});

describe("the cobra's code from temple ruins", () => {
  const COBRA = stringToEid("PlanC"); // temple ruins' cobra, the same name as jungle rollers' plant
  const COBRA_SLOT = 25;              // and the same exec slot

  // temple ruins' cobra code, its header naming its slot
  function cobraLevel(): Level {
    const execMap: number[] = [];
    execMap[COBRA_SLOT] = COBRA;
    const pages = [entryPage([entry(COBRA, 11, [words(COBRA_SLOT, 0x300), words(1, 2, 3)])])];
    return { nsd: readNsd(nsdData([], 0x1c, ZONE, execMap)), pages };
  }
  const [cobra] = enemyDonorObjects(new Map([["snake", cobraLevel()]]));

  test("a snake's code goes in its own exec slot, under a name of its own, out of the plant's way", () => {
    expect(cobra.code).toEqual([[ENEMY_ENTITIES.snake[0], stringToEid("SnakC")]]);
    expect(ENEMY_ENTITIES.snake[0]).not.toBe(ENEMY_ENTITIES.plant[0]);
  });

  test("a snake's code's header names its own slot", () => {
    expect(cobra.entries[0].items[0]).toEqual(words(ENEMY_ENTITIES.snake[0], 0x300));
  });
});
