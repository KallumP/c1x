import { describe, expect, test } from "vitest";
import { donorObject } from "../../builder/donorObjects";
import { stringToEid } from "../../builder/entryIds";
import { entryPage, PAGE_SOUNDS, readNsd, texturePage, type Entry, type Level, type Page } from "../../builder/levelFiles";
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
const soundPage = (entries: Entry[]): Page => ({ type: PAGE_SOUNDS, pgid: 0, eid: 0, entries, data: Buffer.alloc(0) });

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
