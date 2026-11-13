// a custom level's music (level.cfg's music, see src/music.ts): copied in from
// the game's level it's named after. a music entry holds its tracks and its
// instruments' header, and names up to 7 instrument entries, each on a page of
// instruments (src/midi.c). every zone names the music it plays (ZONE_MIDI)
import { DEFAULT_MUSIC, isAudioSongName, soundtrack } from "../src/music";
import { EID_NONE } from "./entryIds";
import { entriesById, PAGE_ENTRIES, type Entry, type Level, type Page } from "./levelFiles";
import { ZONE_MIDI } from "./zones";

const MUSIC_HEADER = 0;      // a music entry's item holding its header: its track count, then its instruments
const INSTRUMENTS_AT = 8;    // where the header's instrument eids start
const INSTRUMENTS_MAX = 7;

export interface LevelMusic {
  eid: number;       // the music entry, which the zones name
  entries: Entry[];  // it, for the level's entry pages
  pages: Page[];     // the pages of instruments it names, copied whole
}

// the instruments a music entry names
function instrumentEids(music: Entry): number[] {
  const header = music.items[MUSIC_HEADER];
  return Array.from({ length: INSTRUMENTS_MAX }, (_, index) => header.readUInt32LE(INSTRUMENTS_AT + 4 * index))
    .filter((eid) => eid !== EID_NONE);
}

// the music a level's spawn zone plays
function spawnZoneMusic(level: Level): Entry {
  const entries = entriesById(level);
  const spawnZone = entries.get(level.nsd.ldat.zoneSpawn);
  const music = spawnZone && entries.get(spawnZone.items[0].readUInt32LE(ZONE_MIDI));
  if (!music) {
    throw new Error(`level ${level.nsd.ldat.lid.toString(16)} has no music where crash starts`);
  }
  return music;
}

// a level's music: what its spawn zone plays, and the pages of the instruments it names
export function levelMusic(level: Level): LevelMusic {
  const music = spawnZoneMusic(level);
  const instruments = new Set(instrumentEids(music));
  const pages = level.pages.filter((page) => page.type !== PAGE_ENTRIES && page.entries.some(({ eid }) => instruments.has(eid)));
  return { eid: music.eid, entries: [music], pages };
}

// the music a level set to play name has from another level; null for the
// default, jungle rollers', which the base level has already, and under an audio file song
export function soundtrackMusic(name: string | undefined, readOtherLevel?: (lid: number) => Level): LevelMusic | null {
  if (name === undefined || name === DEFAULT_MUSIC || isAudioSongName(name)) {
    return null; // an audio file plays over the default music (src/pc/audiosong.c)
  }
  const { label, lid } = soundtrack(name);
  const what = `${label} (s${lid.toString(16).padStart(7, "0")}.nsd)`;
  if (!readOtherLevel) {
    throw new Error(`the level's music comes from ${what}, but there are no other levels to read`);
  }
  try {
    return levelMusic(readOtherLevel(lid));
  } catch (error) {
    throw new Error(`${what} couldn't be read, and the level's music comes from it: ${error instanceof Error ? error.message : error}`);
  }
}

// a zone header naming the music eid
export function withMusic(header: Buffer, eid: number): Buffer {
  const copy = Buffer.from(header);
  copy.writeUInt32LE(eid, ZONE_MIDI);
  return copy;
}
