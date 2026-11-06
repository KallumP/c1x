import { describe, expect, test } from "vitest";
import { donorObject, withDonorObjects } from "../../builder/donorObjects";
import { EID_NONE, stringToEid } from "../../builder/entryIds";
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

  test("a slot the donor has no code in is an error", () => {
    expect(() => donorObject(donorLevel(), 50)).toThrow(/slot 50/);
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
