import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { BASE_LEVEL } from "../../builder/baseLevel";
import { stringToEid } from "../../builder/entryIds";
import { ENTRY_ZDAT, entriesById, readLevel, type Level } from "../../builder/levelFiles";
import { makeMap } from "../../builder/makeMap";
import { levelMusic } from "../../builder/music";
import { ZONE_MIDI } from "../../builder/zones";

const STREAMS = fileURLToPath(new URL("../../../../streams", import.meta.url));
const THE_LOST_CITY = 0x20;
const hasLevels = existsSync(`${STREAMS}/${BASE_LEVEL.file}.nsd`) && existsSync(`${STREAMS}/s0000020.nsd`);
const FLOOR_OBJ = "o Floor\nv -4 0 -50\nv -4 0 50\nv 4 0 50\nv 4 0 -50\nf 1 2 3 4\n";
const INSTRUMENT_PAGE = 4;

const LOST_CITY_MUSIC = stringToEid("So0wM");
const JUNGLE_ROLLERS_MUSIC = stringToEid("So0cM");
const LOST_CITY_INSTRUMENTS = ["I00wN", "I01wN", "I02wN", "I03wN"].map(stringToEid);

const readOtherLevel = (lid: number) => readLevel(STREAMS, lid);
const build = (music?: string) => makeMap(readLevel(STREAMS, BASE_LEVEL.lid), FLOOR_OBJ, { music, readOtherLevel });

const zoneMusic = (level: Level) => level.pages.flatMap((page) => page.entries)
  .filter((entry) => entry.type === ENTRY_ZDAT).map((zone) => zone.items[0].readUInt32LE(ZONE_MIDI));

describe.skipIf(!hasLevels)("a level's music", () => {
  test("a level's music is its spawn zone's, with the pages of instruments it names", () => {
    const music = levelMusic(readLevel(STREAMS, THE_LOST_CITY));
    expect(music.eid).toBe(LOST_CITY_MUSIC);
    expect(music.entries.map(({ eid }) => eid)).toEqual([LOST_CITY_MUSIC]);
    expect(music.pages.every((page) => page.type === INSTRUMENT_PAGE)).toBe(true);
    expect(music.pages.flatMap((page) => page.entries.map(({ eid }) => eid))).toEqual(expect.arrayContaining(LOST_CITY_INSTRUMENTS));
  });

  test("without music set, a custom level plays jungle rollers', as it always did", () => {
    const built = build();
    expect(new Set(zoneMusic(built))).toEqual(new Set([JUNGLE_ROLLERS_MUSIC]));
    expect(entriesById(built).has(JUNGLE_ROLLERS_MUSIC)).toBe(true);
  });

  test("with an audio file as its song, a level has jungle rollers' music underneath, as without music set", () => {
    const built = build("my song.mp3");
    expect(new Set(zoneMusic(built))).toEqual(new Set([JUNGLE_ROLLERS_MUSIC]));
  });

  test("music set to another soundtrack is copied in, and every zone plays it", () => {
    const built = build("the_lost_city");
    const entries = entriesById(built);
    expect(new Set(zoneMusic(built))).toEqual(new Set([LOST_CITY_MUSIC]));
    expect(entries.has(LOST_CITY_MUSIC)).toBe(true);
    LOST_CITY_INSTRUMENTS.forEach((instrument) => expect(entries.has(instrument)).toBe(true));
  });

  test("jungle rollers' music isn't kept when the level plays another", () => {
    expect(entriesById(build("the_lost_city")).has(JUNGLE_ROLLERS_MUSIC)).toBe(false);
  });

  test("music from another level needs the other levels to read", () => {
    expect(() => makeMap(readLevel(STREAMS, BASE_LEVEL.lid), FLOOR_OBJ, { music: "the_lost_city" })).toThrow(/music .*The Lost City/);
  });
});
